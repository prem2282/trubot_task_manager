import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let smtpTransporter: Transporter | null = null;

function getSmtpTransporter(): Transporter {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }
  return smtpTransporter;
}

async function sendViaSmtp(input: SendEmailInput): Promise<void> {
  const transporter = getSmtpTransporter();
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

async function sendViaResend(input: SendEmailInput): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  try {
    if (env.EMAIL_PROVIDER === 'resend') {
      await sendViaResend(input);
    } else {
      await sendViaSmtp(input);
    }

    if (env.NODE_ENV === 'development') {
      console.info(`[email] Sent "${input.subject}" to ${input.to} (view at http://localhost:8025)`);
    }
  } catch (error) {
    console.error('[email] Failed to send:', error);
    throw error;
  }
}
