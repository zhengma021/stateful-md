import { MarkdownContent } from "../types";
export declare class MarkdownProcessor {
    private md;
    constructor();
    loadMarkdownFile(filePath: string): Promise<string>;
    renderMarkdown(content: string): string;
    getMarkdownContent(filePath: string, sharingName: string): Promise<MarkdownContent>;
    private isValidSharingName;
    createProtectedMarkdownPage(content: string, sharingName: string, checkingUrl: string): string;
}
export declare function loadMarkdownFile(filePath: string): Promise<string>;
export declare function renderMarkdown(content: string): string;
export declare function getMarkdownContent(filePath: string, sharingName: string): Promise<MarkdownContent>;
export declare function createProtectedMarkdownPage(content: string, sharingName: string, checkingUrl: string): string;
//# sourceMappingURL=markdown.d.ts.map