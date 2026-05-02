import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "metautil";
import { nanoid } from "nanoid";
import appConfig from "#config/app.js";
import logger from "#logger";
import { passwordResetRepository, userRepository } from "#app/repositories/index.js";
import { emailService } from "#app/services/email-service.js";
import {
  failure,
  success,
  type ServiceErrorCode,
  type ServiceFailure,
  type ServiceResult,
  type ServiceSuccess,
} from "#app/services/shared/service-result.js";
import { destroyAllSessions } from "#vendor/utils/session/redis-session-storage.js";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const GENERIC_RESET_MESSAGE =
  "If an account with that email exists, a reset link will be sent shortly.";
// Email clients do not support app CSS variables reliably, so this palette stays inline on purpose.
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

function createResetToken(): string {
  return randomBytes(32).toString("base64url");
}

function buildResetUrl(token: string): string {
  return `${appConfig.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildResetEmailContent(name: string, resetUrl: string): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Reset your password";
  const trimmedName = name.trim();
  const safeName = trimmedName === "" ? "" : `, ${trimmedName}`;
  const escapedGreeting = trimmedName === "" ? "" : `, ${escapeHtml(trimmedName)}`;
  const escapedResetUrl = escapeHtml(resetUrl);

  const text = [
    `Hello${safeName}.`,
    "",
    "We received a request to reset your password.",
    "Open this link to choose a new password:",
    resetUrl,
    "",
    "This link will expire in 1 hour.",
    "If you did not request a password reset, you can safely ignore this email.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:${EMAIL_BRAND.canvas};font-family:Inter,Arial,sans-serif;color:${EMAIL_BRAND.textPrimary};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Reset your ITVibe Party password.
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
                        Password reset
                      </div>
                      <h1 style="margin:0;font-size:34px;line-height:1.12;font-weight:800;color:${EMAIL_BRAND.textPrimary};">
                        Choose a new password
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px 40px 40px;">
                      <p style="margin:0 0 18px;font-size:18px;line-height:1.65;color:${EMAIL_BRAND.textPrimary};">
                        Hello${escapedGreeting}.
                      </p>
                      <p style="margin:0 0 28px;font-size:17px;line-height:1.7;color:${EMAIL_BRAND.textSecondary};">
                        We received a request to reset your ITVibe Party password. Use the button below to set a new one.
                      </p>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                        <tr>
                          <td align="center" bgcolor="${EMAIL_BRAND.accent}" style="border-radius:16px;box-shadow:0 14px 26px rgba(168,98,122,0.24);">
                            <a
                              href="${escapedResetUrl}"
                              style="display:inline-block;padding:17px 28px;font-size:17px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:16px;background:${EMAIL_BRAND.accent};"
                            >
                              Reset password
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
                              <a href="${escapedResetUrl}" style="color:${EMAIL_BRAND.accent};text-decoration:underline;">
                                ${escapedResetUrl}
                              </a>
                            </div>
                          </td>
                        </tr>
                      </table>
                      <div style="padding-top:20px;border-top:1px solid ${EMAIL_BRAND.border};font-size:14px;line-height:1.7;color:${EMAIL_BRAND.textSecondary};">
                        This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.
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

export type ResetPasswordFailureReason =
  | "invalid_token"
  | "expired_token"
  | "used_token"
  | "token_required"
  | "passwords_mismatch";

export interface ResetPasswordFailure {
  ok: false;
  code: ServiceErrorCode;
  message: string;
  reason: ResetPasswordFailureReason;
}

export type ResetPasswordServiceResult =
  | ServiceSuccess<{ status: "success" }>
  | ResetPasswordFailure
  | ServiceFailure;

function resetPasswordFailure(
  code: ServiceErrorCode,
  reason: ResetPasswordFailureReason,
  message: string,
): ResetPasswordFailure {
  return { ok: false, code, reason, message };
}

export const passwordResetService = {
  requestPasswordReset: async (
    email: string,
  ): Promise<ServiceSuccess<{ message: string }>> => {
    const normalizedEmail = email.trim().toLowerCase();
    const user = normalizedEmail === "" ? undefined : await userRepository.findByEmail(normalizedEmail);

    if (user !== undefined) {
      void passwordResetService.sendPasswordResetEmailInBackground(user.id, "manual request");
    }

    return success({ message: GENERIC_RESET_MESSAGE });
  },

  async sendPasswordResetEmail(userId: bigint): Promise<ServiceResult<{ message: string }>> {
    const user = await userRepository.findById(userId);
    if (user === undefined) {
      return failure("NOT_FOUND", "User not found");
    }

    await passwordResetRepository.invalidatePendingByUserId(userId);

    const rawToken = createResetToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await passwordResetRepository.create({
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    });

    const resetUrl = buildResetUrl(rawToken);
    const emailContent = buildResetEmailContent(user.name, resetUrl);
    const sendResult = await emailService.send({
      to: user.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    if (!sendResult.ok) {
      return failure("INTERNAL", sendResult.message);
    }

    return success({ message: "Password reset email sent" });
  },

  async resetPassword(
    token: string,
    password: string,
    passwordConfirm: string,
  ): Promise<ResetPasswordServiceResult> {
    const normalizedToken = token.trim();
    if (normalizedToken === "") {
      return resetPasswordFailure(
        "BAD_REQUEST",
        "token_required",
        "Password reset token is required",
      );
    }

    if (password !== passwordConfirm) {
      return resetPasswordFailure(
        "BAD_REQUEST",
        "passwords_mismatch",
        "Passwords do not match",
      );
    }

    const resetToken = await passwordResetRepository.findByTokenHash(hashToken(normalizedToken));
    if (resetToken === undefined) {
      return resetPasswordFailure(
        "BAD_REQUEST",
        "invalid_token",
        "Password reset link is invalid",
      );
    }

    if (resetToken.usedAt !== null) {
      return resetPasswordFailure(
        "BAD_REQUEST",
        "used_token",
        "Password reset link has already been used",
      );
    }

    if (resetToken.expiresAt.getTime() < Date.now()) {
      await passwordResetRepository.markUsed(resetToken.id);
      return resetPasswordFailure(
        "BAD_REQUEST",
        "expired_token",
        "Password reset link has expired",
      );
    }

    const user = await userRepository.findById(resetToken.userId);
    if (user === undefined) {
      return failure("NOT_FOUND", "User not found");
    }

    const newPasswordHash = await hashPassword(password);
    const previousSessionToken = user.sessionToken;

    const updatedUser = await userRepository.update(user.id, {
      password: newPasswordHash,
      sessionToken: nanoid(),
    });
    if (updatedUser === undefined) {
      return failure("INTERNAL", "Failed to update password");
    }

    await destroyAllSessions(previousSessionToken);

    const usedToken = await passwordResetRepository.markUsed(resetToken.id);
    if (usedToken === undefined) {
      logger.warn(
        { resetTokenId: String(resetToken.id), userId: String(user.id) },
        "Password reset succeeded but reset token was not marked used",
      );
    }

    return success({ status: "success" });
  },

  async sendPasswordResetEmailInBackground(
    userId: bigint,
    reason: "manual request",
  ): Promise<void> {
    try {
      const result = await this.sendPasswordResetEmail(userId);
      if (!result.ok) {
        logger.warn(
          { userId: String(userId), reason: result.message, trigger: reason },
          "Failed to send password reset email in background",
        );
      }
    } catch (err) {
      logger.error(
        { err, userId: String(userId), trigger: reason },
        "Unexpected error while sending password reset email in background",
      );
    }
  },
};
