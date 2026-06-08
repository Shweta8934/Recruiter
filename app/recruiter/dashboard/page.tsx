'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { jobsActions } from '@/store/slices/jobsSlice'
import { RootState } from '@/store/rootReducer'
import { PageHeader } from '@/components/common'
import { DashboardCard } from '@/components/cards'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/hooks/useAuth'
import { getOrganizationById } from '@/data/organizations'
import { Users, Target, Send, CheckCircle } from 'lucide-react'

export default function RecruiterDashboardPage() {
  const { user } = useAuth()
  const organization = user?.organizationId ? getOrganizationById(user.organizationId) : null
  const orgId = user?.organizationId
  const dispatch = useDispatch()
  const [jobsCount, setJobsCount] = useState(0)
  const [applications, setApplications] = useState<any[]>([])

  useEffect(() => {
    if (!orgId) return

    dispatch(jobsActions.fetchJobPostsRequest({
      organizationId: orgId,
      resolve: async (jobsData) => {
        const jobs = jobsData ?? []
        setJobsCount(jobs.length)

        const appLists = await Promise.all(
          jobs.map((j: any) => 
            new Promise<any[]>((resolveApps) => {
              dispatch(jobsActions.fetchJobApplicationsRequest({
                jobId: j.id,
                resolve: (apps) => resolveApps(apps ?? []),
                reject: () => resolveApps([])
              }))
            })
          )
        )
        const all = appLists.flat()
        setApplications(all)
      },
      reject: () => {
        setJobsCount(0)
        setApplications([])
      }
    }))
  }, [orgId, dispatch])

  const pipeline = useMemo(() => {
    const by = (s: string) => applications.filter((a) => a.status === s).length
    return [
      { stage: 'Applied', count: by('applied'), color: 'bg-primary' },
      { stage: 'Screening', count: by('screening'), color: 'bg-amber-500' },
      { stage: 'Interview', count: by('interview'), color: 'bg-purple-500' },
      { stage: 'Offer', count: by('offer'), color: 'bg-primary' },
      { stage: 'Hired', count: by('hired'), color: 'bg-primary' },
    ]
  }, [applications])
  const total = Math.max(1, applications.length)

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Recruiter Dashboard"
        description={`Recruitment pipeline for ${organization?.name || 'your organization'}`}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Active Candidates"
          value={applications.length}
          description="In pipeline"
          icon={Users}
        />
        <DashboardCard
          title="Open Positions"
          value={jobsCount}
          description="Currently hiring"
          icon={Target}
        />
        <DashboardCard
          title="New Applications"
          value={applications.filter((a) => a.status === 'applied').length}
          description="Need review"
          icon={Send}
        />
        <DashboardCard
          title="Offers Made"
          value={applications.filter((a) => a.status === 'offer').length}
          description="Pending response"
          icon={CheckCircle}
        />
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Recruitment Pipeline</CardTitle>
          <CardDescription>Candidate progression through stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pipeline.map((stage) => (
              <div key={stage.stage} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stage.stage}</span>
                  <span className="text-sm text-muted-foreground">{stage.count} candidates</span>
                </div>
                <Progress value={(stage.count / total) * 100} className={`h-2 [&>div]:${stage.color}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
