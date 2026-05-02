import { afterEach, describe, expect, it, vi } from "vitest";

const userRepositoryMock = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
};

const passwordResetRepositoryMock = {
  create: vi.fn(),
  findByTokenHash: vi.fn(),
  invalidatePendingByUserId: vi.fn(),
  markUsed: vi.fn(),
};

const emailServiceMock = {
  send: vi.fn(),
};

const destroyAllSessionsMock = vi.fn();
const hashPasswordMock = vi.fn();
const nanoidMock = vi.fn(() => "new-session-token");
const loggerMock = {
  warn: vi.fn(),
  error: vi.fn(),
};

const originalEnv = { ...process.env };

vi.mock("#app/repositories/index.js", () => ({
  userRepository: userRepositoryMock,
  passwordResetRepository: passwordResetRepositoryMock,
}));

vi.mock("#app/services/email-service.js", () => ({
  emailService: emailServiceMock,
}));

vi.mock("#vendor/utils/session/redis-session-storage.js", () => ({
  destroyAllSessions: destroyAllSessionsMock,
}));

vi.mock("metautil", () => ({
  hashPassword: hashPasswordMock,
}));

vi.mock("nanoid", () => ({
  nanoid: nanoidMock,
}));

vi.mock("#logger", () => ({
  default: loggerMock,
}));

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnv);
}

async function loadPasswordResetService() {
  process.env["FRONTEND_URL"] = "https://app.example.com";
  process.env["APP_URL"] = "https://app.example.com";
  return import("./password-reset-service.js");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  restoreEnv();
});

describe("passwordResetService", () => {
  it("returns generic success for unknown email", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(undefined);

    const { passwordResetService } = await loadPasswordResetService();
    const result = await passwordResetService.requestPasswordReset("missing@example.com");

    expect(result).toEqual({
      ok: true,
      data: {
        message: "If an account with that email exists, a reset link will be sent shortly.",
      },
    });
    expect(userRepositoryMock.findByEmail).toHaveBeenCalledWith("missing@example.com");
  });

  it("queues background reset email for known email", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue({
      id: 7n,
    });

    const { passwordResetService } = await loadPasswordResetService();
    const backgroundSpy = vi
      .spyOn(passwordResetService, "sendPasswordResetEmailInBackground")
      .mockResolvedValue();

    const result = await passwordResetService.requestPasswordReset("User@example.com");

    expect(result.ok).toBe(true);
    expect(userRepositoryMock.findByEmail).toHaveBeenCalledWith("user@example.com");
    expect(backgroundSpy).toHaveBeenCalledWith(7n, "manual request");
  });

  it("creates a token and sends email", async () => {
    userRepositoryMock.findById.mockResolvedValue({
      id: 7n,
      name: "Jane",
      email: "jane@example.com",
    });
    passwordResetRepositoryMock.invalidatePendingByUserId.mockResolvedValue(1);
    passwordResetRepositoryMock.create.mockImplementation(async (data: {
      userId: bigint;
      tokenHash: string;
      expiresAt: Date;
    }) => ({
      id: 11n,
      usedAt: null,
      createdAt: new Date(),
      ...data,
    }));
    emailServiceMock.send.mockResolvedValue({
      ok: true,
      data: {
        accepted: ["jane@example.com"],
        messageId: "message-id",
        rejected: [],
        response: "250 OK",
      },
    });

    const { passwordResetService } = await loadPasswordResetService();
    const result = await passwordResetService.sendPasswordResetEmail(7n);

    expect(result.ok).toBe(true);
    expect(passwordResetRepositoryMock.invalidatePendingByUserId).toHaveBeenCalledWith(7n);
    expect(passwordResetRepositoryMock.create).toHaveBeenCalledTimes(1);

    const createArg = passwordResetRepositoryMock.create.mock.calls[0]?.[0];
    expect(createArg.userId).toBe(7n);
    expect(createArg.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArg.expiresAt).toBeInstanceOf(Date);

    expect(emailServiceMock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jane@example.com",
        subject: "Reset your password",
      }),
    );
  });

  it("rejects expired reset tokens", async () => {
    passwordResetRepositoryMock.findByTokenHash.mockResolvedValue({
      id: 11n,
      userId: 7n,
      tokenHash: "hash",
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      createdAt: new Date(),
    });
    passwordResetRepositoryMock.markUsed.mockResolvedValue({
      id: 11n,
    });

    const { passwordResetService } = await loadPasswordResetService();
    const result = await passwordResetService.resetPassword(
      "expired-token",
      "new-password",
      "new-password",
    );

    expect(result).toEqual({
      ok: false,
      code: "BAD_REQUEST",
      reason: "expired_token",
      message: "Password reset link has expired",
    });
    expect(passwordResetRepositoryMock.markUsed).toHaveBeenCalledWith(11n);
  });

  it("rejects already used reset tokens", async () => {
    passwordResetRepositoryMock.findByTokenHash.mockResolvedValue({
      id: 11n,
      userId: 7n,
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
      createdAt: new Date(),
    });

    const { passwordResetService } = await loadPasswordResetService();
    const result = await passwordResetService.resetPassword(
      "used-token",
      "new-password",
      "new-password",
    );

    expect(result).toEqual({
      ok: false,
      code: "BAD_REQUEST",
      reason: "used_token",
      message: "Password reset link has already been used",
    });
    expect(userRepositoryMock.findById).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", async () => {
    const { passwordResetService } = await loadPasswordResetService();
    const result = await passwordResetService.resetPassword(
      "valid-token",
      "new-password",
      "different-password",
    );

    expect(result).toEqual({
      ok: false,
      code: "BAD_REQUEST",
      reason: "passwords_mismatch",
      message: "Passwords do not match",
    });
    expect(passwordResetRepositoryMock.findByTokenHash).not.toHaveBeenCalled();
  });

  it("updates password, rotates session token, and clears redis sessions", async () => {
    passwordResetRepositoryMock.findByTokenHash.mockResolvedValue({
      id: 11n,
      userId: 7n,
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    });
    userRepositoryMock.findById.mockResolvedValue({
      id: 7n,
      sessionToken: "old-session-token",
    });
    hashPasswordMock.mockResolvedValue("hashed-password");
    destroyAllSessionsMock.mockResolvedValue(2);
    userRepositoryMock.update.mockResolvedValue({
      id: 7n,
      password: "hashed-password",
      sessionToken: "new-session-token",
    });
    passwordResetRepositoryMock.markUsed.mockResolvedValue({
      id: 11n,
      userId: 7n,
      usedAt: new Date(),
    });

    const { passwordResetService } = await loadPasswordResetService();
    const result = await passwordResetService.resetPassword(
      "valid-token",
      "new-password",
      "new-password",
    );

    expect(hashPasswordMock).toHaveBeenCalledWith("new-password");
    expect(destroyAllSessionsMock).toHaveBeenCalledWith("old-session-token");
    expect(userRepositoryMock.update).toHaveBeenCalledWith(7n, {
      password: "hashed-password",
      sessionToken: "new-session-token",
    });
    expect(passwordResetRepositoryMock.markUsed).toHaveBeenCalledWith(11n);
    expect(result).toEqual({
      ok: true,
      data: { status: "success" },
    });
  });
});
