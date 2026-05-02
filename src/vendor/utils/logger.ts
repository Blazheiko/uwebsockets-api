import { pino } from "pino";
import appConfig from "#config/app.js";

type BackendLogger = ReturnType<typeof pino>;

function createLogger(): BackendLogger {
  try {
    const baseConfig = {
      serializers: {
        bigint: (value: bigint): string => value.toString(),
      },
    };

    if (appConfig.env === "prod" || appConfig.env === "production") {
       
      return pino(baseConfig);
    }

     
    return pino({
      ...baseConfig,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });
  } catch (error) {
    console.error("CRITICAL ERROR: Failed to initialize logger:", error);
    console.error("Application cannot continue without proper logging.");
    console.error("Please check your pino configuration and dependencies.");
    console.error("Exiting application...");

    // Принудительно завершаем процесс
    process.exit(1);
  }
}

export default createLogger();
