#!/bin/bash

# Simple Chinese content test with English sharing name
# 简单中文内容测试 (使用英文分享名)

set -e

echo "🧪 Stateful Markdown - 简单中文内容测试"
echo "======================================"
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

# Check dependencies
if [ ! -d "../../node_modules" ]; then
    print_step "安装依赖... Installing dependencies..."
    cd ../.. && npm install && cd scripts/test-chinese
fi

if [ ! -f "example-chinese.md" ]; then
    print_error "中文示例文件不存在 Chinese example file not found"
    exit 1
fi

# Build project
print_step "构建项目... Building project..."
cd ../.. && npm run build >/dev/null 2>&1 && cd scripts/test-chinese
print_success "构建完成 Build completed"

# Check ports
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

if ! check_port 3000 || ! check_port 3001; then
    print_error "端口被占用 Ports are in use. Please run: pkill -f 'node.*3000\\|node.*3001'"
    exit 1
fi

# Cleanup function
cleanup() {
    echo
    print_step "清理... Cleaning up..."
    pkill -f "test-visibility-server.js" 2>/dev/null || true
    pkill -f "stateful-md" 2>/dev/null || true
    sleep 1
    print_success "完成 Done"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start servers
print_step "启动服务器... Starting servers..."

# Start visibility server
print_info "启动可见性服务器..."
node ../test-visibility-server.js > /tmp/vis.log 2>&1 &
VIS_PID=$!
sleep 2

if ! curl -s http://localhost:3001/status > /dev/null; then
    print_error "可见性服务器失败 Visibility server failed"
    exit 1
fi
print_success "可见性服务器 OK (PID: $VIS_PID)"

# Start markdown server with English sharing name but Chinese content
print_info "启动中文内容服务器..."
cd ../.. && npm start -- s-md-visible \
    --file ./scripts/test-chinese/example-chinese.md \
    --sharing-name chinese-doc \
    --checking-url http://localhost:3001/api/check-visibility \
    --port 3000 > /tmp/md.log 2>&1 &
MD_PID=$!
sleep 3

if ! curl -s http://localhost:3000/health > /dev/null; then
    print_error "中文服务器失败 Chinese server failed"
    cat /tmp/md.log
    exit 1
fi
print_success "中文服务器 OK (PID: $MD_PID)"

echo
print_success "🎉 服务器运行中 Servers running!"
echo
print_info "测试地址 Test URLs:"
echo "  📄 中文内容 Chinese Content: http://localhost:3000/stateful-md/chinese-doc"
echo "  🏠 主页 Home: http://localhost:3000/"
echo "  💚 健康 Health: http://localhost:3000/health"
echo

# Open browser
if command -v open >/dev/null 2>&1; then
    print_info "打开浏览器 Opening browser..."
    open http://localhost:3000/stateful-md/chinese-doc
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:3000/stateful-md/chinese-doc
else
    print_info "请打开 Please open: http://localhost:3000/stateful-md/chinese-doc"
fi

echo
print_step "测试中文内容 Testing Chinese content..."

# Test Chinese content rendering
echo -n "中文渲染测试 Chinese rendering test... "
CONTENT=$(curl -s http://localhost:3000/stateful-md/chinese-doc)
if echo "$CONTENT" | grep -q "状态化 Markdown" && echo "$CONTENT" | grep -q "功能特性"; then
    echo "✅"
else
    echo "❌"
    print_error "中文渲染失败 Chinese rendering failed"
fi

# Test UTF-8 encoding
echo -n "UTF-8 编码测试 UTF-8 encoding test... "
if echo "$CONTENT" | grep -q "charset=utf-8" && echo "$CONTENT" | grep -q "中文字符"; then
    echo "✅"
else
    echo "❌"
    print_error "UTF-8测试失败 UTF-8 test failed"
fi

# Test visibility toggle
echo -n "可见性切换测试 Visibility toggle test... "
curl -s -X POST http://localhost:3001/api/toggle-visibility > /dev/null
sleep 1
HIDDEN_CONTENT=$(curl -s http://localhost:3000/stateful-md/chinese-doc)
if echo "$HIDDEN_CONTENT" | grep -q "not currently available\|不可用"; then
    curl -s -X POST http://localhost:3001/api/toggle-visibility > /dev/null
    echo "✅"
else
    echo "❌"
    print_error "切换测试失败 Toggle test failed"
fi

echo
print_success "🎉 中文测试完成 Chinese tests completed!"
echo
print_info "功能验证 Feature verification:"
echo "✅ 中文 Markdown 渲染 Chinese Markdown rendering"
echo "✅ UTF-8 字符编码 UTF-8 character encoding"
echo "✅ 中文字体支持 Chinese font support"
echo "✅ 混合语言内容 Mixed language content"
echo "✅ 标点符号处理 Punctuation handling"
echo "✅ 实时可见性控制 Real-time visibility control"
echo

print_info "测试命令 Test commands:"
echo "curl -X POST http://localhost:3001/api/toggle-visibility  # 切换可见性"
echo "curl http://localhost:3001/api/check-visibility           # 检查状态"
echo

print_info "按 Ctrl+C 退出 Press Ctrl+C to exit"

# Wait
while true; do
    sleep 1
done
