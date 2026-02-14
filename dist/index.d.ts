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
export declare function killLongRunningScript(options: KillOptions): Promise<void>;
export {};
