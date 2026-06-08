import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import nodemailer from 'nodemailer'
import { requireTenantAccess } from '@/lib/server/tenantGuard'

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const paper = await prisma.questionPaper.findUnique({
      where: { id }
    })

    if (!paper) {
      return NextResponse.json({ error: 'Question paper not found' }, { status: 404 })
    }
    const access = await requireTenantAccess(paper.organizationId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // Auto-activate public link if it's not active
    if (!paper.isPublicActive) {
      await prisma.questionPaper.update({
        where: { id },
        data: { isPublicActive: true }
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const testLink = `${appUrl}/question-papers/take/${id}?email=${encodeURIComponent(email)}`

    // Setup nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Invitation to Take Assessment</h2>
        <p>You have been invited to take the <strong>${paper.title}</strong> assessment.</p>
        <p><strong>Role:</strong> ${paper.jobTitle}</p>
        <p><strong>Duration:</strong> ${paper.duration} minutes</p>
        <div style="margin-top: 30px;">
          <a href="${testLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Assessment</a>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">If the button does not work, copy and paste this link into your browser: <br>${testLink}</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: `Invitation: ${paper.title}`,
      html: htmlContent,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to send invite:', error)
    return NextResponse.json({ error: 'Failed to send email invite' }, { status: 500 })
  }
}
