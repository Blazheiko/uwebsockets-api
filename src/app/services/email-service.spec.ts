import { afterEach, describe, expect, it, vi } from "vitest";

const createTransportMock = vi.fn();
const sendMailMock = vi.fn();
const originalEnv = { ...process.env };

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnv);
}

async function loadEmailService() {
  return import("./email-service.js");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  restoreEnv();
});

function configureSmtpEnv(): void {
  process.env["SMTP_ENABLED"] = "true";
  process.env["SMTP_HOST"] = "smtp.example.com";
  process.env["SMTP_PORT"] = "2525";
  process.env["SMTP_SECURE"] = "true";
  process.env["SMTP_REQUIRE_TLS"] = "false";
  process.env["SMTP_USER"] = "mailer";
  process.env["SMTP_PASSWORD"] = "secret";
  process.env["SMTP_FROM_EMAIL"] = "noreply@example.com";
  process.env["SMTP_FROM_NAME"] = "ITVibe Party";
  process.env["SMTP_REPLY_TO"] = "support@example.com";
}

describe("emailService", () => {
  it("reports configuration readiness", async () => {
    let module = await loadEmailService();
    expect(module.emailService.isConfigured()).toBe(false);

    vi.resetModules();
    restoreEnv();
    configureSmtpEnv();

    module = await loadEmailService();
    expect(module.emailService.isConfigured()).toBe(true);
  });

  it("returns configuration error when SMTP is disabled", async () => {
    const { emailService } = await loadEmailService();

    const result = await emailService.send({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected failure");
    }

    expect(result.code).toBe("INTERNAL");
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("validates content before sending", async () => {
    process.env["SMTP_ENABLED"] = "true";
    process.env["SMTP_HOST"] = "smtp.example.com";
    process.env["SMTP_FROM_EMAIL"] = "noreply@example.com";

    const { emailService } = await loadEmailService();
    const result = await emailService.send({
      to: "user@example.com",
      subject: "Test",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected failure");
    }

    expect(result.code).toBe("BAD_REQUEST");
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("validates recipient list after normalization", async () => {
    configureSmtpEnv();

    const { emailService } = await loadEmailService();
    const result = await emailService.send({
      to: [" ", { email: "   " }],
      subject: "Test",
      text: "Hello",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected failure");
    }

    expect(result.code).toBe("BAD_REQUEST");
    expect(result.message).toBe("At least one recipient is required");
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("sends email through nodemailer with configured defaults", async () => {
    configureSmtpEnv();

    sendMailMock.mockResolvedValue({
      messageId: "message-id",
      accepted: ["user@example.com"],
      rejected: [],
      response: "250 OK",
    });

    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
    });

    const { emailService } = await loadEmailService();
    const result = await emailService.send({
      to: "user@example.com",
      subject: "Welcome",
      html: "<p>Hello</p>",
    });

    expect(createTransportMock).toHaveBeenCalledWith({
      auth: {
        user: "mailer",
        pass: "secret",
      },
      host: "smtp.example.com",
      port: 2525,
      secure: true,
    });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: "ITVibe Party <noreply@example.com>",
      html: "<p>Hello</p>",
      replyTo: "support@example.com",
      subject: "Welcome",
      to: ["user@example.com"],
    });
    expect(result).toEqual({
      ok: true,
      data: {
        messageId: "message-id",
        accepted: ["user@example.com"],
        rejected: [],
        response: "250 OK",
      },
    });
  });

  it("passes cc, bcc and explicit replyTo", async () => {
    configureSmtpEnv();

    sendMailMock.mockResolvedValue({
      messageId: "message-id",
      accepted: ["user@example.com"],
      rejected: [],
      response: "250 OK",
    });

    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
    });

    const { emailService } = await loadEmailService();
    await emailService.send({
      to: "user@example.com",
      cc: ["copy@example.com", { email: "copy2@example.com", name: "Copy Two" }],
      bcc: [{ email: "hidden@example.com", name: "Hidden User" }],
      replyTo: { email: "reply@example.com", name: "Reply Team" },
      subject: "Welcome",
      text: "Hello",
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      bcc: ["Hidden User <hidden@example.com>"],
      cc: ["copy@example.com", "Copy Two <copy2@example.com>"],
      from: "ITVibe Party <noreply@example.com>",
      replyTo: ["Reply Team <reply@example.com>"],
      subject: "Welcome",
      text: "Hello",
      to: ["user@example.com"],
    });
  });

  it("returns internal failure when provider send rejects", async () => {
    configureSmtpEnv();

    sendMailMock.mockRejectedValue(new Error("SMTP failure"));
    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
    });

    const { emailService } = await loadEmailService();
    const result = await emailService.send({
      to: "user@example.com",
      subject: "Welcome",
      text: "Hello",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected failure");
    }

    expect(result.code).toBe("INTERNAL");
    expect(result.message).toBe("Failed to send email");
  });
});
