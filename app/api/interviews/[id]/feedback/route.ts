import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/tenantGuard";
import { prisma } from "@/lib/server/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { recommendation, comments, scores } = body;
    // scores is an array of { parameterId: string, score: number }

    if (!recommendation) {
      return NextResponse.json({ error: "Recommendation is required" }, { status: 400 });
    }

    // 1. Verify interviewer is part of the interview
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { participants: true }
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const isHighPrivilege = ['super-admin', 'org-admin', 'hr', 'recruiter'].includes(user.roleSlug || '');
    const isParticipant = interview.participants.some(p => p.userId === user.id);
    if (!isParticipant && !isHighPrivilege) {
      return NextResponse.json({ error: "You are not assigned as an interviewer for this round." }, { status: 403 });
    }

    // 2. Create the feedback
    const feedback = await prisma.interviewFeedback.create({
      data: {
        interviewId: id,
        interviewerId: user.id,
        recommendation,
        comments,
        parameterScores: {
          create: scores?.map((s: any) => ({
            parameterId: s.parameterId,
            score: Number(s.score)
          })) || []
        }
      },
      include: {
        parameterScores: true
      }
    });

    // 3. Mark interview as completed if all participants have submitted feedback? 
    // Usually we just let the Recruiter mark it completed or move the stage, but we can do a check.

    return NextResponse.json({ success: true, feedback });
  } catch (error: any) {
    console.error("Error submitting interview feedback:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "You have already submitted feedback for this interview." }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { recommendation, comments, scores } = body;

    if (!recommendation) {
      return NextResponse.json({ error: "Recommendation is required" }, { status: 400 });
    }

    // Find the feedback matching this interview and the current interviewer
    const feedback = await prisma.interviewFeedback.findUnique({
      where: {
        interviewId_interviewerId: {
          interviewId: id,
          interviewerId: sessionUser.id
        }
      }
    });

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found or you are not the author." }, { status: 404 });
    }

    // Update in transaction: delete scores and recreate them, then update feedback
    await prisma.$transaction([
      prisma.interviewFeedbackScore.deleteMany({
        where: { feedbackId: feedback.id }
      }),
      prisma.interviewFeedback.update({
        where: { id: feedback.id },
        data: {
          recommendation,
          comments,
          parameterScores: {
            create: scores?.map((s: any) => ({
              parameterId: s.parameterId,
              score: Number(s.score)
            })) || []
          }
        }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating interview feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the feedback matching this interview and the current interviewer
    const feedback = await prisma.interviewFeedback.findUnique({
      where: {
        interviewId_interviewerId: {
          interviewId: id,
          interviewerId: sessionUser.id
        }
      }
    });

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found or you are not the author." }, { status: 404 });
    }

    await prisma.interviewFeedback.delete({
      where: { id: feedback.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting interview feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
