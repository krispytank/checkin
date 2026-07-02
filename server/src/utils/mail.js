import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: parseInt(SMTP_PORT || '587') === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendPasswordResetEmail(email, resetToken) {
  const transport = getTransporter();

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p style="color: #555; line-height: 1.6;">
        You requested a password reset for your AttendTrack account.
      </p>
      <p style="color: #555; line-height: 1.6;">
        Click the button below to reset your password. This link expires in 1 hour.
      </p>
      <div style="text-align: center; margin: 2rem 0;">
        <a href="${resetUrl}"
           style="display: inline-block; padding: 12px 24px; background: #009A44; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
          Reset Password
        </a>
      </div>
      <p style="color: #999; font-size: 0.85rem; line-height: 1.5;">
        If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
      </p>
      <p style="color: #999; font-size: 0.85rem;">
        Or copy this link: <a href="${resetUrl}" style="color: #009A44;">${resetUrl}</a>
      </p>
    </div>
  `;

  if (!transport) {
    console.log(`[Mail] SMTP not configured. Password reset link for ${email}: ${resetUrl}`);
    return { sent: false, reason: 'smtp_not_configured' };
  }

  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@attendtrack.com',
      to: email,
      subject: 'AttendTrack — Password Reset',
      html,
    });
    console.log(`[Mail] Password reset email sent to ${email}`);
    return { sent: true };
  } catch (error) {
    console.error(`[Mail] Failed to send password reset email to ${email}:`, error.message);
    return { sent: false, reason: 'send_failed' };
  }
}
