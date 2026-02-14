
import { killLongRunningScript } from './index';
import { spawn } from 'child_process';

async function runTest() {
  console.log('--- STARTING TEST ---');

  // 1. Start a dummy long-running process
  const dummyProcess = spawn('sleep', ['100']);
  const pid = dummyProcess.pid;
  
  if (!pid) {
      console.error('Failed to start dummy process');
      process.exit(1);
  }

  console.log(`Started dummy process (sleep 100) with PID: ${pid}`);

  // 2. Wait a second to let it establish
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 3. Try to kill it with a 0s timeout (should kill immediately)
  // We search for "sleep" which is the command name
  try {
      console.log('Attempting to kill...');
      await killLongRunningScript({
          scriptName: 'sleep',
          maxDurationSeconds: 0, // Should kill immediately
          dryRun: false
      });
  } catch (err) {
      console.error('Error running kill script:', err);
  }

  // 4. Verify if it's dead
  try {
      process.kill(pid, 0); // Check if process exists
      console.error(`[FAIL] Process ${pid} is still alive!`);
      process.kill(pid, 'SIGKILL'); // Cleanup
      process.exit(1);
  } catch (e) {
      console.log(`[PASS] Process ${pid} is successfully gone.`);
      process.exit(0);
  }
}

runTest();
