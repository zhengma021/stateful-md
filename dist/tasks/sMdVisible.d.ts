import { TaskArgs, ServerConfig } from "../types";
export declare class SMdVisibleTask {
    private app;
    private server;
    private config;
    private visibilityChecker;
    private markdownProcessor;
    constructor(taskArgs: TaskArgs);
    private setupMiddleware;
    private setupRoutes;
    start(): Promise<void>;
    stop(): Promise<void>;
    getConfig(): ServerConfig;
}
export declare function checkSMdVisibleCheckingUrlArgument(checkingUrl: string): Promise<boolean>;
export declare function runSMdVisibleTask(taskArgs: TaskArgs): Promise<void>;
export declare function setupStatefulMdTask(taskName: string, taskArgs: TaskArgs): Promise<string>;
//# sourceMappingURL=sMdVisible.d.ts.map