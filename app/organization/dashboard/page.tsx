'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { departmentsActions } from '@/store/slices/departmentsSlice'
import { analyticsActions } from '@/store/slices/analyticsSlice'
import { organizationActions } from '@/store/slices/organizationSlice'
import { subscriptionActions } from '@/store/slices/subscriptionSlice'
import { jobsActions } from '@/store/slices/jobsSlice'
import { questionPapersActions } from '@/store/slices/questionPapersSlice'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/common'
import { DashboardCard, UsageCard } from '@/components/cards'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlanBadge, StatusBadge } from '@/components/rbac'
import {
  Users,
  Shield,
  Mail,
  TrendingUp,
  Plus,
  UserPlus,
  Settings,
  CreditCard,
} from 'lucide-react'
import { format } from 'date-fns'

const DROP_OFF_LABELS: Record<string, string> = {
  appliedToShortlisted: 'Applied -> Shortlisted',
  shortlistedToAssessed: 'Shortlisted -> Assessed',
  assessedToInterviewed: 'Assessed -> Interviewed',
  interviewedToOffered: 'Interviewed -> Offered',
  offeredToHired: 'Offered -> Hired',
}

const STAGE_LABELS: Record<string, string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  assessed: 'Assessed',
  interviewed: 'Interviewed',
  offered: 'Offered',
  hired: 'Hired',
}

