#!/usr/bin/env node
import "dotenv/config";
import { App, LogLevel } from "@slack/bolt";
import { config } from "./config";
import { registerMentionHandler } from "./handlers/mention";
import { registerMessageHandler } from "./handlers/message";
import { registerSlashHandler } from "./handlers/slash";
import { registerModeHandler } from "./handlers/mode";
import { registerHomeHandlers } from "./handlers/home";

const logLevelMap: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

const app = new App({
  token: config.SLACK_BOT_TOKEN,
  signingSecret: config.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: config.SLACK_APP_TOKEN,
  logLevel: logLevelMap[config.LOG_LEVEL] ?? LogLevel.INFO,
});

registerMentionHandler(app);
registerMessageHandler(app);
registerSlashHandler(app);
registerModeHandler(app);
registerHomeHandlers(app);

(async () => {
  await app.start(config.PORT);
  console.log(`⚡ ${config.IRISBOT_NAME} is running (Socket Mode, port ${config.PORT})`);
})().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
