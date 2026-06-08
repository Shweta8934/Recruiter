import nodemailer from 'nodemailer'

type InviteMailParams = {
  to: string
  inviterName: string
  organizationName: string
  roleName: string
  inviteUrl: string
  message?: string
}

function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export async function sendInviteEmail(params: InviteMailParams) {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('SMTP not configured; skipping email send for', params.to)
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' }
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: params.to,
    subject: `Invitation to join ${params.organizationName}`,
    html: `
      <h2>You are invited to join ${params.organizationName}</h2>
      <p><strong>${params.inviterName}</strong> invited you as <strong>${params.roleName}</strong>.</p>
      ${params.message ? `<p>Message: ${params.message}</p>` : ''}
      <p><a href="${params.inviteUrl}">Accept Invitation</a></p>
      <p>This link expires in 7 days.</p>
    `,
  })

  return { sent: true }
}

export async function sendGenericEmail(params: { to: string; subject: string; html: string }) {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('SMTP not configured; skipping email send for', params.to)
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' }
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: params.to,
    subject: params.subject,
    html: params.html,
  })

  return { sent: true }
}
