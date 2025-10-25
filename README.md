# Stateful Markdown

A TypeScript application for sharing markdown content with dynamic visibility control and copy protection.

## Overview

Stateful Markdown allows you to serve markdown documents with real-time visibility control. The content is only accessible when an external API confirms visibility, and includes built-in copy protection mechanisms.

## Features

- **Dynamic Visibility Control**: Content visibility controlled by external API
- **Real-time Monitoring**: Checks visibility status every second
- **Copy Protection**: Multiple layers to prevent easy content extraction
- **Secure Delivery**: Content only served when authorized
- **JavaScript Required**: Content hidden when JavaScript is disabled
- **Graceful Error Handling**: User-friendly error pages and messages

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

### Command Line Arguments

- `--file <path>`: Path to the markdown file to serve
- `--sharing-name <name>`: Unique name for sharing the content
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
- Sharing names must contain only letters, numbers, hyphens, and underscores

## Troubleshooting

### Common Issues

1. **Port already in use**: Choose a different port with `--port <number>`
2. **File not found**: Ensure the markdown file path is correct and readable
3. **Invalid checking URL**: Verify the URL is accessible and returns proper JSON
4. **Visibility API errors**: Check that your visibility API is running and reachable

### Error Messages

The application provides detailed error messages for:
- Invalid file paths
- Inaccessible checking URLs
- Malformed API responses
- Network connectivity issues

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