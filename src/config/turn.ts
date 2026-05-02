import { env } from "node:process";

interface TurnConfig {
  secret: string;
  host: string;
  ttlSeconds: number;
}

const config: TurnConfig = Object.freeze({
  secret: env["TURN_SECRET"] ?? "",
  host: env["TURN_HOST"] ?? "",
  ttlSeconds: 3600,
});

export default config;
