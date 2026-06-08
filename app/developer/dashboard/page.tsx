'use client'

import { PageHeader } from '@/components/common'
import { DashboardCard } from '@/components/cards'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { getOrganizationById } from '@/data/organizations'
import { 
  Code, 
  GitBranch, 
  CheckSquare,
  Clock,
  Calendar,
} from 'lucide-react'

export default function DeveloperDashboardPage() {
  const { user } = useAuth()
  const organization = user?.organizationId ? getOrganizationById(user.organizationId) : null

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Developer Dashboard"
        description={`Welcome back, ${user?.name || 'Developer'}!`}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Assigned Tasks"
          value={8}
          description="In progress"
          icon={CheckSquare}
        />
        <DashboardCard
          title="Active Projects"
          value={3}
          description="Currently working on"
          icon={Code}
        />
        <DashboardCard
          title="PRs Open"
          value={4}
          description="Awaiting review"
          icon={GitBranch}
        />
        <DashboardCard
          title="Hours This Week"
          value={32}
          description="Logged time"
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* My Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
            <CardDescription>Current assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'Fix login page bug', project: 'Auth Module', priority: 'High', status: 'In Progress' },
                { title: 'Implement user dashboard', project: 'Frontend', priority: 'Medium', status: 'To Do' },
                { title: 'Write unit tests', project: 'Testing', priority: 'Low', status: 'To Do' },
                { title: 'Code review PR #123', project: 'Backend', priority: 'Medium', status: 'In Progress' },
              ].map((task, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.project}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      task.priority === 'High' ? 'border-red-200 bg-red-50 text-red-700' :
                      task.priority === 'Medium' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                      'border-gray-200 bg-gray-50 text-gray-700'
                    }>
                      {task.priority}
                    </Badge>
                    <Badge variant="secondary">
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Meetings</CardTitle>
            <CardDescription>{"Today's schedule"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'Daily Standup', time: '9:30 AM', duration: '15 min', type: 'Team' },
                { title: 'Sprint Planning', time: '2:00 PM', duration: '1 hr', type: 'Sprint' },
                { title: 'Code Review Session', time: '4:00 PM', duration: '30 min', type: 'Review' },
              ].map((meeting, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{meeting.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {meeting.time} • {meeting.duration}
                    </p>
                  </div>
                  <Badge variant="outline">{meeting.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Active Projects</CardTitle>
          <CardDescription>Projects you are contributing to</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: 'Auth Module', progress: 75, tasks: 12, completed: 9 },
              { name: 'Dashboard UI', progress: 45, tasks: 20, completed: 9 },
              { name: 'API Integration', progress: 30, tasks: 15, completed: 5 },
            ].map((project, i) => (
              <div key={i} className="rounded-lg border p-4">
                <h4 className="font-medium">{project.name}</h4>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted">
                    <div 
                      className="h-full rounded-full bg-primary" 
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{project.progress}%</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {project.completed}/{project.tasks} tasks completed
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
