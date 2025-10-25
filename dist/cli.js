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
exports.CLI = void 0;
exports.determineTheUserChoosedTask = determineTheUserChoosedTask;
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
class CLI {
    constructor() {
        this.program = new commander_1.Command();
        this.setupCommands();
    }
    setupCommands() {
        this.program
            .name("stateful-md")
            .description("A stateful markdown sharing application with visibility control")
            .version("1.0.0");
        this.program
            .command("s-md-visible")
            .description("Make markdown content visible with dynamic visibility checking")
            .requiredOption("--file <path>", "Path to the markdown file")
            .requiredOption("--sharing-name <name>", "Name to share the markdown content")
            .requiredOption("--checking-url <url>", "URL to check visibility every 1 second")
            .requiredOption("--port <number>", "Port to run the server", (value) => {
            const port = parseInt(value, 10);
            if (isNaN(port) || port < 1 || port > 65535) {
                throw new Error("Port must be a valid number between 1 and 65535");
            }
            return port;
        })
            .action(async (options) => {
            try {
                const taskArgs = await this.validateAndParseArgs(options);
                const { runSMdVisibleTask } = require("./tasks/sMdVisible");
                await runSMdVisibleTask(taskArgs);
            }
            catch (error) {
                console.error("Error:", error instanceof Error ? error.message : "Unknown error");
                process.exit(1);
            }
        });
    }
    async validateAndParseArgs(options) {
        const { file, sharingName, checkingUrl, port } = options;
        if (!fs.existsSync(file)) {
            throw new Error(`Markdown file not found: ${file}`);
        }
        const stats = fs.statSync(file);
        if (!stats.isFile()) {
            throw new Error(`Path is not a file: ${file}`);
        }
        try {
            fs.accessSync(file, fs.constants.R_OK);
        }
        catch (error) {
            throw new Error(`Cannot read markdown file: ${file}`);
        }
        const ext = path.extname(file).toLowerCase();
        if (![".md", ".markdown"].includes(ext)) {
            throw new Error(`File must be a markdown file (.md or .markdown): ${file}`);
        }
        if (!this.isValidSharingName(sharingName)) {
            throw new Error("Sharing name must contain only letters (including Chinese), numbers, hyphens, and underscores");
        }
        if (!this.isValidUrl(checkingUrl)) {
            throw new Error(`Invalid checking URL: ${checkingUrl}`);
        }
        await this.validateCheckingUrl(checkingUrl);
        return {
            file: path.resolve(file),
            sharingName,
            checkingUrl,
            port,
        };
    }
    isValidSharingName(name) {
        const regex = /^[\w\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff-]+$/;
        return regex.test(name) && name.length > 0 && name.length <= 100;
    }
    isValidUrl(url) {
        try {
            const parsedUrl = new URL(url);
            return ["http:", "https:"].includes(parsedUrl.protocol);
        }
        catch {
            return false;
        }
    }
    async validateCheckingUrl(checkingUrl) {
        try {
            const response = await axios_1.default.get(checkingUrl, {
                timeout: 5000,
                validateStatus: (status) => status >= 200 && status < 500,
            });
            const contentType = response.headers["content-type"];
            if (!contentType?.includes("application/json")) {
                throw new Error("Checking URL must return JSON content type");
            }
            if (typeof response.data !== "object" || !("visible" in response.data)) {
                throw new Error('Checking URL response must contain "visible" field');
            }
            if (typeof response.data.visible !== "boolean") {
                throw new Error('Checking URL "visible" field must be a boolean value');
            }
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                if (error.code === "ECONNREFUSED") {
                    throw new Error(`Cannot connect to checking URL: ${checkingUrl}`);
                }
                else if (error.code === "ENOTFOUND") {
                    throw new Error(`Checking URL not found: ${checkingUrl}`);
                }
                else if (error.response) {
                    throw new Error(`Checking URL returned ${error.response.status}: ${checkingUrl}`);
                }
            }
            throw error;
        }
    }
    async parse(argv = process.argv) {
        await this.program.parseAsync(argv);
    }
    determineUserChoosedTask() {
        const args = process.argv.slice(2);
        if (args.length === 0) {
            console.log("Available tasks:");
            console.log("  s-md-visible: Make markdown content visible with dynamic visibility checking");
            console.log("");
            console.log("Usage: npm start s-md-visible --file <path> --sharing-name <name> --checking-url <url> --port <number>");
            process.exit(0);
        }
        return ["s-md-visible", {}];
    }
}
exports.CLI = CLI;
function determineTheUserChoosedTask() {
    const cli = new CLI();
    return cli.determineUserChoosedTask();
}
//# sourceMappingURL=cli.js.map