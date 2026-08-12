import nodemailer from 'nodemailer';
import { prisma } from '../prisma.js';
import { formatKobo } from './money.js';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function getEmailConfig() {
  const cfg = await prisma.emailConfig.findFirst();
  return cfg;
}

export async function saveEmailConfig(data: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  enabled: boolean;
}) {
  const cfg = await prisma.emailConfig.findFirst();
  if (cfg) {
    return prisma.emailConfig.update({ where: { id: cfg.id }, data });
  }
  return prisma.emailConfig.create({ data });
}

export async function sendEmail({ to, subject, text, html }: EmailPayload) {
  const cfg = await getEmailConfig();
  if (!cfg || !cfg.enabled) {
    return { ok: false, message: 'Email service is not configured or disabled' };
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  await transporter.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html,
  });

  return { ok: true, message: 'Email sent' };
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const cfg = await getEmailConfig();
  if (!cfg?.enabled) return { ok: false, message: 'Email service disabled' };

  const subject = 'Reset your OYE Well password';
  const text = `You requested a password reset for your OYE Well account.\n\nUse the following code within 15 minutes:\n\n${token}\n\nIf you did not request this, you can safely ignore this email.`;
  const html = `<p>You requested a password reset for your OYE Well account.</p><p>Use the following code within 15 minutes:</p><p style="font-size:1.25rem;font-weight:bold;letter-spacing:0.05em;">${token}</p><p>If you did not request this, you can safely ignore this email.</p>`;

  return sendEmail({ to: email, subject, text, html });
}

export async function sendOrderStatusEmail(order: any) {
  if (!order.customer?.email) return { ok: false, message: 'No customer email' };
  const cfg = await getEmailConfig();
  if (!cfg?.enabled) return { ok: false, message: 'Email service disabled' };

  const status = order.status.replace(/_/g, ' ');
  const name = order.customer.firstName || 'there';
  const subject = `Your OYE Well order ${order.orderNumber} is ${status}`;
  const text = `Hi ${name},\n\nYour OYE Well order ${order.orderNumber} is now ${status}.\n\nTotal: ${formatKobo(order.totalKobo)}\n\nThanks,\nOYE Well`;
  const html = `<p>Hi ${name},</p><p>Your OYE Well order <strong>${order.orderNumber}</strong> is now <strong>${status}</strong>.</p><p>Total: ${formatKobo(order.totalKobo)}</p><p>Thanks,<br>OYE Well</p>`;

  return sendEmail({ to: order.customer.email, subject, text, html });
}
