# stateful-md
A tool to set state to markdown content

## Installation

```bash
npm install
```

## Usage

The `s-md-visible` command sets up an HTTP server that serves markdown content with visibility checks.

```bash
s-md-visible --file <markdown-file> --checkUrl <url> [--port <port>]
```

### Arguments

- `--file`: Path to the markdown file to serve (required)
- `--checkUrl`: URL to check for visibility status every 1 second (required)
- `--port`: Port number for the HTTP server (optional, default: 8080)

### Example

```bash
s-md-visible --file README.md --checkUrl http://example.com/check --port 8080
```

This will:
1. Start an HTTP server on port 8080
2. Serve the markdown content from README.md as HTML
3. The page will check the provided URL every 1 second
4. If the check URL returns a successful response (HTTP 200), the content is visible
5. If the check URL fails, the content is hidden

## How It Works

The tool generates an HTML page with:
- Parsed markdown content
- JavaScript code that checks the provided URL every 1 second
- A status indicator showing whether content is visible or hidden
- Automatic content show/hide based on the check result

The viewer who receives the link can view the markdown content only when the check URL returns a successful response.
