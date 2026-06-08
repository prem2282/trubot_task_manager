import { env } from '../config/env';

function layout(title: string, body: string, actionUrl: string, actionLabel: string): string {
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #1e293b;">
    <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 20px; margin-bottom: 16px;">${title}</h1>
      ${body}
      <p style="margin: 24px 0;">
        <a href="${actionUrl}" style="background: #4f46e5; color: #fff; padding: 12px 18px; border-radius: 6px; text-decoration: none;">
          ${actionLabel}
        </a>
      </p>
      <p style="font-size: 13px; color: #64748b;">
        If the button does not work, copy and paste this link into your browser:<br />
        <a href="${actionUrl}">${actionUrl}</a>
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
        Sent by Task Manager (${env.CLIENT_URL})
      </p>
    </div>
  </body>
</html>`;
}

export function verificationEmailHtml(name: string, verifyUrl: string, expiresHours: number): string {
  return layout(
    'Verify your email',
    `<p>Hi ${name},</p>
     <p>Thanks for registering. Please verify your email address to activate your account.</p>
     <p>This link expires in ${expiresHours} hour${expiresHours === 1 ? '' : 's'}.</p>`,
    verifyUrl,
    'Verify email'
  );
}

export function passwordResetEmailHtml(name: string, resetUrl: string, expiresHours: number): string {
  return layout(
    'Reset your password',
    `<p>Hi ${name},</p>
     <p>We received a request to reset your password. If you did not request this, you can ignore this email.</p>
     <p>This link expires in ${expiresHours} hour${expiresHours === 1 ? '' : 's'}.</p>`,
    resetUrl,
    'Reset password'
  );
}

export function verificationEmailText(name: string, verifyUrl: string, expiresHours: number): string {
  return `Hi ${name},

Thanks for registering. Verify your email to activate your account:
${verifyUrl}

This link expires in ${expiresHours} hour${expiresHours === 1 ? '' : 's'}.`;
}

export function passwordResetEmailText(name: string, resetUrl: string, expiresHours: number): string {
  return `Hi ${name},

Reset your password using this link:
${resetUrl}

This link expires in ${expiresHours} hour${expiresHours === 1 ? '' : 's'}. If you did not request a reset, ignore this email.`;
}

export function inviteEmailHtml(
  inviteeName: string,
  inviteUrl: string,
  accountName: string,
  workspaceName: string,
  inviterName: string,
  expiresDays: number
): string {
  return layout(
    `Join ${accountName}`,
    `<p>Hi ${inviteeName},</p>
     <p><strong>${inviterName}</strong> invited you to join <strong>${accountName}</strong> on Task Manager in the <strong>${workspaceName}</strong> workspace.</p>
     <p>Accept the invitation to set your password and start collaborating.</p>
     <p>This link expires in ${expiresDays} day${expiresDays === 1 ? '' : 's'}.</p>`,
    inviteUrl,
    'Accept invitation'
  );
}

export function inviteEmailText(
  inviteeName: string,
  inviteUrl: string,
  accountName: string,
  workspaceName: string,
  inviterName: string,
  expiresDays: number
): string {
  return `Hi ${inviteeName},

${inviterName} invited you to join ${accountName} on Task Manager in the ${workspaceName} workspace.

Accept the invitation and set your password:
${inviteUrl}

This link expires in ${expiresDays} day${expiresDays === 1 ? '' : 's'}.`;
}
