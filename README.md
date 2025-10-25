# Stateful Markdown

A TypeScript application for sharing markdown content with dynamic visibility control and copy protection.

**English** | [中文](./README-zh.md)

## Overview

Stateful Markdown allows you to serve markdown documents with real-time visibility control. The content is only accessible when an external API confirms visibility, and includes built-in copy protection mechanisms.

✨ **Full Chinese Support**: This application fully supports Chinese content, UTF-8 encoding, and Chinese sharing names.

## Features

- **Dynamic Visibility Control**: Content visibility controlled by external API
- **Real-time Monitoring**: Checks visibility status every second
- **Copy Protection**: Multiple layers to prevent easy content extraction
- **Secure Delivery**: Content only served when authorized
- **JavaScript Required**: Content hidden when JavaScript is disabled
- **Graceful Error Handling**: User-friendly error pages and messages
- **Chinese Content Support**: Full UTF-8 support for Chinese characters and mixed content
- **International Ready**: Supports Unicode sharing names and multilingual content

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd stateful-md
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Usage

### Basic Usage

Run the application with the `s-md-visible` task:

```bash
npm start s-md-visible \
  --file ./example.md \
  --sharing-name my-document \
  --checking-url http://localhost:3001/api/check-visibility \
  --port 3000
```

### Chinese Content Example

For Chinese content, use the Chinese example file:

```bash
npm start s-md-visible \
  --file ./scripts/test-chinese/example-chinese.md \
  --sharing-name 中文文档 \
  --checking-url http://localhost:3001/api/check-visibility \
  --port 3000
```

### Command Line Arguments

- `--file <path>`: Path to the markdown file to serve
- `--sharing-name <name>`: Unique name for sharing the content (supports Chinese characters)
- `--checking-url <url>`: URL that returns visibility status (must return JSON with `visible` boolean field)
- `--port <number>`: Port to run the server on

### Example Visibility API

Your visibility checking URL must return JSON in this format:

```json
{
  "visible": true
}
```

The API should:
- Return HTTP 200 status
- Have `application/json` content type
- Include a `visible` boolean field

## API Endpoints

Once running, the server provides these endpoints:

- `GET /` - Home page with server information
- `GET /stateful-md/{sharing-name}` - Access the markdown content
- `GET /check-md-visible/{sharing-name}` - Internal visibility check
- `GET /health` - Health check endpoint

## How It Works

1. **Server Startup**: The application validates arguments and starts an Express server
2. **Content Request**: When a user accesses `/stateful-md/{sharing-name}`, the server:
   - Checks if the sharing name matches the configured name
   - Queries the external visibility API
   - Serves protected HTML if visible, or shows 404 if not
3. **Real-time Monitoring**: The client-side JavaScript:
   - Polls the visibility API every second
   - Shows/hides content based on visibility status
   - Automatically reloads if visibility changes
4. **Copy Protection**: Multiple mechanisms prevent easy content copying:
   - CSS user-select disabled
   - Keyboard shortcuts blocked
   - Right-click context menu disabled
   - Content encoded in JavaScript

## Security Features

- **Content Encoding**: Markdown content is base64 encoded in the client
- **No Direct Access**: Content is not directly accessible without JavaScript
- **Visibility Validation**: Continuous checking of external API
- **Copy Prevention**: Multiple layers of copy protection
- **Security Headers**: Appropriate HTTP security headers set
- **UTF-8 Security**: Proper handling of Unicode characters and Chinese content

## Example Visibility Server

Here's a simple Node.js server that can serve as a visibility checker:

```javascript
const express = require('express');
const app = express();

let isVisible = true;

app.get('/api/check-visibility', (req, res) => {
  res.json({ visible: isVisible });
});

app.post('/api/toggle-visibility', (req, res) => {
  isVisible = !isVisible;
  res.json({ visible: isVisible });
});

app.listen(3001, () => {
  console.log('Visibility API running on port 3001');
});
```

