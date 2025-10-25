export declare class VisibilityChecker {
    private checkingUrl;
    private intervalId;
    private callbacks;
    constructor(checkingUrl: string);
    sMdContentVisible(): Promise<boolean>;
    startPeriodicCheck(): void;
    stopPeriodicCheck(): void;
    onVisibilityChange(callback: (visible: boolean) => void): void;
    removeVisibilityCallback(callback: (visible: boolean) => void): void;
    private notifyCallbacks;
    static sharingNameToCheckingUrl(domain: string, sharingName: string): string;
    static checkSMdVisibleCheckingUrlArgument(checkingUrl: string): Promise<boolean>;
}
export declare function sMdContentVisible(checkingUrl: string): Promise<boolean>;
export declare function sharingNameToCheckingUrl(sharingName: string): string;
export declare function checkSMdVisibleCheckingUrlArgument(checkingUrl: string): Promise<boolean>;
//# sourceMappingURL=visibility.d.ts.map