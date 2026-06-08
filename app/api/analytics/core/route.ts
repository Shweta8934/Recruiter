import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

const STAGES = ['applied', 'shortlisted', 'assessed', 'interviewed', 'offered', 'hired'] as const

function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const m = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[m] : Math.round((sorted[m - 1] + sorted[m]) / 2)
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[idx]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const jobId = searchParams.get('jobId')
    const departmentId = searchParams.get('departmentId')
    if (!organizationId) return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })

    const access = await requireTenantAccess(organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const dateFilter: any = {}
    if (from && !isNaN(new Date(from).getTime())) dateFilter.gte = new Date(from)
    if (to && !isNaN(new Date(to).getTime())) dateFilter.lte = new Date(to)

    const jobsWhere: any = { organizationId, ...(departmentId ? { departmentId } : {}) }
    const jobs = await prisma.job.findMany({ where: jobsWhere, select: { id: true, title: true, status: true } })
    const activeJobs = jobs.filter(j => !['closed', 'archived', 'inactive'].includes((j.status || '').toLowerCase())).length
    const targetJobIds = jobId ? [jobId] : jobs.map(j => j.id)

    const appWhere: any = { organizationId, jobId: { in: targetJobIds }, ...(from || to ? { createdAt: dateFilter } : {}) }
    const applications = await prisma.jobApplication.findMany({ where: appWhere, select: { id: true, jobId: true, status: true, createdAt: true } })
    const appIds = applications.map(a => a.id)

    const stageHistory = appIds.length
      ? await prisma.jobApplicationStageHistory.findMany({
          where: { organizationId, applicationId: { in: appIds } },
          orderBy: { changedAt: 'asc' },
          select: { applicationId: true, jobId: true, fromStatus: true, toStatus: true, changedAt: true },
        })
      : []

    const attempts = appIds.length
      ? await prisma.candidateTestAttempt.findMany({
          where: { jobApplicationId: { in: appIds }, isCompleted: true },
          select: { jobApplicationId: true },
        })
      : []
    const assessedSet = new Set(attempts.map(a => a.jobApplicationId).filter(Boolean) as string[])

    const candidatesByStage: Record<string, number> = { applied: 0, shortlisted: 0, assessed: 0, interviewed: 0, offered: 0, hired: 0, rejected: 0 }
    for (const a of applications) {
      candidatesByStage[a.status] = (candidatesByStage[a.status] || 0) + 1
    }
    candidatesByStage.assessed = assessedSet.size

    const offered = candidatesByStage.offered || 0
    const hired = candidatesByStage.hired || 0
    const offerAcceptanceRate = offered > 0 ? Math.round((hired / offered) * 100) : 0

    const byApp = new Map<string, typeof stageHistory>()
    for (const e of stageHistory) {
      const arr = byApp.get(e.applicationId) || []
      arr.push(e)
      byApp.set(e.applicationId, arr)
    }

    const stageDurations: Record<string, number[]> = Object.fromEntries(STAGES.map(s => [s, []]))
    const hireDurations: number[] = []
    for (const app of applications) {
      const events = byApp.get(app.id) || []
      const start = app.createdAt.getTime()
      let lastAt = start
      let lastStage = 'applied'
      for (const ev of events) {
        const now = ev.changedAt.getTime()
        const days = (now - lastAt) / (1000 * 60 * 60 * 24)
        if (days >= 0 && stageDurations[lastStage]) stageDurations[lastStage].push(days)
        lastAt = now
        lastStage = ev.toStatus
        if (ev.toStatus === 'hired') {
          hireDurations.push((now - start) / (1000 * 60 * 60 * 24))
          break
        }
      }
    }

    const avgStageTimeDays = Object.fromEntries(
      Object.entries(stageDurations).map(([k, arr]) => [k, arr.length ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)) : 0])
    )
    const timeToHire = { medianDays: Number(median(hireDurations).toFixed(2)), p90Days: Number(percentile(hireDurations, 90).toFixed(2)) }

    const historyByApp = new Map<string, Set<string>>()
    for (const app of applications) {
      historyByApp.set(app.id, new Set(['applied']))
    }
    for (const ev of stageHistory) {
      const set = historyByApp.get(ev.applicationId) || new Set<string>()
      set.add(ev.toStatus)
      historyByApp.set(ev.applicationId, set)
    }

    const uniqueJobs = Array.from(
      new Map(jobs.map((j) => [j.id, j])).values()
    )

    const funnelByJob = uniqueJobs
      .filter(j => !jobId || j.id === jobId)
      .map(j => {
        const jApps = applications.filter(a => a.jobId === j.id)
        const counts: Record<string, number> = { applied: jApps.length, shortlisted: 0, assessed: 0, interviewed: 0, offered: 0, hired: 0 }
        for (const a of jApps) {
          const seen = historyByApp.get(a.id) || new Set<string>()
          if (seen.has('shortlisted')) counts.shortlisted += 1
          if (seen.has('interviewed')) counts.interviewed += 1
          if (seen.has('offered')) counts.offered += 1
          if (seen.has('hired')) counts.hired += 1
          if (assessedSet.has(a.id)) counts.assessed += 1
        }
        return { jobId: j.id, jobTitle: j.title, counts }
      })

    const totals = funnelByJob.reduce((acc, j) => {
      for (const s of STAGES) acc[s] += j.counts[s] || 0
      return acc
    }, { applied: 0, shortlisted: 0, assessed: 0, interviewed: 0, offered: 0, hired: 0 } as Record<string, number>)
    const dropOffRates = {
      appliedToShortlisted: totals.applied ? Math.max(0, Number((((totals.applied - totals.shortlisted) / totals.applied) * 100).toFixed(2))) : 0,
      shortlistedToAssessed: totals.shortlisted ? Math.max(0, Number((((totals.shortlisted - totals.assessed) / totals.shortlisted) * 100).toFixed(2))) : 0,
      assessedToInterviewed: totals.assessed ? Math.max(0, Number((((totals.assessed - totals.interviewed) / totals.assessed) * 100).toFixed(2))) : 0,
      interviewedToOffered: totals.interviewed ? Math.max(0, Number((((totals.interviewed - totals.offered) / totals.interviewed) * 100).toFixed(2))) : 0,
      offeredToHired: totals.offered ? Math.max(0, Number((((totals.offered - totals.hired) / totals.offered) * 100).toFixed(2))) : 0,
    }

    return NextResponse.json({
      summary: { totalActiveJobs: activeJobs, candidatesByStage, timeToHire, offerAcceptanceRate },
      funnelByJob,
      dropOffRates,
      avgStageTimeDays,
      filtersApplied: { from, to, jobId, departmentId },
    })
  } catch (e) {
    console.error('Failed analytics/core', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
