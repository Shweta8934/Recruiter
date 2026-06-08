import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json()
    const { name, email, phone } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const paper = await prisma.questionPaper.findUnique({
      where: { id }
    })

    if (!paper) {
      return NextResponse.json({ error: 'Question paper not found' }, { status: 404 })
    }

    if (!paper.isActive) {
      return NextResponse.json({ error: 'This assessment is no longer active' }, { status: 403 })
    }

    if (paper.linkExpiresAt && new Date() > paper.linkExpiresAt) {
      return NextResponse.json({ error: 'This assessment link has expired' }, { status: 403 })
    }

    // Optionally check if candidate already has an attempt
    const existingAttempt = await prisma.candidateTestAttempt.findFirst({
      where: {
        questionPaperId: id,
        email: email
      }
    })

    if (existingAttempt) {
      return NextResponse.json({ error: 'You have already registered or completed this assessment with this email.' }, { status: 400 })
    }

    // Create a new attempt
    let jobApplicationId: string | null = null
    const targetJobId = paper.jobId
    const targetJobTitle = paper.jobTitle || ''

    if (targetJobId) {
      const emailLower = email.trim().toLowerCase()
      let jobApp = await prisma.jobApplication.findFirst({
        where: {
          jobId: targetJobId,
          email: emailLower
        }
      })

      if (!jobApp) {
        jobApp = await prisma.jobApplication.create({
          data: {
            jobId: targetJobId,
            organizationId: paper.organizationId || '',
            fullName: name,
            email: emailLower,
            phone: phone || null,
            status: 'applied',
          }
        })

        await prisma.jobApplicationStageHistory.create({
          data: {
            organizationId: jobApp.organizationId,
            jobId: jobApp.jobId,
            applicationId: jobApp.id,
            fromStatus: null,
            toStatus: 'applied',
            changedByUserId: null,
            note: 'Application created automatically via test registration',
          }
        })

        await prisma.auditLog.create({
          data: {
            actorUserId: null,
            entityType: 'job_application',
            entityId: jobApp.id,
            action: 'candidate_application_submitted',
            beforeJson: null,
            afterJson: {
              jobId: jobApp.jobId,
              organizationId: jobApp.organizationId,
              email: jobApp.email,
              fullName: jobApp.fullName,
            },
            metadataJson: {
              source: 'test_registration_auto_link'
            }
          }
        })
      }

      jobApplicationId = jobApp.id
    } else if (targetJobTitle) {
      const emailLower = email.trim().toLowerCase()
      let jobApp = await prisma.jobApplication.findFirst({
        where: {
          email: emailLower,
          job: {
            title: targetJobTitle,
            organizationId: paper.organizationId || undefined
          }
        }
      })

      if (!jobApp) {
        const matchedJob = await prisma.job.findFirst({
          where: {
            title: targetJobTitle,
            organizationId: paper.organizationId || ''
          }
        })

        if (matchedJob) {
          jobApp = await prisma.jobApplication.create({
            data: {
              jobId: matchedJob.id,
              organizationId: matchedJob.organizationId,
              fullName: name,
              email: emailLower,
              phone: phone || null,
              status: 'applied',
            }
          })
          
          await prisma.jobApplicationStageHistory.create({
            data: {
              organizationId: jobApp.organizationId,
              jobId: jobApp.jobId,
              applicationId: jobApp.id,
              fromStatus: null,
              toStatus: 'applied',
              changedByUserId: null,
              note: 'Application created automatically via test registration',
            }
          })

          await prisma.auditLog.create({
            data: {
              actorUserId: null,
              entityType: 'job_application',
              entityId: jobApp.id,
              action: 'candidate_application_submitted',
              beforeJson: null,
              afterJson: {
                jobId: jobApp.jobId,
                organizationId: jobApp.organizationId,
                email: jobApp.email,
                fullName: jobApp.fullName,
              },
              metadataJson: {
                source: 'test_registration_auto_link'
              }
            }
          })
        }
      }

      if (jobApp) {
        jobApplicationId = jobApp.id
      }
    }

    const attempt = await prisma.candidateTestAttempt.create({
      data: {
        questionPaperId: id,
        candidateName: name,
        email: email.trim().toLowerCase(),
        phone: phone || null,
        remainingSeconds: paper.duration ? paper.duration * 60 : null,
        jobApplicationId,
      }
    })

    return NextResponse.json({ attemptId: attempt.id }, { status: 201 })
  } catch (error) {
    console.error('Failed to create test attempt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
