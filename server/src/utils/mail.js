import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_SERVICE, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    return null;
  }

  // Gmail or other named service (e.g., "gmail", "outlook", "yahoo")
  if (SMTP_SERVICE) {
    transporter = nodemailer.createTransport({
      service: SMTP_SERVICE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  } else if (SMTP_HOST) {
    // Custom SMTP host
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: parseInt(SMTP_PORT || '587') === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  } else {
    return null;
  }

  return transporter;
}

export async function sendPasswordResetEmail(email, resetToken, resetCode, shortId) {
  const transport = getTransporter();

  const resetUrl = shortId
    ? `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?id=${shortId}`
    : `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p style="color: #555; line-height: 1.6;">
        You requested a password reset for your Mahakama Access account.
      </p>
      <p style="color: #555; line-height: 1.6;">
        Use the reset code below or click the button. This expires in <strong>15 minutes</strong>.
      </p>
      ${resetCode ? `
      <div style="text-align: center; margin: 1.5rem 0;">
        <span style="display: inline-block; padding: 12px 24px; background: #f3f4f6; border-radius: 8px; font-size: 1.5rem; font-weight: bold; letter-spacing: 0.3em; color: #333;">
          ${resetCode}
        </span>
      </div>
      ` : ''}
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
    if (resetCode) console.log(`[Mail] Reset code: ${resetCode}`);
    return { sent: false, reason: 'smtp_not_configured' };
  }

  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@mahakamaaccess.com',
      to: email,
      subject: 'Mahakama Access — Password Reset',
      html,
    });
    console.log(`[Mail] Password reset email sent to ${email}`);
    return { sent: true };
  } catch (error) {
    console.error(`[Mail] Failed to send password reset email to ${email}:`, error.message);
    return { sent: false, reason: 'send_failed' };
  }
}

export async function sendLoginCodeEmail(email, code) {
  const transport = getTransporter();

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #333;">Your Login Verification Code</h2>
      <p style="color: #555; line-height: 1.6;">
        After your password reset, we need to verify it's you. Enter this code to complete login.
      </p>
      <div style="text-align: center; margin: 2rem 0;">
        <span style="display: inline-block; padding: 16px 32px; background: #f3f4f6; border-radius: 8px; font-size: 2rem; font-weight: bold; letter-spacing: 0.3em; color: #333;">
          ${code}
        </span>
      </div>
      <p style="color: #999; font-size: 0.85rem; line-height: 1.5;">
        This code expires in 10 minutes. If you didn't request this, please reset your password again.
      </p>
    </div>
  `;

  if (!transport) {
    console.log(`[Mail] SMTP not configured. Login code for ${email}: ${code}`);
    return { sent: false, reason: 'smtp_not_configured' };
  }

  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@mahakamaaccess.com',
      to: email,
      subject: 'Mahakama Access — Login Verification Code',
      html,
    });
    console.log(`[Mail] Login code email sent to ${email}`);
    return { sent: true };
  } catch (error) {
    console.error(`[Mail] Failed to send login code email to ${email}:`, error.message);
    return { sent: false, reason: 'send_failed' };
  }
}
