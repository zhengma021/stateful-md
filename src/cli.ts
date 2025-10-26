import { Command } from "commander";
import { TaskArgs, TaskName, ServeoShareArgs } from "./types";
import * as fs from "fs";
import * as path from "path";
import * as childProcess from "child_process";
import axios from "axios";

export class CLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name("stateful-md")
      .description(
        "A stateful markdown sharing application with visibility control",
      )
      .version("1.0.0");

    this.program
      .command("s-md-visible")
      .description(
        "Make markdown content visible with dynamic visibility checking",
      )
      .requiredOption("--file <path>", "Path to the markdown file")
      .requiredOption(
        "--sharing-name <name>",
        "Name to share the markdown content",
      )
      .requiredOption(
        "--checking-url <url>",
        "URL to check visibility every 1 second",
      )
      .requiredOption("--port <number>", "Port to run the server", (value) => {
        const port = parseInt(value, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          throw new Error("Port must be a valid number between 1 and 65535");
        }
        return port;
      })
      .option(
        "--skip-url-validation",
        "Skip checking URL validation (for public tunnels)",
      )
      .action(async (options) => {
        try {
          const taskArgs = await this.validateAndParseArgs(options);
          const { runSMdVisibleTask } = require("./tasks/sMdVisible");
          await runSMdVisibleTask(taskArgs);
        } catch (error) {
          console.error("Error running s-md-visible task:", error);
          process.exit(1);
        }
      });

    this.program
      .command("serveo-share")
      .description(
        "Share markdown content publicly via SSH tunnels using Serveo",
      )
      .requiredOption("--file <path>", "Path to the markdown file")
      .requiredOption(
        "--sharing-name <name>",
        "Name to share the markdown content publicly",
      )
      .option(
        "--task-port <number>",
        "Port for the markdown server",
        (value) => {
          const port = parseInt(value, 10);
          if (isNaN(port) || port < 1024 || port > 65535) {
            throw new Error(
              "Task port must be a valid number between 1024 and 65535",
            );
          }
          return port;
        },
        3000,
      )
      .option(
        "--checking-port <number>",
        "Port for the visibility checking server",
        (value) => {
          const port = parseInt(value, 10);
          if (isNaN(port) || port < 1024 || port > 65535) {
            throw new Error(
              "Checking port must be a valid number between 1024 and 65535",
            );
          }
          return port;
        },
        3001,
      )
      .action(async (options) => {
        try {
          const serveoArgs = await this.validateAndParseServeoArgs(options);
          await this.runServeoShare(serveoArgs);
        } catch (error) {
          console.error(
            "Error:",
            error instanceof Error ? error.message : "Unknown error",
          );
          process.exit(1);
        }
      });
  }

  private async validateAndParseServeoArgs(
    options: any,
  ): Promise<ServeoShareArgs> {
    // Validate file path
    const filePath = path.resolve(options.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Markdown file not found: ${filePath}`);
    }

    // Validate sharing name
    if (!/^[a-zA-Z0-9_-]+$/.test(options.sharingName)) {
      throw new Error(
        "Sharing name can only contain letters, numbers, hyphens, and underscores",
      );
    }

    if (options.sharingName.length < 1 || options.sharingName.length > 50) {
      throw new Error("Sharing name must be between 1 and 50 characters long");
    }

    // Check if ports are different
    if (options.taskPort === options.checkingPort) {
      throw new Error("Task port and checking port must be different");
    }

    return {
      file: filePath,
      sharingName: options.sharingName,
      taskPort: options.taskPort,
      checkingPort: options.checkingPort,
    };
  }

  private async runServeoShare(args: ServeoShareArgs): Promise<void> {
    console.log("🚀 Starting Serveo Public Share...");
    console.log(`📄 File: ${args.file}`);
    console.log(`🏷️  Sharing Name: ${args.sharingName}`);
    console.log(`🚀 Task Port: ${args.taskPort}`);
    console.log(`🔍 Checking Port: ${args.checkingPort}`);
    console.log("");

    // Get the script directory
    const scriptDir = path.join(__dirname, "..", "scripts");
    const scriptPath = path.join(scriptDir, "start-serveo-public-share.sh");

    // Check if bash script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Serveo script not found: ${scriptPath}`);
    }

    // Execute the bash script
    const child = childProcess.spawn(
      "bash",
      [
        scriptPath,
        args.taskPort.toString(),
        args.file,
        args.sharingName,
        args.checkingPort.toString(),
      ],
      {
        stdio: "inherit",
        cwd: path.join(__dirname, ".."),
      },
    );

    // Handle script exit
    child.on("exit", (code) => {
      if (code === 0) {
        console.log("✅ Serveo public sharing completed successfully");
      } else {
        console.error(
          `❌ Serveo public sharing failed with exit code: ${code}`,
        );
        process.exit(code || 1);
      }
    });

    // Handle errors
    child.on("error", (error) => {
      console.error("❌ Failed to start Serveo public sharing:", error.message);
      process.exit(1);
    });

    // Handle process termination
    process.on("SIGINT", () => {
      console.log("\n🛑 Terminating Serveo public sharing...");
      child.kill("SIGTERM");
    });

    process.on("SIGTERM", () => {
      child.kill("SIGTERM");
    });
  }

  private async validateAndParseArgs(options: any): Promise<TaskArgs> {
    const { file, sharingName, checkingUrl, port } = options;

    // Validate file exists and is readable
    if (!fs.existsSync(file)) {
      throw new Error(`Markdown file not found: ${file}`);
    }

    const stats = fs.statSync(file);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${file}`);
    }

    // Check if file is readable
    try {
      fs.accessSync(file, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`Cannot read markdown file: ${file}`);
    }

    // Validate file extension
    const ext = path.extname(file).toLowerCase();
    if (![".md", ".markdown"].includes(ext)) {
      throw new Error(
        `File must be a markdown file (.md or .markdown): ${file}`,
      );
    }

    // Validate sharing name
    if (!this.isValidSharingName(sharingName)) {
      throw new Error(
        "Sharing name must contain only letters (including Chinese), numbers, hyphens, and underscores",
      );
    }

    // Validate checking URL
    if (!this.isValidUrl(checkingUrl)) {
      throw new Error(`Invalid checking URL: ${checkingUrl}`);
    }

    // Test if checking URL is accessible (unless validation is skipped)
    if (!options.skipUrlValidation) {
      await this.validateCheckingUrl(checkingUrl);
    }

    return {
      file: path.resolve(file),
      sharingName,
      checkingUrl,
      port,
    };
  }

  private isValidSharingName(name: string): boolean {
    // Allow letters (including Chinese), numbers, hyphens, and underscores
    // Chinese characters: \u4e00-\u9fff (CJK Unified Ideographs)
    // Also allow other common Unicode ranges for international support
    const regex =
      /^[\w\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff-]+$/;
    return regex.test(name) && name.length > 0 && name.length <= 100;
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ["http:", "https:"].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  private async validateCheckingUrl(checkingUrl: string): Promise<void> {
    try {
      const response = await axios.get(checkingUrl, {
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 500,
      });

      // Check if response is JSON
      const contentType = response.headers["content-type"];
      if (!contentType?.includes("application/json")) {
        throw new Error("Checking URL must return JSON content type");
      }

      // Check if response has visible field
      if (typeof response.data !== "object" || !("visible" in response.data)) {
        throw new Error('Checking URL response must contain "visible" field');
      }

      // Check if visible field is boolean
      if (typeof response.data.visible !== "boolean") {
        throw new Error('Checking URL "visible" field must be a boolean value');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNREFUSED") {
          throw new Error(`Cannot connect to checking URL: ${checkingUrl}`);
        } else if (error.code === "ENOTFOUND") {
          throw new Error(`Checking URL not found: ${checkingUrl}`);
        } else if (error.response) {
          throw new Error(
            `Checking URL returned ${error.response.status}: ${checkingUrl}`,
          );
        }
      }
      throw error;
    }
  }

  public async parse(argv: string[] = process.argv): Promise<void> {
    await this.program.parseAsync(argv);
  }

  public determineUserChoosedTask(): [TaskName, any] {
    // This is called by the main function to get task info
    // In a real CLI scenario, this would be handled by commander.js actions
    // This method is here for compatibility with the original Clojure spec
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log("Available tasks:");
      console.log(
        "  s-md-visible: Make markdown content visible with dynamic visibility checking",
      );
      console.log("");
      console.log(
        "Usage: npm start s-md-visible --file <path> --sharing-name <name> --checking-url <url> --port <number>",
      );
      process.exit(0);
    }

    return ["s-md-visible", {}]; // Placeholder - actual parsing is done by commander
  }
}

export function determineTheUserChoosedTask(): [TaskName, TaskArgs] {
  const cli = new CLI();
  return cli.determineUserChoosedTask() as [TaskName, TaskArgs];
}
