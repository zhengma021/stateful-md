# Example Stateful Markdown Document

This is a sample markdown document to demonstrate the **Stateful Markdown** application.

## Features

The Stateful Markdown system provides:

- **Dynamic Visibility Control**: Content visibility is controlled by an external API
- **Copy Protection**: Built-in mechanisms to prevent easy content copying
- **Real-time Monitoring**: Checks visibility status every second
- **Secure Delivery**: Content is only served when authorized

## Sample Content

### Code Example

```javascript
function checkVisibility() {
    return fetch('/api/check-visibility')
        .then(response => response.json())
        .then(data => data.visible);
}
```

### Important Notes

> **Security Notice**: This content is protected and monitored. Unauthorized copying or distribution is not permitted.

### List of Features

1. **Markdown Rendering**: Full support for markdown syntax
2. **Visibility Checking**: Real-time status monitoring
3. **Access Control**: Dynamic content availability
4. **Copy Prevention**: Multiple layers of protection

## Usage Instructions

To view this content:

1. Ensure JavaScript is enabled in your browser
2. The visibility checker must return `{"visible": true}`
3. Content will auto-refresh if visibility status changes

---

**Document ID**: example-doc  
**Last Updated**: 2024-01-15  
**Status**: Protected Content