# Stateful Markdown Usage Guide

This guide provides comprehensive instructions for using the Stateful Markdown application.

## Quick Start

### 1. Installation

```bash
# Clone and install
git clone <repository-url>
cd stateful-md
npm install
npm run build
```

### 2. Basic Usage

```bash
npm start -- s-md-visible \
  --file ./scripts/example.md \
  --sharing-name my-document \
  --checking-url http://localhost:3001/api/check-visibility \
  --port 3000
```

### 3. Run Demo

For a complete demonstration:

```bash
# Run the interactive demo
./scripts/demo.sh
```

Or manually:

```bash
# Terminal 1: Start visibility server
node scripts/test-visibility-server.js

# Terminal 2: Start stateful markdown server
npm start -- s-md-visible \
  --file ./scripts/example.md \
  --sharing-name demo-doc \
  --checking-url http://localhost:3001/api/check-visibility \
  --port 3000
```

## Command Reference

### Main Command

```bash
npm start s-md-visible [options]
```

### Required Options

| Option | Description | Example |
|--------|-------------|---------|
| `--file <path>` | Path to markdown file | `--file ./my-doc.md` |
| `--sharing-name <name>` | Unique sharing identifier | `--sharing-name my-shared-doc` |
| `--checking-url <url>` | Visibility API endpoint | `--checking-url http://api.example.com/check` |
| `--port <number>` | Server port | `--port 3000` |

### Sharing Name Rules

- Only letters, numbers, hyphens, and underscores
- 1-50 characters in length
- Must be unique for your deployment

Examples:
- ✅ `my-document`
- ✅ `project_overview_2024`
- ✅ `user-guide-v1`
- ❌ `my document` (contains space)
- ❌ `doc@123` (contains special character)

## Visibility API Requirements

Your visibility checking URL must:

1. **Return HTTP 200** status code
2. **Content-Type**: `application/json`
3. **Response format**:
   ```json
   {
     "visible": true
   }
   ```

### Example Visibility Server

```javascript
const express = require('express');
const app = express();

let isVisible = true;

app.get('/api/check-visibility', (req, res) => {
  res.json({ visible: isVisible });
});

app.post('/api/toggle', (req, res) => {
  isVisible = !isVisible;
  res.json({ visible: isVisible });
});

app.listen(3001);
```

## Server Endpoints

Once running, your server provides:

### Public Endpoints

- `GET /` - Server home page
- `GET /stateful-md/{sharing-name}` - Access markdown content
- `GET /health` - Health check

### API Endpoints

- `GET /check-md-visible/{sharing-name}` - Internal visibility check

## Content Access Flow

1. **User visits** `/stateful-md/{sharing-name}`
2. **Server checks** visibility via your API
3. **If visible**: Serves protected HTML with markdown
4. **If not visible**: Shows 404 page
5. **Client-side**: Polls visibility every 1 second
6. **Auto-reload**: Content appears/disappears based on API

## Security Features

### Copy Protection

The application implements multiple layers:

- CSS `user-select: none`
- Keyboard shortcut blocking (Ctrl+C, Ctrl+A, etc.)
- Right-click context menu disabled
- Content base64 encoded in JavaScript
- Developer tools access prevention

### Access Control

- Content only visible with JavaScript enabled
- Real-time visibility monitoring
- Secure HTTP headers
- No direct file access

### Limitations

Users can still:
- View page source (but content is encoded)
- Use browser developer tools (with effort)
- Screenshot or photograph content
- Use accessibility tools

## Advanced Usage

### Environment Variables

```bash
export CHECKING_DOMAIN=https://your-api-domain.com
npm start s-md-visible --file ./doc.md --sharing-name doc --checking-url $CHECKING_DOMAIN/api/visible --port 3000
```

### Multiple Documents

Run multiple instances on different ports:

```bash
# Document 1
npm start -- s-md-visible --file ./scripts/example.md --sharing-name doc1 --checking-url http://api.example.com/check/doc1 --port 3000

# Document 2  
npm start -- s-md-visible --file ./scripts/test-chinese/example-chinese.md --sharing-name doc2 --checking-url http://api.example.com/check/doc2 --port 3001
```

### Production Deployment

