#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const minimist_1 = __importDefault(require("minimist"));
const ms_1 = __importDefault(require("ms"));
const index_1 = require("./index");
const argv = (0, minimist_1.default)(process.argv.slice(2));
if (argv.help || argv.h || (!argv.script && !argv.timeout)) {
    console.log(`
Usage:
  npx kill-long-running-script --script <name> --timeout <duration> [--slack-webhook-url <url>] [--dry-run]

Options:
  --script              Name or substring of the script/command to match (required)
  --timeout             Max duration (e.g. 10s, 60m, 2h) (required)
  --slack-webhook-url   Optional Slack Webhook URL for notification upon kill
  --dry-run             Log what would be killed without actually killing it
  -h, --help            Show this help message

Example:
  npx kill-long-running-script --script "backup.sh" --timeout 1h
  `);
    process.exit(0);
}
const scriptName = argv.script;
const timeoutStr = argv.timeout;
const slackWebhookUrl = argv['slack-webhook-url'];
const dryRun = argv['dry-run'];
if (!scriptName) {
    console.error("Error: --script argument is required.");
    process.exit(1);
}
if (!timeoutStr) {
    console.error("Error: --timeout argument is required (e.g. 10s, 30m).");
    process.exit(1);
}
// Cast to any to bypass strict type checking for the ms library input which can be tricky
const timeoutMs = (0, ms_1.default)(String(timeoutStr));
if (timeoutMs === undefined || isNaN(timeoutMs)) {
    console.error(`Error: Invalid timeout format "${timeoutStr}". Use format like 10s, 5m, 2h.`);
    process.exit(1);
}
const maxDurationSeconds = Math.floor(timeoutMs / 1000);
(0, index_1.killLongRunningScript)({
    scriptName,
    maxDurationSeconds,
    slackWebhookUrl,
    dryRun
});
