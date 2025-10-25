"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownRoutes = void 0;
exports.accessTheNotFoundPage = accessTheNotFoundPage;
exports.setMdContentOnTheRoute = setMdContentOnTheRoute;
const express_1 = require("express");
const markdown_1 = require("../utils/markdown");
const visibility_1 = require("../utils/visibility");
class MarkdownRoutes {
    constructor(config) {
        this.router = (0, express_1.Router)();
        this.config = config;
        this.markdownProcessor = new markdown_1.MarkdownProcessor();
        this.visibilityChecker = new visibility_1.VisibilityChecker(config.checkingUrl);
        this.setupRoutes();
    }
    setupRoutes() {
        this.router.get('/stateful-md/:sharingName', this.handleMarkdownAccess.bind(this));
        this.router.get('/health', this.handleHealthCheck.bind(this));
        this.router.get('/', this.handleHome.bind(this));
    }
    async handleMarkdownAccess(req, res) {
        try {
            const { sharingName } = req.params;
            if (sharingName !== this.config.sharingName) {
                this.accessTheNotFoundPage(res);
                return;
            }
            const isVisible = await this.whenUserAccessTheMdVisiblePage(sharingName);
            if (isVisible) {
                await this.accessTheStatefulSharingMd(sharingName, res);
            }
            else {
                this.accessTheNotFoundPage(res);
            }
        }
        catch (error) {
            console.error('Error handling markdown access:', error);
            this.accessTheNotFoundPage(res);
        }
    }
    async whenUserAccessTheMdVisiblePage(sharingName) {
        try {
            const visible = await this.visibilityChecker.sMdContentVisible();
            return visible;
        }
        catch (error) {
            console.error('Error checking visibility:', error);
            return false;
        }
    }
    async accessTheStatefulSharingMd(sharingName, res) {
        try {
            const markdownContent = await this.markdownProcessor.loadMarkdownFile(this.config.markdownFile);
            const htmlContent = this.markdownProcessor.createProtectedMarkdownPage(markdownContent, sharingName, this.config.checkingUrl);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'no-referrer');
            res.status(200).send(htmlContent);
        }
        catch (error) {
            console.error('Error serving markdown content:', error);
            this.accessTheNotFoundPage(res);
        }
    }
    accessTheNotFoundPage(res) {
        const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Not Found - Stateful Markdown</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
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
        <p>This could happen if:</p>
        <ul style="text-align: left; margin: 20px 0;">
            <li>The sharing name is incorrect or expired</li>
            <li>The content has been disabled by the owner</li>
            <li>There's a temporary access restriction</li>
        </ul>
        <a href="/" class="home-link">← Back to Home</a>

        <div class="details">
            <strong>Stateful Markdown</strong><br>
            Dynamic content sharing with visibility control
        </div>
    </div>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(404).send(notFoundHtml);
    }
    handleHome(req, res) {
        const homeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stateful Markdown Server</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
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
                    <p>${this.config.markdownFile.split('/').pop()}</p>
                </div>
            </div>
        </div>

        <div class="info-section">
            <h2>About</h2>
            <p>This server hosts markdown content with dynamic visibility control. The content is only accessible when the external visibility check returns a positive status.</p>
            <p><strong>Features:</strong></p>
            <ul>
                <li>Real-time visibility checking</li>
                <li>Copy protection mechanisms</li>
                <li>Secure content delivery</li>
                <li>JavaScript-based access control</li>
            </ul>
        </div>

        <div style="text-align: center;">
            <a href="/stateful-md/${this.config.sharingName}" class="access-link">
                Access Shared Content →
            </a>
        </div>
    </div>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(homeHtml);
    }
    handleHealthCheck(req, res) {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            config: {
                sharingName: this.config.sharingName,
                checkingUrl: this.config.checkingUrl,
                port: this.config.port
            }
        });
    }
    getRouter() {
        return this.router;
    }
}
exports.MarkdownRoutes = MarkdownRoutes;
function accessTheNotFoundPage() {
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
function setMdContentOnTheRoute(sharingName) {
    console.log(`Setting up route for sharing name: ${sharingName}`);
}
//# sourceMappingURL=markdownRoutes.js.map