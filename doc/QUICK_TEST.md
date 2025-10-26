# Quick Test Guide

This is a step-by-step guide to quickly test the Stateful Markdown application.

## Prerequisites

Make sure you have Node.js installed and have run:
```bash
npm install
npm run build
```

## Quick Test (Manual)

### Step 1: Start the Test Visibility Server

Open Terminal 1 and run:
```bash
node scripts/test-visibility-server.js
```

You should see:
```
🚀 Test Visibility Server Started
📊 Server Details:
   Port: 3001
   Initial Visibility: true
```

### Step 2: Start the Stateful Markdown Server

Open Terminal 2 and run:
```bash
npm start -- s-md-visible \
  --file ./scripts/example.md \
  --sharing-name demo-doc \
  --checking-url http://localhost:3001/api/check-visibility \
  --port 3000
```

You should see:
```
🚀 Stateful Markdown server started successfully!
📊 Server Details:
   Port: 3000
   Sharing Name: demo-doc
   Markdown File: /path/to/example.md
   Checking URL: http://localhost:3001/api/check-visibility
```

### Step 3: Open the Content in Your Browser

Visit: http://localhost:3000/stateful-md/demo-doc

You should see the markdown content rendered with copy protection.

### Step 4: Test Dynamic Visibility Control

Open Terminal 3 and run:

**Check current visibility:**
```bash
curl http://localhost:3001/api/check-visibility
```
Response: `{"visible":true,"timestamp":"...","message":"Content is visible"}`

**Hide the content:**
```bash
curl -X POST http://localhost:3001/api/toggle-visibility
```
Response: `{"visible":false,"message":"Visibility disabled","timestamp":"..."}`

→ **Go back to your browser - the content should disappear within 1 second!**

**Show the content again:**
```bash
curl -X POST http://localhost:3001/api/toggle-visibility
```
Response: `{"visible":true,"message":"Visibility enabled","timestamp":"..."}`

→ **The content should reappear in your browser within 1 second!**

## Quick Test (Automated)

Simply run:
```bash
./scripts/demo.sh
```

This will:
1. Start both servers automatically
2. Open your browser to the content
3. Show you the test commands

## Test the Copy Protection

1. Try to select text on the page (should be disabled)
2. Try right-clicking (should be disabled)
3. Try Ctrl+C, Ctrl+A (should be blocked)
4. Try F12 to open developer tools (should be blocked)
5. Disable JavaScript in your browser and reload - you should see a "JavaScript Required" message

## Test Different Scenarios

### Test with Invalid Sharing Name
```bash
# Visit: http://localhost:3000/stateful-md/wrong-name
# Should show "Content Not Found" page
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Home page
curl http://localhost:3000/

# Visibility check (internal)
curl http://localhost:3000/check-md-visible/demo-doc
```

### Test Visibility API
```bash
# Set visibility to false
curl -X POST http://localhost:3001/api/set-visibility \
  -H "Content-Type: application/json" \
  -d '{"visible": false}'

# Set visibility to true
curl -X POST http://localhost:3001/api/set-visibility \
  -H "Content-Type: application/json" \
  -d '{"visible": true}'

# Get server status
curl http://localhost:3001/status
```

## Expected Behavior

✅ **When visible=true**: Content shows normally with copy protection
✅ **When visible=false**: Shows "Content Not Available" message
✅ **Real-time updates**: Changes appear within 1 second
✅ **Copy protection**: Text selection, right-click, shortcuts disabled
✅ **JavaScript required**: Content hidden when JS is disabled
✅ **Security headers**: Proper HTTP security headers set

## Troubleshooting

**Port already in use:**
```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001

# Kill processes if needed
pkill -f "test-visibility-server"
pkill -f "stateful-md"
```

**Content not showing:**
- Check that visibility server returns `{"visible": true}`
- Verify the sharing name matches exactly
- Check browser console for JavaScript errors
- Ensure the checking URL is accessible

**Build errors:**
```bash
# Clean and rebuild
npm run clean
npm run build
```

## Stop the Servers

Press `Ctrl+C` in each terminal window, or run:
```bash
pkill -f "node.*stateful-md"
pkill -f "test-visibility-server"
```

## Success Indicators

✅ Both servers start without errors
✅ Browser opens to content automatically
✅ Content is visible and protected
✅ Visibility toggles work in real-time
✅ Copy protection mechanisms are active
✅ Error pages work for invalid URLs
✅ Health checks return proper JSON