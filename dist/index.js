"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.killLongRunningScript = killLongRunningScript;
const child_process_1 = require("child_process");
const util_1 = require("util");
const node_fetch_1 = __importDefault(require("node-fetch"));
const execPromise = (0, util_1.promisify)(child_process_1.exec);
/**
 * Finds and kills a process if it has been running longer than the specified duration.
 * @param options Configuration options
 */
function killLongRunningScript(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { scriptName, maxDurationSeconds, slackWebhookUrl, dryRun = false } = options;
        if (!scriptName) {
            throw new Error('Script name is required.');
        }
        try {
            // List processes with their elapsed time (etimes) and command arguments
            // etimes is elapsed time in seconds
            const { stdout } = yield execPromise(`ps -eo pid,etimes,args --sort=-etimes`);
            const lines = stdout.trim().split('\n');
            const processes = lines.slice(1); // Skip header
            let killedCount = 0;
            for (const line of processes) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[0];
                const elapsedSeconds = parseInt(parts[1], 10);
                const command = parts.slice(2).join(' ');
                // Check if matches target script and avoid killing self
                if (command.includes(scriptName) && !command.includes('kill-long-running-script')) {
                    if (elapsedSeconds > maxDurationSeconds) {
                        console.log(`[Target Found] PID: ${pid}, Duration: ${elapsedSeconds}s, Command: ${command}`);
                        if (!dryRun) {
                            try {
                                yield execPromise(`kill -9 ${pid}`);
                                console.log(`[KILLED] Process ${pid} terminated.`);
                                killedCount++;
                                if (slackWebhookUrl) {
                                    yield sendSlackNotification(slackWebhookUrl, scriptName, pid, elapsedSeconds, command);
                                }
                            }
                            catch (killErr) {
                                console.error(`[ERROR] Failed to kill process ${pid}: ${killErr.message}`);
                            }
                        }
                        else {
                            console.log(`[DRY RUN] Would kill process ${pid}.`);
                        }
                    }
                }
            }
            if (killedCount === 0 && !dryRun) {
                // console.log(`No long-running processes found for script: "${scriptName}" exceeding ${maxDurationSeconds}s.`);
            }
        }
        catch (err) {
            console.error(`[FATAL] Error listing processes: ${err.message}`);
            throw err;
        }
    });
}
function sendSlackNotification(webhookUrl, scriptName, pid, duration, command) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const message = {
                text: `🚨 *Process Killed* 🚨\n\n*Script:* \`${scriptName}\`\n*PID:* ${pid}\n*Duration:* ${duration}s\n*Command:* \`${command}\``
            };
            yield (0, node_fetch_1.default)(webhookUrl, {
                method: 'POST',
                body: JSON.stringify(message),
                headers: { 'Content-Type': 'application/json' }
            });
            console.log(`[NOTIFY] Slack notification sent.`);
        }
        catch (err) {
            console.error(`[ERROR] Failed to send Slack notification: ${err.message}`);
        }
    });
}
