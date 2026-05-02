import { env } from "node:process";

function parseBoolean(
  value: string | undefined,
  defaultValue = false,
): boolean {
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function parsePort(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const port = Number(value);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    return defaultValue;
  }
  return port;
}

const mailConfig = Object.freeze({
  enabled: parseBoolean(env["SMTP_ENABLED"], false),
  host: env["SMTP_HOST"] ?? "",
  port: parsePort(env["SMTP_PORT"], 587),
  secure: parseBoolean(env["SMTP_SECURE"], false),
  requireTls: parseBoolean(env["SMTP_REQUIRE_TLS"], true),
  ignoreTls: parseBoolean(env["SMTP_IGNORE_TLS"], false),
  user: env["SMTP_USER"] ?? "",
  password: env["SMTP_PASSWORD"] ?? "",
  fromEmail: env["SMTP_FROM_EMAIL"] ?? "",
  fromName: env["SMTP_FROM_NAME"] ?? "",
  replyTo: env["SMTP_REPLY_TO"] ?? "",
});

export default mailConfig;
