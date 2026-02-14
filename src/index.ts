import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import * as os from 'os';

const execPromise = promisify(exec);

interface KillOptions {
  scriptName: string;
  maxDurationSeconds: number;
  slackWebhookUrl?: string;
  dryRun?: boolean;
}

/**
 * Finds and kills a process if it has been running longer than the specified duration.
 * @param options Configuration options
 */
export async function killLongRunningScript(options: KillOptions): Promise<void> {
  const { scriptName, maxDurationSeconds, slackWebhookUrl, dryRun = false } = options;

  if (!scriptName) {
    throw new Error('Script name is required.');
  }

  try {
    let processes: string[] = [];
    const platform = os.platform();

    if (platform === 'linux') {
       // Linux supports 'etimes' (seconds) natively
       const { stdout } = await execPromise(`ps -eo pid,etimes,args --sort=-etimes`);
       processes = stdout.trim().split('\n').slice(1);
    } else if (platform === 'darwin') {
       // macOS (BSD) uses 'etime' (formatted string) and 'command'
       const { stdout } = await execPromise(`ps -eo pid,etime,command`);
       processes = stdout.trim().split('\n').slice(1);
    } else {
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
      } else if (platform === 'darwin') {
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
              await execPromise(`kill -9 ${pid}`);
              console.log(`[KILLED] Process ${pid} terminated.`);
              killedCount++;
              
              if (slackWebhookUrl) {
                  await sendSlackNotification(slackWebhookUrl, scriptName, pid, elapsedSeconds, command);
              }
            } catch (killErr: any) {
              console.error(`[ERROR] Failed to kill process ${pid}: ${killErr.message}`);
            }
          } else {
             console.log(`[DRY RUN] Would kill process ${pid}.`);
          }
        }
      }
    }

    if (killedCount === 0 && !dryRun) {
       // console.log(`No long-running processes found for script: "${scriptName}" exceeding ${maxDurationSeconds}s.`);
    }

  } catch (err: any) {
    console.error(`[FATAL] Error listing processes: ${err.message}`);
    throw err;
  }
}

// Helper to parse BSD time format: [[dd-]hh:]mm:ss
function parseTime(timeStr: string): number {
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
    } else if (parts.length === 2) {
        // mm:ss
        seconds = parts[0] * 60 + parts[1];
    }

    return seconds + (days * 86400);
}


async function sendSlackNotification(webhookUrl: string, scriptName: string, pid: string, duration: number, command: string) {
    try {
        const message = {
            text: `🚨 *Process Killed* 🚨\n\n*Script:* \`${scriptName}\`\n*PID:* ${pid}\n*Duration:* ${duration}s\n*Command:* \`${command}\``
        };

        await fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify(message),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log(`[NOTIFY] Slack notification sent.`);
    } catch (err: any) {
        console.error(`[ERROR] Failed to send Slack notification: ${err.message}`);
    }
}
