import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { sendInterviewReminderEmail } from "@/lib/server/email";

// This endpoint should be called by an external service (e.g. Vercel Cron or GitHub Actions)
// It can optionally be secured by a secret token in the Authorization header.

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Only enforce secret if it's set in the environment
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    
    // 24 Hours From Now
    const in24HoursStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
    const in24HoursEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

    // 1 Hour From Now
    const in1HourStart = new Date(now.getTime() + 0.5 * 60 * 60 * 1000);
    const in1HourEnd = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);

    const interviewsToRemind = await prisma.interview.findMany({
      where: {
        status: 'scheduled',
        OR: [
          { scheduledAt: { gte: in24HoursStart, lte: in24HoursEnd } },
          { scheduledAt: { gte: in1HourStart, lte: in1HourEnd } },
        ]
      },
      include: {
        application: { include: { job: true } },
        participants: { include: { user: true } },
        round: true
      }
    });

    let sentCount = 0;

    for (const interview of interviewsToRemind) {
      const candidateName = interview.application.fullName;
      const jobTitle = interview.application.job.title;
      const roundName = interview.round?.name || 'Interview';

      // Send to candidate
      await sendInterviewReminderEmail({
        toEmail: interview.application.email,
        candidateName,
        jobTitle,
        roundName,
        scheduledAt: interview.scheduledAt,
        duration: interview.duration,
        meetLink: interview.meetLink,
        isInterviewer: false
      }).catch(e => console.error("Candidate reminder failed", e));
      sentCount++;

      // Send to interviewers
      for (const participant of interview.participants) {
        if (!participant.user.email) continue;
        await sendInterviewReminderEmail({
          toEmail: participant.user.email,
          candidateName,
          jobTitle,
          roundName,
          scheduledAt: interview.scheduledAt,
          duration: interview.duration,
          meetLink: interview.meetLink,
          isInterviewer: true
        }).catch(e => console.error("Interviewer reminder failed", e));
        sentCount++;
      }
    }

    return NextResponse.json({ success: true, sentCount, processedInterviews: interviewsToRemind.length });
  } catch (error: any) {
    console.error("Error processing interview reminders:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
