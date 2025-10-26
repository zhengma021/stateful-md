#!/bin/bash

# Test script to verify cache-busting fix works correctly
# This script tests that content immediately disappears when the visibility server is killed

set -e

echo "🧪 Testing Cache-Busting Fix for Stateful Markdown"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to cleanup processes
cleanup() {
    echo -e "\n🧹 Cleaning up..."
    pkill -f "test-visibility-server" 2>/dev/null || true
    pkill -f "stateful-md.*s-md-visible" 2>/dev/null || true
    sleep 1
}

# Cleanup on exit
trap cleanup EXIT

# Step 1: Start visibility server
echo -e "${BLUE}1. Starting test visibility server...${NC}"
node scripts/test-visibility-server.js &
VISIBILITY_PID=$!
sleep 2

# Check if visibility server is running
if ! curl -s http://localhost:3001/api/check-visibility > /dev/null; then
    echo -e "${RED}❌ Failed to start visibility server${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Visibility server started${NC}"

# Step 2: Start stateful markdown server
echo -e "${BLUE}2. Starting stateful markdown server...${NC}"
npm start -- s-md-visible \
  --file ./scripts/example.md \
  --sharing-name cache-test-doc \
  --checking-url http://localhost:3001/api/check-visibility \
  --port 3002 &
MARKDOWN_PID=$!
sleep 3

# Check if markdown server is running
if ! curl -s http://localhost:3002/health > /dev/null; then
    echo -e "${RED}❌ Failed to start markdown server${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Markdown server started${NC}"

# Step 3: Verify content is initially visible
echo -e "${BLUE}3. Testing initial visibility...${NC}"
INITIAL_CHECK=$(curl -s http://localhost:3001/api/check-visibility | grep -o '"visible":true' || echo "")
if [ -n "$INITIAL_CHECK" ]; then
    echo -e "${GREEN}✅ Content initially visible${NC}"
else
    echo -e "${RED}❌ Content not initially visible${NC}"
    exit 1
fi

# Step 4: Open browser for manual verification (optional)
echo -e "${BLUE}4. Opening browser for visual verification...${NC}"
echo -e "${YELLOW}   Please open: http://localhost:3002/stateful-md/cache-test-doc${NC}"
echo -e "${YELLOW}   You should see the content with 'Content Visible' status${NC}"

if command -v open >/dev/null 2>&1; then
    open http://localhost:3002/stateful-md/cache-test-doc 2>/dev/null || true
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:3002/stateful-md/cache-test-doc 2>/dev/null || true
fi

echo -e "${YELLOW}Press Enter when you can see the content in your browser...${NC}"
read -r

# Step 5: Kill visibility server to test cache-busting
echo -e "${BLUE}5. Killing visibility server to test cache fix...${NC}"
kill $VISIBILITY_PID 2>/dev/null || true
sleep 2

echo -e "${YELLOW}🔍 Now check your browser:${NC}"
echo -e "${YELLOW}   1. The content should disappear within 2-3 seconds${NC}"
echo -e "${YELLOW}   2. Status should change to 'Content Hidden'${NC}"
echo -e "${YELLOW}   3. You should see 'Content Not Available' message${NC}"
echo -e "${YELLOW}   4. Check browser console for timeout/error messages${NC}"

# Step 6: Verify server is actually down
echo -e "${BLUE}6. Verifying visibility server is down...${NC}"
if curl -s http://localhost:3001/api/check-visibility > /dev/null 2>&1; then
    echo -e "${RED}❌ Visibility server still responding (shouldn't happen)${NC}"
else
    echo -e "${GREEN}✅ Visibility server is down${NC}"
fi

# Step 7: Wait and ask for user confirmation
echo -e "${BLUE}7. Testing cache-busting behavior...${NC}"
echo -e "${YELLOW}Wait 10 seconds and observe the browser...${NC}"
for i in {10..1}; do
    echo -e "${YELLOW}Waiting $i seconds...${NC}"
    sleep 1
done

# Step 8: Manual verification
echo -e "${BLUE}8. Manual verification:${NC}"
echo -e "${YELLOW}Did the content disappear from the browser? (y/n)${NC}"
read -r CONTENT_DISAPPEARED

echo -e "${YELLOW}Did the status change to 'Content Hidden'? (y/n)${NC}"
read -r STATUS_CHANGED

echo -e "${YELLOW}Are there timeout/error messages in browser console? (y/n)${NC}"
read -r CONSOLE_ERRORS

# Step 9: Restart visibility server to test recovery
echo -e "${BLUE}9. Testing recovery - restarting visibility server...${NC}"
node scripts/test-visibility-server.js &
VISIBILITY_PID=$!
sleep 3

echo -e "${YELLOW}Wait 5 seconds and check if content reappears...${NC}"
for i in {5..1}; do
    echo -e "${YELLOW}Waiting $i seconds...${NC}"
    sleep 1
done

echo -e "${YELLOW}Did the content reappear? (y/n)${NC}"
read -r CONTENT_REAPPEARED

# Step 10: Results summary
echo -e "\n${BLUE}🏁 Test Results Summary${NC}"
echo "========================"

if [ "$CONTENT_DISAPPEARED" = "y" ]; then
    echo -e "${GREEN}✅ Cache-busting fix: Content disappeared when server killed${NC}"
    CACHE_FIX_WORKS=true
else
    echo -e "${RED}❌ Cache-busting fix: Content did NOT disappear (cache issue)${NC}"
    CACHE_FIX_WORKS=false
fi

if [ "$STATUS_CHANGED" = "y" ]; then
    echo -e "${GREEN}✅ Status indicator: Changed to 'Content Hidden'${NC}"
else
    echo -e "${RED}❌ Status indicator: Did NOT change properly${NC}"
fi

if [ "$CONSOLE_ERRORS" = "y" ]; then
    echo -e "${GREEN}✅ Error handling: Console shows timeout/error messages${NC}"
else
    echo -e "${YELLOW}⚠️  Error handling: No console messages (check manually)${NC}"
fi

if [ "$CONTENT_REAPPEARED" = "y" ]; then
    echo -e "${GREEN}✅ Recovery: Content reappeared when server restarted${NC}"
else
    echo -e "${RED}❌ Recovery: Content did NOT reappear${NC}"
fi

# Final verdict
if [ "$CACHE_FIX_WORKS" = true ]; then
    echo -e "\n${GREEN}🎉 SUCCESS: Cache-busting fix is working!${NC}"
    echo -e "${GREEN}The content now properly disappears when the server is killed.${NC}"
    exit 0
else
    echo -e "\n${RED}💥 FAILURE: Cache-busting fix needs more work${NC}"
    echo -e "${RED}The content is still being cached despite our fixes.${NC}"
    echo -e "${YELLOW}Check browser dev tools Network tab for cached responses.${NC}"
    exit 1
fi