export default function OrganizationDashboardPage() {
  const { user } = useAuth()
  const [organization, setOrganization] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [currentPlan, setCurrentPlan] = useState<any>(null)
  const [jobPostsCount, setJobPostsCount] = useState(0)
  const [activePapersCount, setActivePapersCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [departmentOptions, setDepartmentOptions] = useState<any[]>([])
  const [jobOptions, setJobOptions] = useState<any[]>([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [selectedFunnelJobId, setSelectedFunnelJobId] = useState('')
  const orgId = user?.organizationId

  const dispatch = useDispatch()
  const router = useRouter()

  useEffect(() => {
    function loadDashboard() {
      if (!orgId) {
        setError('No organization assigned to this user.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      let orgsLoaded = false;
      let usersLoaded = false;
      let rolesLoaded = false;
      let invitesLoaded = false;
      let activitiesLoaded = false;
      let subLoaded = false;
      let jobsLoaded = false;
      let papersLoaded = false;

      const checkDone = () => {
        if (orgsLoaded && usersLoaded && rolesLoaded && invitesLoaded && activitiesLoaded && subLoaded && jobsLoaded && papersLoaded) {
          setIsLoading(false);
        }
      }

      dispatch(organizationActions.loadOrganizationsRequest({
        resolve: (orgs) => {
          const allOrganizations = orgs ?? []
          const resolvedOrganization =
            allOrganizations.find((o: any) => o.id === orgId) ?? allOrganizations[0] ?? null

          if (!resolvedOrganization) {
            setError('No organizations found in database.')
            setOrganization(null)
          } else {
            setOrganization(resolvedOrganization)
          }
          orgsLoaded = true; checkDone();
        },
        reject: () => { orgsLoaded = true; checkDone(); }
      }))

      dispatch(organizationActions.loadUsersRequest({
        organizationId: orgId,
        resolve: (data: any) => {
          setMembers(data?.users ?? [])
          usersLoaded = true; checkDone();
        },
        reject: () => { usersLoaded = true; checkDone(); }
      }))

      dispatch(organizationActions.loadRolesRequest({
        organizationId: orgId,
        resolve: (data) => {
          setRoles((data.roles ?? []).filter((r: any) => r.organizationId === orgId))
          rolesLoaded = true; checkDone();
        },
        reject: () => { rolesLoaded = true; checkDone(); }
      }))

      dispatch(organizationActions.loadInvitesRequest({
        organizationId: orgId,
        resolve: (invitesData) => {
          setInvites(invitesData ?? [])
          invitesLoaded = true; checkDone();
        },
        reject: () => { invitesLoaded = true; checkDone(); }
      }))

      dispatch(organizationActions.loadActivitiesRequest({
        organizationId: orgId,
        limit: 5,
        resolve: (activitiesData) => {
          setActivities(activitiesData ?? [])
          activitiesLoaded = true; checkDone();
        },
        reject: () => { activitiesLoaded = true; checkDone(); }
      }))

      dispatch(subscriptionActions.loadSubscriptionDataRequest({
        organizationId: orgId,
        resolve: (data) => {
          setCurrentPlan(data.subscription?.plan ?? null)
          subLoaded = true; checkDone();
        },
        reject: () => { subLoaded = true; checkDone(); }
      }))

      dispatch(jobsActions.fetchJobPostsRequest({
        organizationId: orgId,
        resolve: (rows: any[]) => {
          setJobOptions(rows || [])
          setJobPostsCount((rows || []).length)
          jobsLoaded = true; checkDone()
        },
        reject: () => { jobsLoaded = true; checkDone() }
      }))
      dispatch(departmentsActions.fetchDepartmentsRequest({
        organizationId: orgId,
        resolve: (rows: any[]) => setDepartmentOptions(rows || []),
      }))

      dispatch(questionPapersActions.fetchPapersRequest({
        organizationId: orgId,
        resolve: (data: any) => {
          const papers = data?.questionPapers || []
          setActivePapersCount(papers.filter((p: any) => p.isActive !== false).length)
          papersLoaded = true; checkDone()
        },
        reject: () => { papersLoaded = true; checkDone() }
      }))
    }
    loadDashboard()
  }, [orgId, dispatch])

  useEffect(() => {
    if (!orgId) return
    setIsAnalyticsLoading(true)
    setAnalyticsError(null)
    dispatch(analyticsActions.loadCoreAnalyticsRequest({
      organizationId: orgId,
      from: fromDate || undefined,
      to: toDate || undefined,
      jobId: selectedJobId || undefined,
      departmentId: selectedDepartmentId || undefined,
      resolve: (data) => {
        setAnalytics(data)
        setIsAnalyticsLoading(false)
      },
      reject: (err) => {
        setAnalytics(null)
        setAnalyticsError(err || 'Failed to load analytics')
        setIsAnalyticsLoading(false)
      },
    }))
  }, [orgId, fromDate, toDate, selectedJobId, selectedDepartmentId, dispatch])

  const pendingInvites = useMemo(
    () => invites.filter((i) => i.status === 'pending'),
    [invites]
  )
  const usage = useMemo(
    () => ({
      membersUsed: members.length,
      membersLimit: currentPlan?.limits?.members && currentPlan?.limits?.members > 0 ? currentPlan.limits.members : 9999,
      rolesUsed: roles.length,
      rolesLimit: currentPlan?.limits?.roles && currentPlan?.limits?.roles > 0 ? currentPlan.limits.roles : 9999,
      invitesUsedThisMonth: pendingInvites.length,
      invitesLimit: currentPlan?.limits?.invitesPerMonth && currentPlan?.limits?.invitesPerMonth > 0 ? currentPlan.limits.invitesPerMonth : 9999,
    }),
    [currentPlan, members.length, roles.length, pendingInvites.length]
  )
  const funnelJobs = analytics?.funnelByJob || []
  const selectedFunnelJob = selectedFunnelJobId ? (funnelJobs.find((j: any) => j.jobId === selectedFunnelJobId) || null) : null
  const aggregateFunnel = funnelJobs.reduce(
    (acc: any, j: any) => {
      for (const s of ['applied', 'shortlisted', 'assessed', 'interviewed', 'offered', 'hired']) acc[s] += j?.counts?.[s] || 0
      return acc
    },
    { applied: 0, shortlisted: 0, assessed: 0, interviewed: 0, offered: 0, hired: 0 }
  )

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading dashboard...</div>
  }

  if (error) {
    return <div className="p-6 text-sm text-destructive">{error}</div>
  }

  if (!organization) {
    return <div className="p-6 text-sm text-muted-foreground">No organization data available.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Welcome, ${user?.name || 'User'}!`}
        description="Manage your organization settings, members, and roles"
      >
        <Link href="/invites/send">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </Link>
      </PageHeader>

      {/* Organization Info Card */}
      {/* <Card>
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
              {organization.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{organization.name}</h3>
              <p className="text-sm text-muted-foreground">{organization.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PlanBadge plan={currentPlan?.name || 'Free'} />
            <StatusBadge status={organization.status} />
            <Link href="/settings">
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card> */}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Members"
          value={members.length}
          description="Active team members"
          icon={Users}
        />
        <DashboardCard
          title="Custom Roles"
          value={roles.length}
          description="Defined roles"
          icon={Shield}
        />
        <DashboardCard
          title="Pending Invites"
          value={pendingInvites.length}
          description="Awaiting response"
          icon={Mail}
        />
        <DashboardCard
          title="Current Plan"
          value={currentPlan?.name || 'Free'}
          description={`$${currentPlan?.price || 0}/${currentPlan?.billingCycle === 'yearly' ? 'yr' : 'mo'}`}
          icon={CreditCard}
        />
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Core Analytics</CardTitle>
              <CardDescription>Tenant-level KPIs with job/department/date drilldown</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setFromDate('')
                setToDate('')
                setSelectedJobId('')
                setSelectedDepartmentId('')
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input className="h-10 rounded-md border bg-background px-3 text-sm" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input className="h-10 rounded-md border bg-background px-3 text-sm" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedJobId} onChange={(e) => { setSelectedJobId(e.target.value); setSelectedFunnelJobId('') }}>
              <option value="">All Jobs</option>
              {jobOptions.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedDepartmentId} onChange={(e) => setSelectedDepartmentId(e.target.value)}>
              <option value="">All Departments</option>
              {departmentOptions.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {isAnalyticsLoading ? <p className="text-sm text-muted-foreground">Loading analytics...</p> : analyticsError ? (
            <p className="text-sm text-destructive">{analyticsError}</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <DashboardCard title="Active Jobs" value={analytics?.summary?.totalActiveJobs || 0} description="Open jobs" icon={TrendingUp} />
                <DashboardCard title="Offer Acceptance" value={`${analytics?.summary?.offerAcceptanceRate || 0}%`} description="Hired / Offered" icon={TrendingUp} />
                <DashboardCard title="TTH Median" value={`${analytics?.summary?.timeToHire?.medianDays || 0}d`} description="Median time-to-hire" icon={TrendingUp} />
                <DashboardCard title="TTH P90" value={`${analytics?.summary?.timeToHire?.p90Days || 0}d`} description="P90 time-to-hire" icon={TrendingUp} />
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">Candidates by Stage</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  {['applied', 'shortlisted', 'assessed', 'interviewed', 'offered', 'hired'].map((s) => (
                    <div key={s} className="rounded-md border p-3">
                      <p className="text-xs uppercase text-muted-foreground">{s}</p>
                      <p className="text-xl font-semibold">{analytics?.summary?.candidatesByStage?.[s] || 0}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Per Job Funnel (Kanban)</CardTitle>
                  <CardDescription>Applied {'->'} Shortlisted {'->'} Assessed {'->'} Interviewed {'->'} Offered {'->'} Hired</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {funnelJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No funnel data available.</p>
                  ) : (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Selected Job</p>
                          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={selectedFunnelJobId} onChange={(e) => setSelectedFunnelJobId(e.target.value)}>
                            <option value="">All Jobs (Aggregate)</option>
                            {funnelJobs.map((job: any) => <option key={job.jobId} value={job.jobId}>{job.jobTitle}</option>)}
                          </select>
                        </div>
                        <div className="flex items-end justify-start md:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(withBasePath('/organization/hfg/job-posts'))}
                          >
                            Show All Jobs
                          </Button>
                        </div>
                      </div>
                      {!selectedFunnelJob && (
                        <div className="rounded-md border p-3">
                          <p className="mb-2 text-sm font-medium">All Jobs (Aggregate)</p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                            {['applied', 'shortlisted', 'assessed', 'interviewed', 'offered', 'hired'].map((s) => (
                              <div key={s} className="rounded border bg-muted/30 p-2 text-center">
                                <p className="text-[11px] uppercase text-muted-foreground">{STAGE_LABELS[s] || s}</p>
                                <p className="text-sm font-semibold">{aggregateFunnel[s] || 0}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedFunnelJob && (
                        <div className="rounded-md border p-3">
                          <p className="mb-2 text-sm font-medium">{selectedFunnelJob.jobTitle}</p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                            {['applied', 'shortlisted', 'assessed', 'interviewed', 'offered', 'hired'].map((s) => (
                              <div key={s} className="rounded border bg-muted/30 p-2 text-center">
                                <p className="text-[11px] uppercase text-muted-foreground">{STAGE_LABELS[s] || s}</p>
                                <p className="text-sm font-semibold">{selectedFunnelJob.counts?.[s] || 0}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Stage Drop-off Rates</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {Object.entries(analytics?.dropOffRates || {}).length === 0 ? (
                      <p className="text-muted-foreground">No drop-off data yet.</p>
                    ) : Object.entries(analytics?.dropOffRates || {}).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between rounded border px-3 py-2">
                        <span className="text-muted-foreground">{DROP_OFF_LABELS[k] || k}</span>
                        <span className="font-medium">{v as number}%</span>
                      </div>
                    ))}
                    <p className="pt-1 text-xs text-muted-foreground">
                      Drop-off means candidates who did not move to the next stage.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Avg Stage Time (Days)</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {Object.entries(analytics?.avgStageTimeDays || {}).length === 0 ? (
                      <p className="text-muted-foreground">No stage-time data yet.</p>
                    ) : Object.entries(analytics?.avgStageTimeDays || {}).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between rounded border px-3 py-2">
                        <span className="text-muted-foreground">{STAGE_LABELS[k] || k}</span>
                        <span className="font-medium">{v as number}d</span>
                      </div>
                    ))}
                    <p className="pt-1 text-xs text-muted-foreground">
                      Average time candidates spend in each stage before next transition.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Stats */}
      {usage && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <UsageCard
            title="Active Question Papers"
            used={activePapersCount}
            limit={9999}
          />
          <UsageCard
            title="Job Posts"
            used={jobPostsCount}
            limit={9999}
          />
          <UsageCard
            title="Monthly Invites"
            used={usage.invitesUsedThisMonth}
            limit={usage.invitesLimit}
          />
        </div>
      )}

      {/* Quick Actions & Recent Activity */}
      {/* <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common management tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/invites/send">
              <Button variant="outline" className="w-full justify-start">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite New Member
              </Button>
            </Link>
            <Link href="/roles">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="mr-2 h-4 w-4" />
                Manage Roles
              </Button>
            </Link>
            <Link href="/members">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                View All Members
              </Button>
            </Link>
            <Link href="/subscription">
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="mr-2 h-4 w-4" />
                Manage Subscription
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest organization events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {(activity.userId || 'system')} • {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div> */}
    </div>
  )
}