## Development

### Available Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Build and run the application
- `npm run dev` - Run with ts-node for development
- `npm run clean` - Remove build artifacts
- `npm run test-server` - Run test visibility server
- `./scripts/demo.sh` - Run interactive demo
- `./scripts/test-chinese/test-chinese-simple.sh` - Test Chinese content functionality

### Project Structure

```
src/
├── index.ts          # Main entry point
├── cli.ts            # Command line interface
├── types.ts          # TypeScript type definitions
├── tasks/
│   └── sMdVisible.ts # Main task implementation
├── routes/
│   └── markdownRoutes.ts # Express routes
└── utils/
    ├── markdown.ts   # Markdown processing
    └── visibility.ts # Visibility checking
```

## Configuration

### Environment Variables

- `CHECKING_DOMAIN` - Default domain for visibility checks (default: http://localhost:3000)

### File Requirements

- Markdown files must have `.md` or `.markdown` extension
- Files must be readable by the application
- Files must be saved in UTF-8 encoding for Chinese content
- Sharing names support letters (including Chinese), numbers, hyphens, and underscores
- Chinese sharing names are automatically URL-encoded

## Troubleshooting

### Common Issues

1. **Port already in use**: Choose a different port with `--port <number>`
2. **File not found**: Ensure the markdown file path is correct and readable
3. **Invalid checking URL**: Verify the URL is accessible and returns proper JSON
4. **Visibility API errors**: Check that your visibility API is running and reachable
5. **Chinese characters not displaying**: Ensure files are saved in UTF-8 encoding
6. **Chinese sharing names**: Use proper URL encoding or let the application handle it automatically

### Error Messages

The application provides detailed error messages for:
- Invalid file paths
- Inaccessible checking URLs
- Malformed API responses
- Network connectivity issues
- UTF-8 encoding issues
- Chinese character handling problems

## Quick Start

### Run Demo

```bash
# Full demo (English content)
./scripts/demo.sh

# Chinese content test
./scripts/test-chinese/test-chinese-simple.sh

# Manual setup
# Terminal 1: Start visibility server
node scripts/test-visibility-server.js

# Terminal 2: Start markdown server
npm start -- s-md-visible \
  --file ./scripts/test-chinese/example-chinese.md \
  --sharing-name 演示文档 \
  --checking-url http://localhost:3001/api/check-visibility \
  --port 3000
```

### Test Visibility Control

```bash
# Check current visibility
curl http://localhost:3001/api/check-visibility

# Toggle visibility (watch content disappear/appear in browser)
curl -X POST http://localhost:3001/api/toggle-visibility

# Set invisible
curl -X POST http://localhost:3001/api/set-visibility \
  -H "Content-Type: application/json" \
  -d '{"visible": false}'

# Set visible
curl -X POST http://localhost:3001/api/set-visibility \
  -H "Content-Type: application/json" \
  -d '{"visible": true}'
```

## Example Files

- `scripts/example.md` - English example document
- `scripts/test-chinese/example-chinese.md` - Chinese example document (中文示例文档)
- `scripts/test-visibility-server.js` - Test visibility server
- `scripts/demo.sh` - Complete demo script
- `scripts/test-chinese/test-chinese-simple.sh` - Chinese content test script

## Chinese Content Features

### Character Support
- Full UTF-8 encoding support
- Proper handling of Chinese characters, punctuation, and symbols
- Support for both Simplified and Traditional Chinese
- Mixed Chinese-English content rendering

### Font Optimization
- Optimized font stack for Chinese content
- Better line height and character spacing
- Improved mixed-language content display

### Sharing Names
- Support for Chinese characters in sharing names
- Automatic URL encoding handling
- Mixed Chinese-English naming support

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions, please create an issue in the repository.

---

📖 **Documentation**: [English](./README.md) | [中文文档](./README-zh.md)