```bash
# Build for production
npm run build

# Run with PM2
pm2 start dist/index.js --name stateful-md -- s-md-visible \
  --file /path/to/document.md \
  --sharing-name production-doc \
  --checking-url https://api.yourdomain.com/visibility-check \
  --port 80
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```
Error: Port 3000 is already in use
```
**Solution**: Use a different port with `--port <number>`

#### File Not Found
```
Error: Markdown file not found: ./missing.md
```
**Solution**: Check file path and permissions

#### Invalid Checking URL
```
Error: Cannot connect to checking URL
```
**Solutions**:
- Verify URL is accessible
- Check network connectivity
- Ensure API returns correct JSON format

#### Content Not Visible
```
Content shows "Not Available"
```
**Solutions**:
- Check visibility API returns `{"visible": true}`
- Verify sharing name matches exactly
- Check browser console for JavaScript errors

### Debug Mode

Enable detailed logging:

```bash
DEBUG=* npm start s-md-visible --file ./doc.md --sharing-name debug-doc --checking-url http://localhost:3001/api/check --port 3000
```

### Testing Visibility API

```bash
# Test your API
curl -H "Accept: application/json" http://your-api.com/check-visibility

# Should return:
# {"visible": true}
```

## Examples

### Basic Document Sharing

```bash
# 1. Create your markdown file
echo "# My Secret Document\n\nThis is protected content." > scripts/secret.md

# 2. Start visibility server (in another terminal)
node scripts/test-visibility-server.js

# 3. Start stateful markdown
npm start -- s-md-visible \
  --file ./scripts/secret.md \
  --sharing-name secret-project \
  --checking-url http://localhost:3001/api/check-visibility \
  --port 3000

# 4. Access at: http://localhost:3000/stateful-md/secret-project
```

### Dynamic Content Control

```bash
# Make content visible
curl -X POST http://localhost:3001/api/set-visibility \
  -H "Content-Type: application/json" \
  -d '{"visible": true}'

# Hide content
curl -X POST http://localhost:3001/api/set-visibility \
  -H "Content-Type: application/json" \
  -d '{"visible": false}'

# Toggle visibility
curl -X POST http://localhost:3001/api/toggle-visibility
```

### Integration Example

```javascript
// Your application code
const toggleDocumentAccess = async (documentId, visible) => {
  await fetch(`/api/documents/${documentId}/visibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visible })
  });
};

// Start stateful markdown server
const { spawn } = require('child_process');

const startMarkdownServer = (docPath, sharingName, port) => {
  return spawn('npm', ['start', 's-md-visible', 
    '--file', docPath,
    '--sharing-name', sharingName,
    '--checking-url', `http://localhost:3001/api/check/${sharingName}`,
    '--port', port.toString()
  ]);
};
```

## API Integration

### Webhook Support

You can integrate with webhooks to dynamically control visibility:

```javascript
// Express.js webhook handler
app.post('/webhook/document-access', (req, res) => {
  const { documentId, action } = req.body;
  
  if (action === 'grant-access') {
    setDocumentVisibility(documentId, true);
  } else if (action === 'revoke-access') {
    setDocumentVisibility(documentId, false);
  }
  
  res.json({ success: true });
});
```

### Database Integration

```javascript
// Check visibility from database
app.get('/api/check-visibility/:docId', async (req, res) => {
  const { docId } = req.params;
  
  try {
    const document = await db.documents.findOne({
      sharingName: docId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    
    res.json({ 
      visible: !!document,
      expiresAt: document?.expiresAt 
    });
  } catch (error) {
    res.json({ visible: false });
  }
});
```

## Performance Considerations

### Polling Frequency

The default polling interval is 1 second. For high-traffic deployments, consider:

- Caching visibility responses
- Using WebSocket connections
- Implementing exponential backoff

### Resource Usage

- Each client polls every second
- Consider rate limiting your visibility API
- Monitor server resources under load

## Security Considerations

### Content Protection Levels

1. **Basic**: CSS and JavaScript protection (current implementation)
2. **Enhanced**: Server-side rendering with session tokens
3. **Advanced**: DRM-like solutions with encrypted content

### Recommendations

- Use HTTPS in production
- Implement rate limiting
- Log access attempts
- Consider IP whitelisting for sensitive content
- Regular security audits

## Support

For issues and questions:

1. Check this usage guide
2. Review error messages carefully
3. Test with the provided example files
4. Create an issue in the repository