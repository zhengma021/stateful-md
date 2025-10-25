#!/usr/bin/env node

import { CLI } from './cli';
import { setupStatefulMdTask } from './tasks/sMdVisible';
import { TaskArgs, TaskName } from './types';

/**
 * Main function - entry point of the application
 * Implements the main() function from the Clojure specification
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Starting Stateful Markdown Application...\n');

    // Create CLI instance
    const cli = new CLI();

    // Parse command line arguments
    await cli.parse();

  } catch (error) {
    console.error('❌ Application failed to start:');

    if (error instanceof Error) {
      console.error(error.message);

      // Provide helpful usage information for common errors
      if (error.message.includes('required option')) {
        console.error('\n💡 Usage:');
        console.error('npm start s-md-visible --file <path> --sharing-name <name> --checking-url <url> --port <number>');
        console.error('\nExample:');
        console.error('npm start s-md-visible --file ./README.md --sharing-name my-doc --checking-url http://localhost:3001/api/visible --port 3000');
      }
    } else {
      console.error('Unknown error occurred');
    }

    process.exit(1);
  }
}

/**
 * Determine the user's chosen task
 * Implements determineTheUserChoosedTask() from the Clojure specification
 */
export function determineTheUserChoosedTask(): [TaskName, any] {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('📚 Stateful Markdown - Dynamic content sharing with visibility control\n');
    console.log('Available tasks:');
    console.log('  s-md-visible: Make markdown content visible with dynamic visibility checking\n');
    console.log('Usage:');
    console.log('  npm start s-md-visible [options]\n');
    console.log('Options:');
    console.log('  --file <path>          Path to the markdown file');
    console.log('  --sharing-name <name>  Name to share the markdown content');
    console.log('  --checking-url <url>   URL to check visibility every 1 second');
    console.log('  --port <number>        Port to run the server\n');
    console.log('Example:');
    console.log('  npm start s-md-visible \\');
    console.log('    --file ./my-document.md \\');
    console.log('    --sharing-name my-shared-doc \\');
    console.log('    --checking-url http://api.example.com/check-visibility \\');
    console.log('    --port 3000');
    process.exit(0);
  }

  const taskName = args[0];
  if (taskName !== 's-md-visible') {
    console.error(`❌ Unsupported task: ${taskName}`);
    console.error('Available tasks: s-md-visible');
    process.exit(1);
  }

  return [taskName as TaskName, {}];
}

/**
 * Setup stateful markdown task wrapper
 * Implements setupStatefulMdTask() from the Clojure specification
 */
export async function setupStatefulMdTaskWrapper(taskName: TaskName, taskArgs: TaskArgs): Promise<string> {
  return setupStatefulMdTask(taskName, taskArgs);
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Only run main if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
