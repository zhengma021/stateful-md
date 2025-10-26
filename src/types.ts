export interface TaskArgs {
  file: string;
  sharingName: string;
  checkingUrl: string;
  port: number;
  checkingUrlTimeoutSeconds?: number;
}

export interface VisibilityResponse {
  visible: boolean;
}

export interface MarkdownContent {
  content: string;
  sharingName: string;
  isValid: boolean;
}

export interface ServerConfig {
  port: number;
  markdownFile: string;
  sharingName: string;
  checkingUrl: string;
  checkingUrlTimeoutSeconds?: number;
}

export type TaskName = "s-md-visible";

export interface ServeoShareArgs {
  file: string;
  sharingName: string;
  taskPort: number;
  checkingPort: number;
  checkingUrlTimeoutSeconds?: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}
