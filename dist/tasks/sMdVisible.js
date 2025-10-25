"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMdVisibleTask = void 0;
exports.checkSMdVisibleCheckingUrlArgument = checkSMdVisibleCheckingUrlArgument;
exports.runSMdVisibleTask = runSMdVisibleTask;
exports.setupStatefulMdTask = setupStatefulMdTask;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const markdownRoutes_1 = require("../routes/markdownRoutes");
const visibility_1 = require("../utils/visibility");
const markdown_1 = require("../utils/markdown");
class SMdVisibleTask {
    constructor(taskArgs) {
        this.config = {
            port: taskArgs.port,
            markdownFile: taskArgs.file,
            sharingName: taskArgs.sharingName,
            checkingUrl: taskArgs.checkingUrl,
        };
        this.app = (0, express_1.default)();
        this.visibilityChecker = new visibility_1.VisibilityChecker(taskArgs.checkingUrl);
        this.markdownProcessor = new markdown_1.MarkdownProcessor();
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use((0, cors_1.default)({
            origin: true,
            credentials: true,
            methods: ["GET", "POST", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Accept", "Authorization"],
        }));
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.app.use((req, res, next) => {
            res.setHeader("X-Powered-By", "Stateful-MD");
            res.setHeader("X-Frame-Options", "DENY");
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("X-XSS-Protection", "1; mode=block");
            next();
        });
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
            next();
        });
    }
    setupRoutes() {
        const markdownRoutes = new markdownRoutes_1.MarkdownRoutes(this.config);
        this.app.use("/", markdownRoutes.getRouter());
        this.app.get("/check-md-visible/:sharingName", async (req, res) => {
            try {
                const { sharingName } = req.params;
                if (sharingName !== this.config.sharingName) {
                    return res.status(404).json({
                        visible: false,
                        error: "Sharing name not found",
                    });
                }
                const visible = await this.visibilityChecker.sMdContentVisible();
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                return res.json({
                    visible,
                    timestamp: new Date().toISOString(),
                    sharingName,
                });
            }
            catch (error) {
                console.error("Error in visibility check endpoint:", error);
                return res.status(500).json({
                    visible: false,
                    error: "Internal server error",
                });
            }
        });
        this.app.use("*", (req, res) => {
            res.status(404).json({
                error: "Not Found",
                message: "The requested resource was not found",
                path: req.originalUrl,
            });
        });
        this.app.use((err, req, res, next) => {
            console.error("Server error:", err);
            res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred",
            });
        });
    }
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.config.port, () => {
                    console.log(`🚀 Stateful Markdown server started successfully!`);
                    console.log(`📊 Server Details:`);
                    console.log(`   Port: ${this.config.port}`);
                    console.log(`   Sharing Name: ${this.config.sharingName}`);
                    console.log(`   Markdown File: ${this.config.markdownFile}`);
                    console.log(`   Checking URL: ${this.config.checkingUrl}`);
                    console.log(`🌐 Access URLs:`);
                    console.log(`   Home: http://localhost:${this.config.port}/`);
                    console.log(`   Content: http://localhost:${this.config.port}/stateful-md/${this.config.sharingName}`);
                    console.log(`   Health: http://localhost:${this.config.port}/health`);
                    console.log(`   Visibility Check: http://localhost:${this.config.port}/check-md-visible/${this.config.sharingName}`);
                    console.log(`\n✅ Server is ready to serve markdown content with visibility control!`);
                    resolve();
                });
                this.server.on("error", (error) => {
                    if (error.code === "EADDRINUSE") {
                        reject(new Error(`Port ${this.config.port} is already in use. Please choose a different port.`));
                    }
                    else {
                        reject(error);
                    }
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async stop() {
        return new Promise((resolve, reject) => {
            if (this.server) {
                this.server.close((error) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        console.log("Server stopped successfully");
                        resolve();
                    }
                });
            }
            else {
                resolve();
            }
        });
    }
    getConfig() {
        return this.config;
    }
}
exports.SMdVisibleTask = SMdVisibleTask;
async function checkSMdVisibleCheckingUrlArgument(checkingUrl) {
    try {
        return await visibility_1.VisibilityChecker.checkSMdVisibleCheckingUrlArgument(checkingUrl);
    }
    catch (error) {
        console.error("Checking URL validation failed:", error instanceof Error ? error.message : "Unknown error");
        return false;
    }
}
async function runSMdVisibleTask(taskArgs) {
    try {
        const isValidCheckingUrl = await checkSMdVisibleCheckingUrlArgument(taskArgs.checkingUrl);
        if (!isValidCheckingUrl) {
            throw new Error(`Invalid or inaccessible checking URL: ${taskArgs.checkingUrl}`);
        }
        const markdownProcessor = new markdown_1.MarkdownProcessor();
        try {
            await markdownProcessor.loadMarkdownFile(taskArgs.file);
        }
        catch (error) {
            throw new Error(`Cannot load markdown file: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
        const task = new SMdVisibleTask(taskArgs);
        const gracefulShutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
            try {
                await task.stop();
                console.log("👋 Goodbye!");
                process.exit(0);
            }
            catch (error) {
                console.error("Error during shutdown:", error);
                process.exit(1);
            }
        };
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
        await task.start();
    }
    catch (error) {
        console.error("❌ Failed to run s-md-visible task:");
        console.error(error instanceof Error ? error.message : "Unknown error");
        if (error instanceof Error && error.message.includes("checking URL")) {
            console.error("\n💡 Checking URL Requirements:");
            console.error("   - Must be accessible via HTTP/HTTPS");
            console.error('   - Must return JSON with "visible" boolean field');
            console.error("   - Must return 2xx status code");
            console.error("   - Must have application/json content type");
        }
        throw error;
    }
}
async function setupStatefulMdTask(taskName, taskArgs) {
    switch (taskName) {
        case "s-md-visible":
            await runSMdVisibleTask(taskArgs);
            return `Successfully setup ${taskName} task`;
        default:
            throw new Error(`Unsupported task: ${taskName}`);
    }
}
//# sourceMappingURL=sMdVisible.js.map