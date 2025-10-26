import express, { Express } from "express";
import cors from "cors";
import { TaskArgs, ServerConfig } from "../types";
import { MarkdownRoutes } from "../routes/markdownRoutes";
import { VisibilityChecker } from "../utils/visibility";
import { MarkdownProcessor } from "../utils/markdown";

export class SMdVisibleTask {
  private app: Express;
  private server: any;
  private config: ServerConfig;
  private visibilityChecker: VisibilityChecker;
  private markdownProcessor: MarkdownProcessor;

  constructor(taskArgs: TaskArgs) {
    this.config = {
      port: taskArgs.port,
      markdownFile: taskArgs.file,
      sharingName: taskArgs.sharingName,
      checkingUrl: taskArgs.checkingUrl,
      checkingUrlTimeoutSeconds: taskArgs.checkingUrlTimeoutSeconds || 2,
    };

    this.app = express();
    this.visibilityChecker = new VisibilityChecker(
      taskArgs.checkingUrl,
      taskArgs.checkingUrlTimeoutSeconds || 2,
    );
    this.markdownProcessor = new MarkdownProcessor();

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Enable CORS
    this.app.use(
      cors({
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Accept", "Authorization"],
      }),
    );

    // Parse JSON bodies
    this.app.use(express.json());

    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));

    // Security middleware
    this.app.use((req, res, next) => {
      res.setHeader("X-Powered-By", "Stateful-MD");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Setup markdown routes
    const markdownRoutes = new MarkdownRoutes(this.config);
    this.app.use("/", markdownRoutes.getRouter());

    // Setup visibility checking endpoint
    this.app.get("/check-md-visible/:sharingName", async (req, res) => {
      try {
        const { sharingName } = req.params;

        // Validate sharing name
        if (sharingName !== this.config.sharingName) {
          return res.status(404).json({
            visible: false,
            error: "Sharing name not found",
          });
        }

        // Check visibility
        const visible = await this.visibilityChecker.sMdContentVisible();

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        return res.json({
          visible,
          timestamp: new Date().toISOString(),
          sharingName,
        });
      } catch (error) {
        console.error("Error in visibility check endpoint:", error);
        return res.status(500).json({
          visible: false,
          error: "Internal server error",
        });
      }
    });

    // Catch-all route for 404s
    this.app.use("*", (req, res) => {
      res.status(404).json({
        error: "Not Found",
        message: "The requested resource was not found",
        path: req.originalUrl,
      });
    });

    // Error handling middleware
    this.app.use((err: any, req: any, res: any, next: any) => {
      console.error("Server error:", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      });
    });
  }

  public async start(): Promise<void> {
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
          console.log(
            `   Content: http://localhost:${this.config.port}/stateful-md/${this.config.sharingName}`,
          );
          console.log(`   Health: http://localhost:${this.config.port}/health`);
          console.log(
            `   Visibility Check: http://localhost:${this.config.port}/check-md-visible/${this.config.sharingName}`,
          );
          console.log(
            `\n✅ Server is ready to serve markdown content with visibility control!`,
          );
          resolve();
        });

        this.server.on("error", (error: any) => {
          if (error.code === "EADDRINUSE") {
            reject(
              new Error(
                `Port ${this.config.port} is already in use. Please choose a different port.`,
              ),
            );
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error: any) => {
          if (error) {
            reject(error);
          } else {
            console.log("Server stopped successfully");
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  public getConfig(): ServerConfig {
    return this.config;
  }
}

/**
 * Validate checking URL argument
 */
export async function checkSMdVisibleCheckingUrlArgument(
  checkingUrl: string,
): Promise<boolean> {
  try {
    return await VisibilityChecker.checkSMdVisibleCheckingUrlArgument(
      checkingUrl,
    );
  } catch (error) {
    console.error(
      "Checking URL validation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return false;
  }
}

/**
 * Run the s-md-visible task
 */
export async function runSMdVisibleTask(taskArgs: TaskArgs): Promise<void> {
  try {
    // Validate checking URL
    const isValidCheckingUrl = await checkSMdVisibleCheckingUrlArgument(
      taskArgs.checkingUrl,
    );
    if (!isValidCheckingUrl) {
      throw new Error(
        `Invalid or inaccessible checking URL: ${taskArgs.checkingUrl}`,
      );
    }

    // Validate markdown file
    const markdownProcessor = new MarkdownProcessor();
    try {
      await markdownProcessor.loadMarkdownFile(taskArgs.file);
    } catch (error) {
      throw new Error(
        `Cannot load markdown file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Create and start the task
    const task = new SMdVisibleTask(taskArgs);

    // Setup graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      try {
        await task.stop();
        console.log("👋 Goodbye!");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Start the server
    await task.start();
  } catch (error) {
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

/**
 * Setup stateful markdown task environment
 */
export async function setupStatefulMdTask(
  taskName: string,
  taskArgs: TaskArgs,
): Promise<string> {
  switch (taskName) {
    case "s-md-visible":
      await runSMdVisibleTask(taskArgs);
      return `Successfully setup ${taskName} task`;
    default:
      throw new Error(`Unsupported task: ${taskName}`);
  }
}
