import { notFound } from 'next/navigation'
import { prisma } from '@/lib/server/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MapPin, Briefcase, Clock, Building2 } from 'lucide-react'
import { JobDescriptionViewer } from '@/components/JobDescriptionViewer'

// Note: This is a public page so we don't enforce tenant access or auth.
export default async function PublicJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 1. Fetch job with department & organization (for logo/branding if needed)
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      department: true,
      organization: true,
    }
  })

  // 2. Only show open jobs
  if (!job || job.status !== 'open') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Unavailable</h1>
          <p className="text-gray-500 mb-6">
            This position is either closed or no longer accepting applications.
          </p>
        </div>
      </div>
    )
  }

  // 3. Render Public JD
  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header Banner */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {job.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
              {job.organization && (
                <div className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {job.organization.name}
                </div>
              )}
              {job.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </div>
              )}
              {job.department && (
                <div className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {job.department.name}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0 mt-4 sm:mt-0">
            <Link href={`/careers/${job.id}/apply`}>
              <Button size="lg" className="w-full sm:w-auto font-medium shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground">
                Apply Now
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Job Description */}
          <div className="md:col-span-2">
            {job.description ? (
              <JobDescriptionViewer description={job.description} />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8">
                <h2 className="text-xl font-semibold mb-6">Job Description</h2>
                <p className="text-gray-500 italic">No description provided.</p>
              </div>
            )}
          </div>

          {/* Right Column: Key Details */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Job Details</h3>
              
              <ul className="space-y-4">
                {job.employmentType && (
                  <li>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Employment Type</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="capitalize">{job.employmentType}</span>
                    </div>
                  </li>
                )}

                {job.experience && (
                  <li>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Experience Level</div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <span>{job.experience}</span>
                    </div>
                  </li>
                )}
                
                {(job.experienceMin !== null || job.experienceMax !== null) && (
                  <li>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Years of Experience</div>
                    <div className="text-gray-900">
                      {job.experienceMin} - {job.experienceMax} years
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {/* Skills */}
            {job.skills && Array.isArray(job.skills) && job.skills.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill: any, idx: number) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
