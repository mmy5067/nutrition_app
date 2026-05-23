import { createHash, randomBytes } from "node:crypto";
import { env } from "./env";
import nodemailer from "nodemailer";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_RESEND_INTERVAL_MS = 60 * 1000;

export function createEmailVerificationToken() {
  return randomBytes(24).toString("hex");
}

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getEmailVerificationExpiresAt() {
  return new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();
}

export function canResendVerification(lastAttemptAt?: string | null) {
  if (!lastAttemptAt) {
    return true;
  }

  const lastAttempt = Date.parse(lastAttemptAt);
  if (Number.isNaN(lastAttempt)) {
    return true;
  }

  return Date.now() - lastAttempt >= EMAIL_VERIFICATION_RESEND_INTERVAL_MS;
}

export function getResendRetryAfterSeconds(lastAttemptAt?: string | null) {
  if (!lastAttemptAt) {
    return 0;
  }

  const lastAttempt = Date.parse(lastAttemptAt);
  if (Number.isNaN(lastAttempt)) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil((EMAIL_VERIFICATION_RESEND_INTERVAL_MS - (Date.now() - lastAttempt)) / 1000)
  );
}

function buildVerificationEmail(verifyUrl: string) {
  return {
    subject: "请验证你的邮箱",
    html: `
      <div style="font-family: Arial, sans-serif; color: #1d2b24; line-height: 1.7;">
        <h2 style="margin: 0 0 12px;">验证你的邮箱</h2>
        <p style="margin: 0 0 12px;">感谢注册 Nutrition App。请在 24 小时内点击下方按钮完成邮箱验证。</p>
        <p style="margin: 20px 0;">
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#49a078;color:#ffffff;text-decoration:none;">
            立即验证邮箱
          </a>
        </p>
        <p style="margin: 0 0 8px;">如果按钮无法打开，可以复制下面的链接到浏览器：</p>
        <p style="margin: 0; word-break: break-all;">${verifyUrl}</p>
      </div>
    `,
    text: `感谢注册 Nutrition App。请在 24 小时内打开以下链接完成邮箱验证：${verifyUrl}`
  };
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${env.appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  // 使用 SMTP 发送验证邮件
  if (env.smtpHost && env.smtpUser && env.smtpPass) {
    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: Number(env.smtpPort) || 465,
      secure: true,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      }
    });

    const mailContent = buildVerificationEmail(verifyUrl);

    try {
      await transporter.sendMail({
        from: env.emailFrom,
        to: email,
        subject: mailContent.subject,
        html: mailContent.html,
        text: mailContent.text
      });
      return { ok: true };
    } catch (err) {
      console.error("SMTP send failed:", err);
      return {
        ok: false,
        error: "邮件发送失败，请稍后重试"
      };
    }
  }

  return {
    ok: false,
    error: "邮件服务未配置"
  };
}