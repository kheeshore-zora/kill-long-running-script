"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const os = __importStar(require("os"));
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
            let processes = [];
            const platform = os.platform();
            if (platform === 'linux') {
                // Linux supports 'etimes' (seconds) natively
                const { stdout } = yield execPromise(`ps -eo pid,etimes,args --sort=-etimes`);
                processes = stdout.trim().split('\n').slice(1);
            }
            else if (platform === 'darwin') {
                // macOS (BSD) uses 'etime' (formatted string) and 'command'
                const { stdout } = yield execPromise(`ps -eo pid,etime,command`);
                processes = stdout.trim().split('\n').slice(1);
            }
            else {
                throw new Error(`Unsupported platform: ${platform}. Only Linux and macOS are supported.`);
            }
            let killedCount = 0;
            for (const line of processes) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[0];
                let elapsedSeconds = 0;
                let command = '';
                if (platform === 'linux') {
                    elapsedSeconds = parseInt(parts[1], 10);
                    command = parts.slice(2).join(' ');
                }
                else if (platform === 'darwin') {
                    const timeStr = parts[1];
                    elapsedSeconds = parseTime(timeStr);
                    command = parts.slice(2).join(' ');
                }
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
// Helper to parse BSD time format: [[dd-]hh:]mm:ss
function parseTime(timeStr) {
    let days = 0;
    let time = timeStr;
    if (timeStr.includes('-')) {
        const parts = timeStr.split('-');
        days = parseInt(parts[0], 10);
        time = parts[1];
    }
    const parts = time.split(':').map(p => parseInt(p, 10));
    let seconds = 0;
    if (parts.length === 3) {
        // hh:mm:ss
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    else if (parts.length === 2) {
        // mm:ss
        seconds = parts[0] * 60 + parts[1];
    }
    return seconds + (days * 86400);
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
