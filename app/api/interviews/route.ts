import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/tenantGuard";
import { prisma } from "@/lib/server/prisma";
import { createCalendarEvent, isCalendarConfigured } from "@/lib/server/calendar";

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { organizationId, jobId, applicationId, roundId, scheduledAt, duration, interviewerIds } = body;

    if (!organizationId || !jobId || !applicationId || !scheduledAt || !duration || !interviewerIds || !interviewerIds.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify application and interviewers exist
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const interviewers = await prisma.user.findMany({
      where: { id: { in: interviewerIds } },
    });

    const startTime = new Date(scheduledAt);

    // 1. Create Interview in DB
    const interview = await prisma.interview.create({
      data: {
        organizationId,
        jobId,
        applicationId,
        roundId: roundId || undefined,
        scheduledAt: startTime,
        duration: Number(duration),
        participants: {
          create: interviewerIds.map((id: string) => ({ userId: id })),
        },
      },
    });

    // Also update the JobApplication to reflect the scheduled date
    await prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        interviewSelectedDate: startTime,
        status: 'interview_scheduled'
      }
    });

    // 2. Prepare Google Calendar Event
    const roundName = roundId ? (await prisma.roundMaster.findUnique({ where: { id: roundId } }))?.name : 'Interview';
    const summary = `${roundName || 'Interview'} - ${application.fullName} x ${application.job.title}`;
    const description = `Candidate: ${application.fullName}\nEmail: ${application.email}\nJob: ${application.job.title}\n\nJoin the Google Meet link attached to this event.`;
    
    const attendeeEmails = interviewers.map(i => i.email).filter(Boolean);
    attendeeEmails.push(application.email);

    // 3. Create Google Calendar Event
    let meetLink = null;
    let eventId = null;
    try {
      if (isCalendarConfigured()) {
        const calRes = await createCalendarEvent({
          summary,
          description,
          startTime,
          durationMinutes: Number(duration),
          attendeeEmails,
        });
        meetLink = calRes?.meetLink || null;
        eventId = calRes?.eventId || null;
      }
    } catch (e: any) {
      console.warn("Google Calendar creation failed, proceeding without it.", e);
    }

    // 4. Update interview with calendar details
    if (meetLink || eventId) {
      await prisma.interview.update({
        where: { id: interview.id },
        data: { meetLink, eventId },
      });
    }

    return NextResponse.json({ 
      success: true, 
      interview: { ...interview, meetLink, eventId } 
    });
  } catch (error: any) {
    console.error("Error scheduling interview:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get('applicationId');
    const organizationId = searchParams.get('organizationId');

    if (applicationId) {
      const interviews = await prisma.interview.findMany({
        where: { applicationId },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
          },
          feedbacks: {
            include: {
              interviewer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  role: { select: { name: true, slug: true } }
                }
              },
              parameterScores: true
            }
          },
        },
        orderBy: { createdAt: 'desc' }
      });

      const roundIds = interviews.map(i => i.roundId).filter(Boolean) as string[];
      const rounds = await prisma.roundMaster.findMany({ where: { id: { in: roundIds } }});
      const roundsMap = Object.fromEntries(rounds.map(r => [r.id, r]));

      const enrichedInterviews = interviews.map(i => ({
        ...i,
        round: i.roundId ? roundsMap[i.roundId] : null
      }));

      const cleanedInterviews = enrichedInterviews.map(i => {
        const isParticipant = i.participants.some(p => p.userId === session.id);
        const hasSubmitted = i.feedbacks.some(f => f.interviewerId === session.id);
        if (isParticipant && !hasSubmitted) {
          return {
            ...i,
            feedbacks: i.feedbacks.filter(f => f.interviewerId === session.id)
          };
        }
        return i;
      });

      return NextResponse.json({ interviews: cleanedInterviews });
    }

    if (organizationId) {
      const interviews = await prisma.interview.findMany({
        where: { organizationId },
        include: {
          application: { select: { id: true, fullName: true, job: { select: { title: true } } } },
          participants: {
            include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const roundIds2 = interviews.map(i => i.roundId).filter(Boolean) as string[];
      const rounds2 = await prisma.roundMaster.findMany({ where: { id: { in: roundIds2 } }});
      const roundsMap2 = Object.fromEntries(rounds2.map(r => [r.id, r]));

      const enrichedInterviews2 = interviews.map(i => ({
        ...i,
        round: i.roundId ? roundsMap2[i.roundId] : null
      }));

      return NextResponse.json({ interviews: enrichedInterviews2 });
    }

    return NextResponse.json({ error: "Missing applicationId or organizationId" }, { status: 400 });
  } catch (error: any) {
    console.error("Error fetching interviews:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
