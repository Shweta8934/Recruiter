import { prisma } from '@/lib/server/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ThemeProviderClient } from '@/components/theme-provider-client'

export default async function PublicCareersPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params

  const org = await prisma.organization.findUnique({
    where: { slug: tenantSlug, status: 'active' },
    include: {
      jobs: {
        where: { status: 'published' },
        include: { department: true }
      }
    }
  })

  if (!org) return notFound()

  return (
    <ThemeProviderClient hexColor={org.primaryColor}>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 border-t-4 border-primary">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          {org.logo && <img src={org.logo} alt={org.name} className="h-16 mx-auto mb-4" />}
          <h1 className="text-4xl font-extrabold text-gray-900">{org.name} Careers</h1>
          <p className="mt-2 text-lg text-gray-600">{org.industry}</p>
        </div>

        <div className="space-y-4 mt-8">
          {org.jobs.length === 0 ? (
            <p className="text-center text-gray-500">No open positions at the moment.</p>
          ) : (
            org.jobs.map(job => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        <Link href={`/jobs/${job.slug}`} className="text-blue-600 hover:underline">
                          {job.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1">{job.location} • {job.employmentType}</CardDescription>
                    </div>
                    {job.department && (
                      <Badge variant="secondary">{job.department.name}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-2">{job.description?.substring(0, 150)}...</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      </div>
    </ThemeProviderClient>
  )
}
