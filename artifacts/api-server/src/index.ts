import app from "./app";
import { logger } from "./lib/logger";
import { connectMongoDB } from "./lib/mongodb";
import { startDiscordBot } from "./lib/discordBot";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Connect to MongoDB and start Discord bot before listening
async function main() {
  try {
    await connectMongoDB();
    logger.info("MongoDB connected");
  } catch (err) {
    logger.error({ err }, "Failed to connect to MongoDB — continuing without DB");
  }

  // Start Discord bot (non-blocking)
  startDiscordBot().catch((err) => {
    logger.error({ err }, "Discord bot startup failed");
  });

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
