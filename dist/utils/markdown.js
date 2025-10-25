"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownProcessor = void 0;
exports.loadMarkdownFile = loadMarkdownFile;
exports.renderMarkdown = renderMarkdown;
exports.getMarkdownContent = getMarkdownContent;
exports.createProtectedMarkdownPage = createProtectedMarkdownPage;
const fs = __importStar(require("fs"));
const markdown_it_1 = __importDefault(require("markdown-it"));
class MarkdownProcessor {
    constructor() {
        this.md = new markdown_it_1.default({
            html: true,
            linkify: true,
            typographer: true,
            breaks: true,
        });
    }
    async loadMarkdownFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`Markdown file not found: ${filePath}`);
            }
            const content = fs.readFileSync(filePath, { encoding: "utf8" });
            if (content.includes("\uFFFD")) {
                throw new Error("File contains invalid UTF-8 characters. Please ensure the file is saved in UTF-8 encoding.");
            }
            return content;
        }
        catch (error) {
            throw new Error(`Failed to load markdown file: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    renderMarkdown(content) {
        return this.md.render(content);
    }
    async getMarkdownContent(filePath, sharingName) {
        try {
            const content = await this.loadMarkdownFile(filePath);
            const isValid = this.isValidSharingName(sharingName);
            return {
                content,
                sharingName,
                isValid,
            };
        }
        catch (error) {
            return {
                content: "",
                sharingName,
                isValid: false,
            };
        }
    }
    isValidSharingName(sharingName) {
        const regex = /^[\w\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff-]+$/;
        return (regex.test(sharingName) &&
            sharingName.length > 0 &&
            sharingName.length <= 100);
    }
    createProtectedMarkdownPage(content, sharingName, checkingUrl) {
        const renderedContent = this.renderMarkdown(content);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stateful Markdown - ${sharingName}</title>
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
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .sharing-name {
            color: #666;
            font-size: 14px;
            margin: 0;
        }

        .content {
            /* Copy protection styles */
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
        }

        .content * {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }

        /* Style the markdown content */
        .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
            color: #2c3e50;
            margin-top: 30px;
            margin-bottom: 15px;
        }

        .content p {
            margin-bottom: 15px;
        }

        .content pre {
            background: #f4f4f4;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }

        .content code {
            background: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Consolas', '微软雅黑', monospace;
        }

        .content blockquote {
            border-left: 4px solid #3498db;
            margin: 0;
            padding-left: 20px;
            color: #666;
        }

        .status-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
        }

        .status-visible {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .status-checking {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }

        .status-hidden {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .loading {
            text-align: center;
            padding: 50px;
            color: #666;
        }

        /* Disable right-click context menu */
        .content {
            pointer-events: none;
        }

        .content a {
            pointer-events: auto;
        }

        /* Hide content when JavaScript is disabled */
        .no-js .content {
            display: none;
        }

        .no-js .js-disabled-message {
            display: block;
            background: #f8d7da;
            color: #721c24;
            padding: 20px;
            border-radius: 4px;
            text-align: center;
        }

        .js-disabled-message {
            display: none;
        }

        /* Better Chinese text rendering */
        .content {
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* Improve Chinese punctuation handling */
        .content p, .content li {
            word-break: break-word;
            overflow-wrap: break-word;
        }

        /* Better spacing for mixed Chinese/English content */
        .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
            word-spacing: 0.05em;
        }
    </style>
</head>
<body class="no-js">
    <div class="container">
        <div class="header">
            <p class="sharing-name">Shared as: ${sharingName}</p>
            <h1>Stateful Markdown Document</h1>
        </div>

        <div class="js-disabled-message">
            <h2>JavaScript Required</h2>
            <p>This content requires JavaScript to be enabled for security and visibility control.</p>
            <p>Please enable JavaScript in your browser to view this document.</p>
        </div>

        <div class="content" id="markdown-content">
            <div class="loading">Checking content visibility...</div>
        </div>
    </div>

    <div class="status-indicator status-checking" id="status-indicator">
        Checking visibility...
    </div>

    <script>
        // Remove no-js class to show content
        document.body.classList.remove('no-js');

        let visibilityCheckInterval;
        let lastVisibilityState = null;

        const statusIndicator = document.getElementById('status-indicator');
        const contentElement = document.getElementById('markdown-content');

        // The actual markdown content (base64 encoded to make it harder to extract)
        // Using Buffer with utf8 encoding to properly handle Chinese characters
        const markdownContent = \`${Buffer.from(renderedContent, "utf8").toString("base64")}\`;

        // Decode and display content
        function displayContent() {
            try {
                // Decode base64 content and handle UTF-8 properly for Chinese characters
                const decodedContent = decodeURIComponent(Array.prototype.map.call(atob(markdownContent), function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                contentElement.innerHTML = decodedContent;
                updateStatus('visible');
            } catch (error) {
                console.error('Error displaying content:', error);
                // Fallback to simple base64 decode if UTF-8 decode fails
                try {
                    const fallbackContent = atob(markdownContent);
                    contentElement.innerHTML = fallbackContent;
                    updateStatus('visible');
                } catch (fallbackError) {
                    console.error('Fallback decode also failed:', fallbackError);
                    showNotFound();
                }
            }
        }

        // Show not found message
        function showNotFound() {
            contentElement.innerHTML = \`
                <div style="text-align: center; padding: 50px;">
                    <h2>Content Not Available</h2>
                    <p>The requested markdown content is not currently visible.</p>
                    <p><a href="/">← Back to Home</a></p>
                </div>
            \`;
            updateStatus('hidden');
        }

        // Update status indicator
        function updateStatus(status) {
            statusIndicator.className = 'status-indicator status-' + status;
            switch (status) {
                case 'visible':
                    statusIndicator.textContent = 'Content Visible';
                    break;
                case 'checking':
                    statusIndicator.textContent = 'Checking...';
                    break;
                case 'hidden':
                    statusIndicator.textContent = 'Content Hidden';
                    break;
            }
        }

        // Check visibility
        async function checkVisibility() {
            try {
                updateStatus('checking');
                const response = await fetch('${checkingUrl}', {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const isVisible = data.visible === true;

                    if (isVisible !== lastVisibilityState) {
                        lastVisibilityState = isVisible;

                        if (isVisible) {
                            displayContent();
                        } else {
                            showNotFound();
                        }
                    } else if (isVisible) {
                        updateStatus('visible');
                    } else {
                        updateStatus('hidden');
                    }
                } else {
                    console.error('Visibility check failed:', response.status);
                    showNotFound();
                }
            } catch (error) {
                console.error('Error checking visibility:', error);
                showNotFound();
            }
        }

        // Start visibility checking
        function startVisibilityChecking() {
            checkVisibility(); // Initial check
            visibilityCheckInterval = setInterval(checkVisibility, 1000); // Check every second
        }

        // Copy protection
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });

        document.addEventListener('keydown', function(e) {
            // Disable common copy shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.keyCode) {
                    case 65: // Ctrl+A
                    case 67: // Ctrl+C
                    case 80: // Ctrl+P
                    case 83: // Ctrl+S
                    case 85: // Ctrl+U
                        e.preventDefault();
                        break;
                }
            }

            // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
            if (e.keyCode === 123 ||
                (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67))) {
                e.preventDefault();
            }
        });

        // Disable drag and drop
        document.addEventListener('dragstart', function(e) {
            e.preventDefault();
        });

        // Start the application
        startVisibilityChecking();

        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
            if (visibilityCheckInterval) {
                clearInterval(visibilityCheckInterval);
            }
        });
    </script>
</body>
</html>`;
    }
}
exports.MarkdownProcessor = MarkdownProcessor;
async function loadMarkdownFile(filePath) {
    const processor = new MarkdownProcessor();
    return processor.loadMarkdownFile(filePath);
}
function renderMarkdown(content) {
    const processor = new MarkdownProcessor();
    return processor.renderMarkdown(content);
}
async function getMarkdownContent(filePath, sharingName) {
    const processor = new MarkdownProcessor();
    return processor.getMarkdownContent(filePath, sharingName);
}
function createProtectedMarkdownPage(content, sharingName, checkingUrl) {
    const processor = new MarkdownProcessor();
    return processor.createProtectedMarkdownPage(content, sharingName, checkingUrl);
}
//# sourceMappingURL=markdown.js.map