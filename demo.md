# Demo: Stateful Markdown Viewer

This is a demonstration of the **stateful-md** tool.

## Features

- ✅ Serves markdown content as HTML
- ✅ Periodic visibility checks every 1 second
- ✅ Dynamic content show/hide based on check result
- ✅ Clean, responsive UI

## Example Usage

```bash
s-md-visible --file demo.md --checkUrl http://example.com/check --port 8080
```

The page will automatically check the specified URL and show/hide the content accordingly!
