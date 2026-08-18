import nodemailer from "nodemailer";
import { logger } from "./logger";

const SMTP_HOST = process.env["SMTP_HOST"];
const SMTP_PORT = parseInt(process.env["SMTP_PORT"] ?? "587", 10);
const SMTP_USER = process.env["SMTP_USER"];
const SMTP_PASS = process.env["SMTP_PASS"];
const SMTP_FROM =
  process.env["SMTP_FROM"] ?? "Telling Forward <noreply@tellingforward.app>";
const IS_PRODUCTION = process.env["NODE_ENV"] === "production";

/**
 * Returns true when the SMTP environment variables are present.
 * Use this to gate email-dependent flows before creating DB records.
 */
export function isEmailConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function createTransport(): nodemailer.Transporter {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Email service not configured — set SMTP_HOST, SMTP_USER, and SMTP_PASS",
    );
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Send an email verification link to a new user.
 *
 * In development (NODE_ENV !== "production"), when SMTP is not configured,
 * the verification URL is written to stdout so you can verify accounts without
 * a mail server. In production, SMTP must be configured; if it is not,
 * this function throws so callers can return a 503 before creating DB records.
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  // Point directly at the API verification endpoint so the link works without
  // a dedicated frontend route. When FRONTEND_URL is set, the frontend is
  // expected to proxy or redirect /api/auth/verify-email.
  const apiBase =
    process.env["API_BASE_URL"] ??
    process.env["FRONTEND_URL"] ??
    `http://localhost:${process.env["PORT"] ?? 8080}`;
  const verifyUrl = `${apiBase}/api/auth/verify-email?token=${token}`;

  if (!isEmailConfigured()) {
    if (IS_PRODUCTION) {
      // Never log the token in production — throw so the caller can surface
      // a clear error without creating an unverifiable account.
      throw new Error(
        "Email service not configured — set SMTP_HOST, SMTP_USER, and SMTP_PASS",
      );
    }
    // Development only: print the link to stdout so the flow is testable.
    // This branch is unreachable in production.
    console.log(`\n📧  Verification link for ${email}:\n   ${verifyUrl}\n`);
    return;
  }

  const transport = createTransport();
  await transport.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: "Verify your Telling Forward email address",
    text: [
      "Welcome to Telling Forward!",
      "",
      "Please verify your email address by visiting the link below:",
      verifyUrl,
      "",
      "This link expires in 24 hours.",
      "If you did not create this account, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <p>Welcome to <strong>Telling Forward</strong>!</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:10px 20px;background:#1a1a2e;color:#fff;border-radius:4px;text-decoration:none">
          Verify email
        </a>
      </p>
      <p>Or copy this link into your browser:<br>
        <a href="${verifyUrl}">${verifyUrl}</a>
      </p>
      <p><small>This link expires in 24 hours. If you did not create a Telling Forward account, you can ignore this email.</small></p>
    `,
  });

  logger.info({ email }, "Verification email sent");
}
