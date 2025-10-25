#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    file: null,
    checkUrl: null,
    port: 8080
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && i + 1 < args.length) {
      options.file = args[i + 1];
      i++;
    } else if (args[i] === '--checkUrl' && i + 1 < args.length) {
      options.checkUrl = args[i + 1];
      i++;
    } else if (args[i] === '--port' && i + 1 < args.length) {
      const portValue = parseInt(args[i + 1], 10);
      if (isNaN(portValue) || portValue < 1 || portValue > 65535) {
        console.error(`Error: Invalid port number: ${args[i + 1]}`);
        process.exit(1);
      }
      options.port = portValue;
      i++;
    }
  }

  return options;
}

// Generate HTML page with markdown content
function generateHTML(markdownContent, checkUrl) {
  const htmlContent = marked.parse(markdownContent);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stateful Markdown Viewer</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        pre {
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
        }
        #status {
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
        }
        .status-checking {
            background-color: #ffc107;
            color: #000;
        }
        .status-visible {
            background-color: #4caf50;
            color: #fff;
        }
        .status-hidden {
            background-color: #f44336;
            color: #fff;
        }
    </style>
</head>
<body>
    <div id="status" class="status-checking">Checking visibility...</div>
    <div id="content">
        ${htmlContent}
    </div>
    <script>
        const checkUrl = ${JSON.stringify(checkUrl)};
        const statusElement = document.getElementById('status');
        const contentElement = document.getElementById('content');
        
        async function checkVisibility() {
            try {
                const response = await fetch(checkUrl);
                const isVisible = response.ok;
                
                if (isVisible) {
                    statusElement.textContent = 'Content is visible';
                    statusElement.className = 'status-visible';
                    contentElement.style.display = 'block';
                } else {
                    statusElement.textContent = 'Content is hidden';
                    statusElement.className = 'status-hidden';
                    contentElement.style.display = 'none';
                }
            } catch (error) {
                statusElement.textContent = 'Check failed';
                statusElement.className = 'status-hidden';
                contentElement.style.display = 'none';
            }
        }
        
        // Check visibility immediately
        checkVisibility();
        
        // Check every 1 second
        setInterval(checkVisibility, 1000);
    </script>
</body>
</html>`;
}

// Main function
function main() {
  const options = parseArgs();

  // Validate required arguments
  if (!options.file) {
    console.error('Error: --file argument is required');
    console.log('Usage: s-md-visible --file <markdown-file> --checkUrl <url> [--port <port>]');
    process.exit(1);
  }

  if (!options.checkUrl) {
    console.error('Error: --checkUrl argument is required');
    console.log('Usage: s-md-visible --file <markdown-file> --checkUrl <url> [--port <port>]');
    process.exit(1);
  }

  // Read markdown file
  const filePath = path.resolve(options.file);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${options.file}`);
    process.exit(1);
  }

  const markdownContent = fs.readFileSync(filePath, 'utf8');
  const html = generateHTML(markdownContent, options.checkUrl);

  // Create HTTP server
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(options.port, () => {
    console.log(`Server started on http://localhost:${options.port}`);
    console.log(`Markdown file: ${options.file}`);
    console.log(`Check URL: ${options.checkUrl}`);
    console.log(`Press Ctrl+C to stop the server`);
  });
}

main();
