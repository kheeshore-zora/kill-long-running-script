import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

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
    // List processes with their elapsed time (etimes) and command arguments
    // etimes is elapsed time in seconds
    const { stdout } = await execPromise(`ps -eo pid,etimes,args --sort=-etimes`);
    
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
