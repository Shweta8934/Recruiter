import nodemailer from 'nodemailer'

/**
 * Creates a reusable test email transporter.
 * Ethereal is a free fake SMTP service for testing. It catches all emails and generates a link to view them.
 */
export async function getEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Fallback to Ethereal for testing if no real SMTP configured
  let testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

export async function sendPasswordResetEmail(toEmail: string, resetLink: string) {
  const transporter = await getEmailTransporter();

  const info = await transporter.sendMail({
    from: '"SaaS RBAC Starter" <noreply@saasstarter.dev>',
    to: toEmail,
    subject: "Reset your password",
    text: `You requested a password reset. Click this link to choose a new password: ${resetLink}`,
    html: `
      <div style="font-family: sans-serif; max-w-md; margin: auto;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
        <p>Click the button below to set a new password:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        <br/><br/>
        <p style="font-size: 12px; color: #666;">Or copy and paste this link into your browser:<br/>${resetLink}</p>
      </div>
    `,
  });



  return nodemailer.getTestMessageUrl(info);
}

export async function sendAssessmentSubmittedEmail(params: {
  toEmail: string
  recruiterName?: string | null
  candidateName: string
  candidateEmail: string
  paperTitle: string
  score: number
  pendingEvaluation: boolean
  reportUrl?: string
}) {
  const transporter = await getEmailTransporter()
  const {
    toEmail,
    recruiterName,
    candidateName,
    candidateEmail,
    paperTitle,
    score,
    pendingEvaluation,
    reportUrl,
  } = params

  const statusLine = pendingEvaluation
    ? 'Submission received. Final score will update after coding/SA evaluation.'
    : `Submission complete. Current score: ${score}%.`

  const info = await transporter.sendMail({
    from: '"AI Recruitment" <noreply@airecruitment.dev>',
    to: toEmail,
    subject: `Test Submitted: ${candidateName} • ${paperTitle}`,
    text: `${recruiterName || 'Recruiter'}, candidate ${candidateName} (${candidateEmail}) submitted test "${paperTitle}". ${statusLine}${reportUrl ? ` Report: ${reportUrl}` : ''}`,
    html: `
      <div style="font-family: sans-serif; max-width: 640px; margin: auto;">
        <h2>Candidate Test Submitted</h2>
        <p>Hello ${recruiterName || 'Recruiter'},</p>
        <p><strong>${candidateName}</strong> (${candidateEmail}) submitted <strong>${paperTitle}</strong>.</p>
        <p>${statusLine}</p>
        ${reportUrl ? `<p><a href="${reportUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">View Attempt Report</a></p>` : ''}
      </div>
    `,
  })
}

export async function sendCandidateStageEmail(params: {
  toEmail: string
  candidateName: string
  jobTitle: string
  subjectTemplate: string
  bodyTemplate: string
}) {
  const transporter = await getEmailTransporter()
  const { toEmail, candidateName, jobTitle, subjectTemplate, bodyTemplate } = params

  const replaceVars = (str: string) => {
    return str
      .replace(/\{\{CandidateName\}\}/g, candidateName)
      .replace(/\{\{JobTitle\}\}/g, jobTitle)
  }

  const subject = replaceVars(subjectTemplate)
  let textBody = replaceVars(bodyTemplate)
  let htmlBody = textBody.replace(/\n/g, '<br/>')

  const info = await transporter.sendMail({
    from: '"AI Recruitment" <noreply@airecruitment.dev>',
    to: toEmail,
    subject,
    text: textBody,
    html: `
      <div style="font-family: sans-serif; max-width: 640px; margin: auto;">
        ${htmlBody}
      </div>
    `,
  })

  return nodemailer.getTestMessageUrl(info)
}

