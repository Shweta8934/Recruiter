import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/tenantGuard";
import { prisma } from "@/lib/server/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const template = await prisma.evaluationTemplate.findUnique({
      where: { id },
      include: {
        parameters: true
      }
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("Error fetching evaluation template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
