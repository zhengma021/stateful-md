import { Router } from 'express';
import { ServerConfig } from '../types';
export declare class MarkdownRoutes {
    private router;
    private config;
    private markdownProcessor;
    private visibilityChecker;
    constructor(config: ServerConfig);
    private setupRoutes;
    private handleMarkdownAccess;
    private whenUserAccessTheMdVisiblePage;
    private accessTheStatefulSharingMd;
    private accessTheNotFoundPage;
    private handleHome;
    private handleHealthCheck;
    getRouter(): Router;
}
export declare function accessTheNotFoundPage(): string;
export declare function setMdContentOnTheRoute(sharingName: string): void;
//# sourceMappingURL=markdownRoutes.d.ts.map