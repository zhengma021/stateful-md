import { TaskArgs, TaskName } from "./types";
export declare class CLI {
    private program;
    constructor();
    private setupCommands;
    private validateAndParseArgs;
    private isValidSharingName;
    private isValidUrl;
    private validateCheckingUrl;
    parse(argv?: string[]): Promise<void>;
    determineUserChoosedTask(): [TaskName, any];
}
export declare function determineTheUserChoosedTask(): [TaskName, TaskArgs];
//# sourceMappingURL=cli.d.ts.map