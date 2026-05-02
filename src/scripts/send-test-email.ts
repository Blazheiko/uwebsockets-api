import "dotenv/config";
import process from "node:process";
import { emailService } from "#app/services/email-service.js";

const recipient = process.argv[2]?.trim() ?? "";
const subject = process.argv[3]?.trim() ?? "ITVibe Party test email";

if (recipient === "") {
  console.error(
    "Usage: pnpm --filter backend mail:test <recipient@example.com> [subject]",
  );
  process.exit(1);
}

const result = await emailService.send({
  to: recipient,
  subject,
  text: "SMTP is configured and email delivery from backend works.",
  html: "<p>SMTP is configured and email delivery from backend works.</p>",
});

if (!result.ok) {
  console.error(`Failed to send test email: ${result.message}`);
  process.exit(1);
}

console.log(
  `Email sent successfully. Message ID: ${result.data.messageId}. Accepted recipients: ${result.data.accepted.join(", ")}`,
);
