# kill-long-running-script

A lightweight CLI tool and Node.js library to detect and kill processes running longer than a specified duration. Useful for cleaning up stuck scripts, cron jobs, or development servers that refuse to die.

## Features

*   **Process Detection:** Finds processes by command name or substring.
*   **Duration-Based Killing:** Specify max runtime in simple formats (e.g., `1h`, `30m`, `45s`).
*   **Slack Notifications:** Optionally send alerts to a Slack channel when a process is killed.
*   **Dry Run Mode:** Preview what *would* be killed without actually doing it.
*   **Safety:** Automatically prevents killing itself.

## Usage (CLI)

Run directly via `npx`:

```bash
# Kill 'backup.sh' if running longer than 1 hour
npx kill-long-running-script --script "backup.sh" --timeout 1h

# Dry run: See what would happen without killing
npx kill-long-running-script --script "node server.js" --timeout 30m --dry-run

# Notify Slack when a process is killed
npx kill-long-running-script \
  --script "sync-job" \
  --timeout 2h \
  --slack-webhook-url "https://hooks.slack.com/services/..."
```

### Options

| Option | Description | Required | Example |
| :--- | :--- | :---: | :--- |
| `--script` | Name or substring of the command to match. | Yes | `"backup.sh"` |
| `--timeout` | Max allowed duration string. | Yes | `30m`, `2h`, `120s` |
| `--slack-webhook-url`| Send a formatted alert to Slack if killed. | No | `https://hooks...` |
| `--dry-run` | Log detected processes but do not kill. | No | Flag |

## Usage (Library)

Install in your project:

```bash
npm install kill-long-running-script
```

Import and use in your TypeScript/Node code:

```typescript
import { killLongRunningScript } from 'kill-long-running-script';

killLongRunningScript({
  scriptName: 'my-worker.js',
  maxDurationSeconds: 3600, // 1 hour
  dryRun: false,
  slackWebhookUrl: process.env.SLACK_WEBHOOK
})
  .then(() => console.log('Cleanup complete'))
  .catch(err => console.error('Error during cleanup:', err));
```

## Contributing

Pull requests are welcome!

## License

ISC