export async function sendInterviewReminderEmail(params: {
  toEmail: string
  candidateName: string
  jobTitle: string
  roundName: string
  scheduledAt: Date
  duration: number
  meetLink?: string | null
  isInterviewer: boolean
}) {
  const transporter = await getEmailTransporter()
  const { toEmail, candidateName, jobTitle, roundName, scheduledAt, duration, meetLink, isInterviewer } = params

  const dateString = scheduledAt.toLocaleString()

  const subject = `Reminder: Interview for ${jobTitle} - ${candidateName}`

  const textBody = `
Reminder: You have an upcoming interview.

Role: ${jobTitle}
Round: ${roundName}
Candidate: ${candidateName}
Time: ${dateString} (${duration} minutes)
${meetLink ? `Join Link: ${meetLink}` : ''}

${isInterviewer ? 'Please review the candidate profile before the interview.' : 'Please be ready 5 minutes before the start time.'}
  `

  const info = await transporter.sendMail({
    from: '"AI Recruitment" <noreply@airecruitment.dev>',
    to: toEmail,
    subject,
    text: textBody,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #333; margin-top: 0;">⏰ Interview Reminder</h2>
        <p style="color: #555;">Hi there,</p>
        <p style="color: #555;">This is a quick reminder for an upcoming interview for the <strong>${jobTitle}</strong> role.</p>
        
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0; background-color: #f9fafb; border-radius: 6px; overflow: hidden;">
          <tr>
            <td style="padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #eaeaea; color: #374151; width: 30%;">Candidate:</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #eaeaea; color: #111827;">${candidateName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #eaeaea; color: #374151;">Round:</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #eaeaea; color: #111827;">${roundName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #eaeaea; color: #374151;">Time (IST):</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #eaeaea; color: #111827;">${dateString}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-weight: bold; color: #374151;">Duration:</td>
            <td style="padding: 12px 16px; color: #111827;">${duration} minutes</td>
          </tr>
        </table>

        ${meetLink ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${meetLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center;">Join Zoom Meeting 📹</a>
          </div>
        ` : ''}

        <p style="color: #555; margin-top: 20px;">
          <strong>Note:</strong> ${isInterviewer ? 'Please review the candidate profile and scorecard before the interview starts.' : 'Please be ready and join the meeting 5 minutes before the start time.'}
        </p>
        
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center;">AI Recruitment Platform</p>
      </div>
    `,
  })

  return nodemailer.getTestMessageUrl(info)
}

export async function sendRescheduleRequestEmail(params: {
  toEmail: string
  recruiterName: string
  candidateName: string
  jobTitle: string
  reason: string
}) {
  const transporter = await getEmailTransporter()
  const { toEmail, recruiterName, candidateName, jobTitle, reason } = params

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '"AI Recruitment" <noreply@airecruitment.dev>',
    to: toEmail,
    subject: `Reschedule Request: ${candidateName} for ${jobTitle}`,
    text: `${candidateName} has requested to reschedule their interview for the ${jobTitle} role. Reason: ${reason}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; padding: 20px; border-radius: 8px;">
        <h2>🗓️ Interview Reschedule Request</h2>
        <p>Hi ${recruiterName},</p>
        <p><strong>${candidateName}</strong> has requested to reschedule their upcoming interview for the <strong>${jobTitle}</strong> role.</p>
        <div style="background: #f9fafb; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <p style="margin: 0;"><strong>Candidate's Reason:</strong></p>
          <p style="margin-top: 8px; color: #4b5563;">"${reason}"</p>
        </div>
        <p>Please log in to your dashboard to accept or reject this request.</p>
      </div>
    `,
  })

}

export async function sendInterviewCancelledEmail(params: {
  toEmail: string
  candidateName: string
  jobTitle: string
  reason: string
  isInterviewer: boolean
}) {
  const transporter = await getEmailTransporter()
  const { toEmail, candidateName, jobTitle, reason, isInterviewer } = params

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '"AI Recruitment" <noreply@airecruitment.dev>',
    to: toEmail,
    subject: `Interview Cancelled: ${jobTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; padding: 20px; border-radius: 8px;">
        <h2 style="color: #dc2626;">❌ Interview Cancelled</h2>
        <p>Hi,</p>
        <p>The interview with <strong>${candidateName}</strong> for the <strong>${jobTitle}</strong> role has been cancelled.</p>
        <div style="background: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
          <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>If you have any questions, please contact the recruitment team.</p>
      </div>
    `,
  })

}

export async function sendRescheduleRejectedEmail(params: {
  toEmail: string
  candidateName: string
  jobTitle: string
}) {
  const transporter = await getEmailTransporter()
  const { toEmail, candidateName, jobTitle } = params

  const info = await transporter.sendMail({
    from: '"AI Recruitment" <noreply@airecruitment.dev>',
    to: toEmail,
    subject: `Update on your Interview: ${jobTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; padding: 20px; border-radius: 8px;">
        <h2>Interview Update</h2>
        <p>Hi ${candidateName},</p>
        <p>We received your request to reschedule the interview for the <strong>${jobTitle}</strong> role.</p>
        <p>Unfortunately, we are unable to accommodate a new time slot and cannot proceed with rescheduling at this time.</p>
        <p>Thank you for your interest and time.</p>
        <p>Best regards,<br/>The Recruitment Team</p>
      </div>
    `,
  })

}
