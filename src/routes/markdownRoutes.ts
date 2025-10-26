import { Request, Response, Router } from "express";
import { MarkdownProcessor } from "../utils/markdown";
import { VisibilityChecker } from "../utils/visibility";
import { ServerConfig } from "../types";

export class MarkdownRoutes {
  private router: Router;
  private config: ServerConfig;
  private markdownProcessor: MarkdownProcessor;
  private visibilityChecker: VisibilityChecker;

  constructor(config: ServerConfig) {
    this.router = Router();
    this.config = config;
    this.markdownProcessor = new MarkdownProcessor();
    this.visibilityChecker = new VisibilityChecker(config.checkingUrl);
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Main route for accessing markdown content
    this.router.get(
      "/stateful-md/:sharingName",
      this.handleMarkdownAccess.bind(this),
    );

    // Health check route
    this.router.get("/health", this.handleHealthCheck.bind(this));

    // Home route
    this.router.get("/", this.handleHome.bind(this));
  }

  /**
   * Handle markdown content access
   */
  private async handleMarkdownAccess(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { sharingName } = req.params;

      // Decode URL-encoded sharing name to handle Chinese characters properly
      const decodedSharingName = decodeURIComponent(sharingName);
      const configSharingName = this.config.sharingName;

      // Check if this is the correct sharing name
      if (decodedSharingName !== configSharingName) {
        this.accessTheNotFoundPage(res);
        return;
      }

      // Check visibility first
      const isVisible =
        await this.whenUserAccessTheMdVisiblePage(decodedSharingName);

      if (isVisible) {
        await this.accessTheStatefulSharingMd(decodedSharingName, res);
      } else {
        this.accessTheNotFoundPage(res);
      }
    } catch (error) {
      console.error("Error handling markdown access:", error);
      this.accessTheNotFoundPage(res);
    }
  }

  /**
   * Check visibility and return appropriate response
   */
  private async whenUserAccessTheMdVisiblePage(
    sharingName: string,
  ): Promise<boolean> {
    try {
      const visible = await this.visibilityChecker.sMdContentVisible();
      return visible;
    } catch (error) {
      console.error("Error checking visibility:", error);
      // If request fails or times out, treat as content not visible
      return false;
    }
  }

  /**
   * Serve the stateful sharing markdown content
   */
  private async accessTheStatefulSharingMd(
    sharingName: string,
    res: Response,
  ): Promise<void> {
    try {
      // Load markdown content
      const markdownContent = await this.markdownProcessor.loadMarkdownFile(
        this.config.markdownFile,
      );

      // Create protected HTML page
      const htmlContent = this.markdownProcessor.createProtectedMarkdownPage(
        markdownContent,
        sharingName,
        this.config.checkingUrl,
      );

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // Security headers
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      res.setHeader("Referrer-Policy", "no-referrer");

      // Ensure proper UTF-8 encoding for Chinese content
      res.setHeader("Accept-Charset", "utf-8");

      res.status(200).send(htmlContent);
    } catch (error) {
      console.error("Error serving markdown content:", error);
      // If any error occurs (file loading, content creation, etc.), redirect to not-found
      this.accessTheNotFoundPage(res);
    }
  }

  /**
   * Return a not found page
   */
  private accessTheNotFoundPage(res: Response): void {
    const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Content Not Found - Stateful Markdown</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft YaHei', '微软雅黑', 'SimSun', '宋体', sans-serif;
            line-height: 1.8;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }

        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }

        .error-icon {
            font-size: 64px;
            color: #e74c3c;
            margin-bottom: 20px;
        }

        h1 {
            color: #2c3e50;
            margin-bottom: 20px;
        }

        p {
            color: #666;
            margin-bottom: 20px;
            font-size: 16px;
        }

        .home-link {
            display: inline-block;
            background: #3498db;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 4px;
            transition: background 0.3s;
        }

        .home-link:hover {
            background: #2980b9;
        }

        .details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 4px;
            margin-top: 30px;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">📄</div>
        <h1>Content Not Found</h1>
        <p>The requested markdown content is not currently available or visible.</p>
        <p>请求的 Markdown 内容当前不可用或不可见。</p>
        <p>This could happen if / 可能的原因：</p>
        <ul style="text-align: left; margin: 20px 0;">
            <li>The sharing name is incorrect or expired / 分享名称错误或已过期</li>
            <li>Content has been disabled by the owner / 内容已被所有者禁用</li>
            <li>There's a temporary access restriction / 存在临时访问限制</li>
        </ul>
        <a href="/" class="home-link">← Back to Home</a>

        <div class="details">
            <strong>Stateful Markdown</strong><br>
            Dynamic content sharing with visibility control
        </div>
    </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(404).send(notFoundHtml);
  }

  /**
   * Handle home page
   */
  private handleHome(req: Request, res: Response): void {
    const homeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Stateful Markdown Server</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft YaHei', '微软雅黑', 'SimSun', '宋体', sans-serif;
            line-height: 1.8;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }

        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header {
            text-align: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 30px;
            margin-bottom: 30px;
        }

        .logo {
            font-size: 48px;
            margin-bottom: 20px;
        }

        h1 {
            color: #2c3e50;
            margin-bottom: 10px;
        }

        .subtitle {
            color: #666;
            font-size: 18px;
        }

        .info-section {
            margin-bottom: 30px;
        }

        .info-section h2 {
            color: #34495e;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }

        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }

        .status-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #3498db;
        }

        .status-card h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }

        .status-card p {
            margin: 0;
            color: #666;
            font-size: 14px;
        }

        .access-link {
            display: inline-block;
            background: #3498db;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 4px;
            margin-top: 20px;
            transition: background 0.3s;
        }

        .access-link:hover {
            background: #2980b9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📚</div>
            <h1>Stateful Markdown Server</h1>
            <p class="subtitle">Dynamic content sharing with visibility control</p>
        </div>

        <div class="info-section">
            <h2>Server Information</h2>
            <div class="status-grid">
                <div class="status-card">
                    <h3>🟢 Server Status</h3>
                    <p>Running on port ${this.config.port}</p>
                </div>
                <div class="status-card">
                    <h3>📝 Content</h3>
                    <p>Sharing: ${this.config.sharingName}</p>
                </div>
                <div class="status-card">
                    <h3>🔍 Visibility Check</h3>
                    <p>Monitoring: ${new URL(this.config.checkingUrl).hostname}</p>
                </div>
                <div class="status-card">
                    <h3>📄 Source File</h3>
                    <p>${this.config.markdownFile.split("/").pop()}</p>
                </div>
            </div>
        </div>

        <div class="info-section">
            <h2>About / 关于</h2>
            <p>This server hosts markdown content with dynamic visibility control. The content is only accessible when the external visibility check returns a positive status.</p>
            <p>本服务器托管具有动态可见性控制的 Markdown 内容。只有在外部可见性检查返回正面状态时，内容才可访问。</p>
            <p><strong>Features / 功能特性：</strong></p>
            <ul>
                <li>Real-time visibility checking / 实时可见性检查</li>
                <li>Copy protection mechanisms / 复制保护机制</li>
                <li>Secure content delivery / 安全内容传输</li>
                <li>JavaScript-based access control / 基于 JavaScript 的访问控制</li>
                <li>Chinese content support / 中文内容支持</li>
            </ul>
        </div>

        <div style="text-align: center;">
            <a href="/stateful-md/${encodeURIComponent(this.config.sharingName)}" class="access-link">
                Access Shared Content / 访问共享内容 →
            </a>
        </div>
    </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(homeHtml);
  }

  /**
   * Handle health check
   */
  private handleHealthCheck(req: Request, res: Response): void {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      config: {
        sharingName: this.config.sharingName,
        checkingUrl: this.config.checkingUrl,
        port: this.config.port,
      },
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}

/**
 * Standalone functions for compatibility with Clojure spec
 */
export function accessTheNotFoundPage(): string {
  // Returns HTML content for not found page
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Not Found</title>
</head>
<body>
    <h1>Content Not Found</h1>
    <p>The requested markdown content is not found.</p>
    <p><a href="/">← Back to Home</a></p>
</body>
</html>`;
}

export function setMdContentOnTheRoute(sharingName: string): void {
  // This function is handled by the route setup in the constructor
  console.log(`Setting up route for sharing name: ${sharingName}`);
}
