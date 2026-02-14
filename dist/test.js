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
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const child_process_1 = require("child_process");
function runTest() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('--- STARTING TEST ---');
        // 1. Start a dummy long-running process
        const dummyProcess = (0, child_process_1.spawn)('sleep', ['100']);
        const pid = dummyProcess.pid;
        if (!pid) {
            console.error('Failed to start dummy process');
            process.exit(1);
        }
        console.log(`Started dummy process (sleep 100) with PID: ${pid}`);
        // 2. Wait a second to let it establish
        yield new Promise(resolve => setTimeout(resolve, 1000));
        // 3. Try to kill it with a 0s timeout (should kill immediately)
        // We search for "sleep" which is the command name
        try {
            console.log('Attempting to kill...');
            yield (0, index_1.killLongRunningScript)({
                scriptName: 'sleep',
                maxDurationSeconds: 0, // Should kill immediately
                dryRun: false
            });
        }
        catch (err) {
            console.error('Error running kill script:', err);
        }
        // 4. Verify if it's dead
        try {
            process.kill(pid, 0); // Check if process exists
            console.error(`[FAIL] Process ${pid} is still alive!`);
            process.kill(pid, 'SIGKILL'); // Cleanup
            process.exit(1);
        }
        catch (e) {
            console.log(`[PASS] Process ${pid} is successfully gone.`);
            process.exit(0);
        }
    });
}
runTest();
