import { prisma } from '@/lib/server/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThemeProviderClient } from '@/components/theme-provider-client'

export default async function PublicJobDetailsPage({ params }: { params: Promise<{ tenantSlug: string, jobSlug: string }> }) {
  const { tenantSlug, jobSlug } = await params

  const org = await prisma.organization.findUnique({
    where: { slug: tenantSlug, status: 'active' },
  })
  
  if (!org) return notFound()

  const job = await prisma.job.findFirst({
    where: { 
      slug: jobSlug, 
      organizationId: org.id,
      status: 'published' 
    },
    include: { department: true }
  })

  if (!job) return notFound()

  return (
    <ThemeProviderClient hexColor={org.primaryColor}>
      <div className="min-h-screen bg-white border-t-4 border-primary">
        <header className="py-6 px-4 sm:px-6 lg:px-8 border-b">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {org.logo && <img src={org.logo} alt={org.name} className="h-10" />}
            <span className="font-bold text-xl">{org.name}</span>
          </div>
          <Link href="/jobs" className="text-blue-600 hover:underline text-sm font-medium">
            &larr; All Jobs
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{job.title}</h1>
          <div className="flex gap-4 text-gray-600 text-sm">
            <span>{job.location}</span>
            <span>•</span>
            <span>{job.employmentType}</span>
            {job.department && (
              <>
                <span>•</span>
                <span>{job.department.name}</span>
              </>
            )}
          </div>
        </div>

        <div className="prose max-w-none mb-12">
          {/* Using a simple div for description, since we don't know if it's HTML or Markdown, let's assume it's just text or basic HTML */}
          <div dangerouslySetInnerHTML={{ __html: job.description }} />
        </div>

        <Card className="bg-gray-50 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Interested in this role?</CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="lg" className="w-full sm:w-auto">
              Apply Now
            </Button>
            <p className="mt-4 text-sm text-gray-500">
              By applying, you agree to our privacy policy and terms of service.
            </p>
          </CardContent>
        </Card>
      </main>
      </div>
    </ThemeProviderClient>
  )
}
