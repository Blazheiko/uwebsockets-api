import { createHash, randomBytes } from "node:crypto";
import appConfig from "#config/app.js";
import logger from "#logger";
import { emailVerificationRepository, userRepository } from "#app/repositories/index.js";
import { emailService } from "#app/services/email-service.js";
import {
  failure,
  success,
  type ServiceResult,
} from "#app/services/shared/service-result.js";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_BRAND = {
  accent: "#A8627A",
  accentHover: "#96516A",
  canvas: "#FAF0F3",
  surface: "#FFFFFF",
  textPrimary: "#2C3440",
  textSecondary: "#5E6977",
  border: "#D8DDE6",
  accentSoft: "#F6E8EE",
  accentLine: "#E7C8D3",
} as const;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createVerificationToken(): string {
  return randomBytes(32).toString("base64url");
}

function buildVerificationUrl(token: string): string {
  const baseUrl = appConfig.frontendUrl;
  return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailContent(name: string, verificationUrl: string): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Confirm your email";
  const trimmedName = name.trim();
  const safeName = trimmedName === "" ? "" : `, ${trimmedName}`;
  const escapedGreeting = trimmedName === "" ? "" : `, ${escapeHtml(trimmedName)}`;
  const escapedVerificationUrl = escapeHtml(verificationUrl);

  const text = [
    `Hello${safeName}.`,
    "",
    "Please confirm your email address by opening this link:",
    verificationUrl,
    "",
    "This link will expire in 24 hours.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:${EMAIL_BRAND.canvas};font-family:Inter,Arial,sans-serif;color:${EMAIL_BRAND.textPrimary};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Confirm your ITVibe Party email address.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${EMAIL_BRAND.canvas};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;">
            <tr>
              <td style="padding-bottom:16px;">
                <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:${EMAIL_BRAND.accentSoft};border:1px solid ${EMAIL_BRAND.accentLine};color:${EMAIL_BRAND.accent};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                  ITVibe Party
                </div>
              </td>
            </tr>
            <tr>
              <td style="border-radius:28px;background:${EMAIL_BRAND.surface};border:1px solid ${EMAIL_BRAND.border};box-shadow:0 18px 48px rgba(44,52,64,0.08);overflow:hidden;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:40px 40px 24px;background:linear-gradient(180deg, rgba(168,98,122,0.16) 0%, rgba(168,98,122,0.05) 100%);border-bottom:1px solid ${EMAIL_BRAND.border};">
                      <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_BRAND.accent};margin-bottom:14px;">
                        Email verification
                      </div>
                      <h1 style="margin:0;font-size:34px;line-height:1.12;font-weight:800;color:${EMAIL_BRAND.textPrimary};">
                        Confirm your email address
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px 40px 40px;">
                      <p style="margin:0 0 18px;font-size:18px;line-height:1.65;color:${EMAIL_BRAND.textPrimary};">
                        Hello${escapedGreeting}.
                      </p>
                      <p style="margin:0 0 28px;font-size:17px;line-height:1.7;color:${EMAIL_BRAND.textSecondary};">
                        Finish setting up your ITVibe Party account by confirming this email address. The button below will take you straight back into the app.
                      </p>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                        <tr>
                          <td align="center" bgcolor="${EMAIL_BRAND.accent}" style="border-radius:16px;box-shadow:0 14px 26px rgba(168,98,122,0.24);">
                            <a
                              href="${escapedVerificationUrl}"
                              style="display:inline-block;padding:17px 28px;font-size:17px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:16px;background:${EMAIL_BRAND.accent};"
                            >
                              Confirm email
                            </a>
                          </td>
                        </tr>
                      </table>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border-collapse:separate;">
                        <tr>
                          <td style="padding:18px 20px;border-radius:18px;background:${EMAIL_BRAND.accentSoft};border:1px solid ${EMAIL_BRAND.accentLine};">
                            <div style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${EMAIL_BRAND.accent};">
                              Alternative link
                            </div>
                            <div style="font-size:15px;line-height:1.65;color:${EMAIL_BRAND.textSecondary};word-break:break-word;">
                              If the button does not work, open this link:<br />
                              <a href="${escapedVerificationUrl}" style="color:${EMAIL_BRAND.accent};text-decoration:underline;">
                                ${escapedVerificationUrl}
                              </a>
                            </div>
                          </td>
                        </tr>
                      </table>
                      <div style="padding-top:20px;border-top:1px solid ${EMAIL_BRAND.border};font-size:14px;line-height:1.7;color:${EMAIL_BRAND.textSecondary};">
                        This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export const emailVerificationService = {
  async sendVerificationEmail(userId: bigint): Promise<ServiceResult<{ message: string }>> {
    const user = await userRepository.findById(userId);
    if (user === undefined) {
      return failure("NOT_FOUND", "User not found");
    }

    if (user.emailVerifiedAt !== null) {
      return success({ message: "Email is already verified" });
    }

    await emailVerificationRepository.invalidatePendingByUserId(userId);

    const rawToken = createVerificationToken();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
    await emailVerificationRepository.create({
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    });

    const verificationUrl = buildVerificationUrl(rawToken);
    const emailContent = buildEmailContent(user.name, verificationUrl);
    const sendResult = await emailService.send({
      to: user.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    if (!sendResult.ok) {
      return failure("INTERNAL", sendResult.message);
    }

    return success({ message: "Verification email sent" });
  },

  async verifyEmail(token: string): Promise<ServiceResult<{ message: string }>> {
    const normalizedToken = token.trim();
    if (normalizedToken === "") {
      return failure("BAD_REQUEST", "Verification token is required");
    }

    const verification = await emailVerificationRepository.findByTokenHash(
      hashToken(normalizedToken),
    );

    if (verification === undefined) {
      return failure("BAD_REQUEST", "Verification link is invalid");
    }

    if (verification.usedAt !== null) {
      return failure("BAD_REQUEST", "Verification link has already been used");
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      await emailVerificationRepository.markUsed(verification.id);
      return failure("BAD_REQUEST", "Verification link has expired");
    }

    const user = await userRepository.findById(verification.userId);
    if (user === undefined) {
      return failure("NOT_FOUND", "User not found");
    }

    if (user.emailVerifiedAt === null) {
      const updatedUser = await userRepository.update(user.id, {
        emailVerifiedAt: new Date(),
      });
      if (updatedUser === undefined) {
        return failure("INTERNAL", "Failed to verify email");
      }
    }

    await emailVerificationRepository.markUsed(verification.id);
    return success({ message: "Email confirmed successfully" });
  },

  async queueVerificationEmail(userId: bigint): Promise<ServiceResult<{ message: string }>> {
    const user = await userRepository.findById(userId);
    if (user === undefined) {
      return failure("NOT_FOUND", "User not found");
    }

    if (user.emailVerifiedAt !== null) {
      return success({ message: "Email is already verified" });
    }

    void this.sendVerificationEmailInBackground(userId, "manual resend");
    return success({ message: "Verification email will be sent shortly" });
  },

  async sendVerificationEmailInBackground(
    userId: bigint,
    reason: "registration" | "manual resend",
  ): Promise<void> {
    try {
      const result = await this.sendVerificationEmail(userId);
      if (!result.ok) {
        logger.warn(
          { userId: String(userId), reason: result.message, trigger: reason },
          "Failed to send verification email in background",
        );
      }
    } catch (err) {
      logger.error(
        { err, userId: String(userId), trigger: reason },
        "Unexpected error while sending verification email in background",
      );
    }
  },

  async sendVerificationEmailAfterRegistration(userId: bigint): Promise<void> {
    await this.sendVerificationEmailInBackground(userId, "registration");
  },
};
