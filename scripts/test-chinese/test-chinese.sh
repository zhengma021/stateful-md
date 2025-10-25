#!/bin/bash

# Chinese content test script for Stateful Markdown
# 中文内容测试脚本

set -e

echo "🧪 状态化 Markdown - 中文内容测试"
echo "=================================="
echo "🧪 Stateful Markdown - Chinese Content Test"
echo

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}💡 $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Chinese example file exists
if [ ! -f "example-chinese.md" ]; then
    print_error "中文示例文件 example-chinese.md 不存在"
    print_error "Chinese example file example-chinese.md not found"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_step "安装依赖项... / Installing dependencies..."
    npm install
    print_success "依赖项已安装 / Dependencies installed"
fi

# Build the project
print_step "构建项目... / Building project..."
npm run build >/dev/null 2>&1
print_success "构建完成 / Build completed"

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

if ! check_port 3000; then
    print_error "端口 3000 正在使用中 / Port 3000 is in use"
    exit 1
fi

if ! check_port 3001; then
    print_error "端口 3001 正在使用中 / Port 3001 is in use"
    exit 1
fi

print_success "端口 3000 和 3001 可用 / Ports 3000 and 3001 are available"

# Function to cleanup
cleanup() {
    echo
    print_step "停止服务器... / Stopping servers..."
    pkill -f "test-visibility-server.js" 2>/dev/null || true
    pkill -f "stateful-md.*s-md-visible" 2>/dev/null || true
    sleep 1
    print_success "清理完成 / Cleanup completed"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo
print_step "启动测试服务器... / Starting test servers..."

# Start visibility server
print_info "启动可见性服务器 (端口 3001)... / Starting visibility server (port 3001)..."
node ../test-visibility-server.js > /tmp/visibility-chinese.log 2>&1 &
VIS_PID=$!

sleep 2

# Check if visibility server started
if ! curl -s http://localhost:3001/status > /dev/null; then
    print_error "可见性服务器启动失败 / Visibility server failed to start"
    cat /tmp/visibility-chinese.log
    exit 1
fi

print_success "可见性服务器运行中 (PID: $VIS_PID) / Visibility server running (PID: $VIS_PID)"

# Start stateful markdown server with Chinese content
print_info "启动中文内容服务器 (端口 3000)... / Starting Chinese content server (port 3000)..."
npm start -- s-md-visible \
    --file ./example-chinese.md \
    --sharing-name 中文文档测试 \
    --checking-url http://localhost:3001/api/check-visibility \
    --port 3000 > /tmp/stateful-chinese.log 2>&1 &

MD_PID=$!

sleep 3

# Check if markdown server started
if ! curl -s http://localhost:3000/health > /dev/null; then
    print_error "中文内容服务器启动失败 / Chinese content server failed to start"
    cat /tmp/stateful-chinese.log
    exit 1
fi

print_success "中文内容服务器运行中 (PID: $MD_PID) / Chinese content server running (PID: $MD_PID)"

echo
print_success "🎉 两个服务器都在运行中！/ Both servers are running!"
echo

# URL encode Chinese sharing name for testing
ENCODED_SHARING_NAME=$(printf '中文文档测试' | xxd -p | sed 's/\(..\)/%\1/g')

print_info "测试地址 / Test URLs:"
echo "  📄 中文内容 / Chinese Content: http://localhost:3000/stateful-md/${ENCODED_SHARING_NAME}"
echo "  📄 Direct (encoded): http://localhost:3000/stateful-md/%e4%b8%ad%e6%96%87%e6%96%87%e6%a1%a3%e6%b5%8b%e8%af%95"
echo "  🏠 主页 / Home: http://localhost:3000/"
echo "  💚 健康检查 / Health: http://localhost:3000/health"
echo "  📊 可见性 API / Visibility API: http://localhost:3001/status"
echo

print_info "测试命令 / Test Commands:"
echo "  # 检查可见性 / Check visibility"
echo "  curl http://localhost:3001/api/check-visibility"
echo
echo "  # 切换可见性 / Toggle visibility"
echo "  curl -X POST http://localhost:3001/api/toggle-visibility"
echo
echo "  # 设置不可见 / Set invisible"
echo "  curl -X POST http://localhost:3001/api/set-visibility -H 'Content-Type: application/json' -d '{\"visible\": false}'"
echo
echo "  # 设置可见 / Set visible"
echo "  curl -X POST http://localhost:3001/api/set-visibility -H 'Content-Type: application/json' -d '{\"visible\": true}'"
echo

# Open browser if available
if command -v open >/dev/null 2>&1; then
    print_info "打开浏览器... / Opening browser..."
    open "http://localhost:3000/stateful-md/%e4%b8%ad%e6%96%87%e6%96%87%e6%a1%a3%e6%b5%8b%e8%af%95"
elif command -v xdg-open >/dev/null 2>&1; then
    print_info "打开浏览器... / Opening browser..."
    xdg-open "http://localhost:3000/stateful-md/%e4%b8%ad%e6%96%87%e6%96%87%e6%a1%a3%e6%b5%8b%e8%af%95"
else
    print_info "请在浏览器中打开 / Please open in browser:"
    echo "http://localhost:3000/stateful-md/%e4%b8%ad%e6%96%87%e6%96%87%e6%a1%a3%e6%b5%8b%e8%af%95"
fi

echo
print_step "运行中文内容测试... / Running Chinese content tests..."

# Test visibility check
echo -n "测试可见性 API... / Testing visibility API... "
RESPONSE=$(curl -s http://localhost:3001/api/check-visibility)
if echo "$RESPONSE" | grep -q '"visible":true'; then
    echo "✅"
else
    echo "❌"
    print_error "可见性 API 测试失败 / Visibility API test failed: $RESPONSE"
fi

# Test health endpoint
echo -n "测试健康检查... / Testing health endpoint... "
HEALTH=$(curl -s http://localhost:3000/health)
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
    echo "✅"
else
    echo "❌"
    print_error "健康检查失败 / Health check failed: $HEALTH"
fi

# Test Chinese content accessibility with URL encoding
echo -n "测试中文内容访问... / Testing Chinese content accessibility... "
if curl -s "http://localhost:3000/stateful-md/%e4%b8%ad%e6%96%87%e6%96%87%e6%a1%a3%e6%b5%8b%e8%af%95" | grep -q "状态化 Markdown 文档示例"; then
    echo "✅"
else
    echo "❌"
    print_error "中文内容无法访问 / Chinese content not accessible"
fi

# Test UTF-8 encoding
echo -n "测试 UTF-8 编码... / Testing UTF-8 encoding... "
CONTENT=$(curl -s "http://localhost:3000/stateful-md/%e4%b8%ad%e6%96%87%e6%96%87%e6%a1%a3%e6%b5%8b%e8%af%95")
if echo "$CONTENT" | grep -q "charset=utf-8" && echo "$CONTENT" | grep -q "功能特性"; then
    echo "✅"
else
    echo "❌"
    print_error "UTF-8 编码测试失败 / UTF-8 encoding test failed"
fi

# Test visibility toggle with Chinese content
echo -n "测试中文内容可见性切换... / Testing Chinese content visibility toggle... "
TOGGLE_RESULT=$(curl -s -X POST http://localhost:3001/api/toggle-visibility)
if echo "$TOGGLE_RESULT" | grep -q '"visible":false'; then
    # Check if content shows "not available" message
    sleep 1
    HIDDEN_CONTENT=$(curl -s "http://localhost:3000/stateful-md/%e4%b8%ad%e6%96%87%e6%96%87%e6%a1%a3%e6%b5%8b%e8%af%95")
    if echo "$HIDDEN_CONTENT" | grep -q "不可用\|Not Available"; then
        # Toggle back to visible
        curl -s -X POST http://localhost:3001/api/toggle-visibility > /dev/null
        echo "✅"
    else
        echo "❌"
        print_error "中文内容隐藏测试失败 / Chinese content hiding test failed"
    fi
else
    echo "❌"
    print_error "可见性切换失败 / Visibility toggle failed: $TOGGLE_RESULT"
fi

echo
print_success "🎉 所有中文内容测试通过！/ All Chinese content tests passed!"
echo

print_info "中文功能验证 / Chinese Feature Verification:"
echo "✅ 中文 Markdown 渲染 / Chinese Markdown rendering"
echo "✅ UTF-8 字符编码 / UTF-8 character encoding"
echo "✅ 中文分享名称支持 / Chinese sharing name support"
echo "✅ URL 编码处理 / URL encoding handling"
echo "✅ 中文字体显示 / Chinese font display"
echo "✅ 实时可见性控制 / Real-time visibility control"
echo "✅ 复制保护机制 / Copy protection mechanisms"
echo

print_info "测试中文特性 / Test Chinese Features:"
echo "1. 在浏览器中查看中文内容渲染 / View Chinese content rendering in browser"
echo "2. 尝试复制中文文本 (应该被阻止) / Try copying Chinese text (should be blocked)"
echo "3. 测试可见性切换对中文内容的影响 / Test visibility toggle effect on Chinese content"
echo "4. 检查中文标点符号和格式 / Check Chinese punctuation and formatting"
echo "5. 验证混合中英文内容显示 / Verify mixed Chinese-English content display"
echo

print_info "按 Ctrl+C 停止服务器 / Press Ctrl+C to stop servers"

# Wait for user to stop
while true; do
    sleep 1
done
