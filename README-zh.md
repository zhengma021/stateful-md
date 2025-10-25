# 状态化 Markdown

一个用于共享具有动态可见性控制和复制保护功能的 Markdown 内容的 TypeScript 应用程序。

[English](./README.md) | **中文**

## 概述

状态化 Markdown 允许您提供具有实时可见性控制的 Markdown 文档。只有当外部 API 确认可见性时，内容才可访问，并包含内置的复制保护机制。

## 功能特性

- **动态可见性控制**：内容可见性由外部 API 控制
- **实时监控**：每秒检查可见性状态
- **复制保护**：多层保护防止轻松提取内容
- **安全传输**：仅在授权时提供内容
- **JavaScript 必需**：禁用 JavaScript 时隐藏内容
- **优雅错误处理**：用户友好的错误页面和消息
- **中文支持**：完整支持中文内容和字符编码

## 安装

1. 克隆仓库：
```bash
git clone <repository-url>
cd stateful-md
```

2. 安装依赖：
```bash
npm install
```

3. 构建项目：
```bash
npm run build
```

## 使用方法

### 基本用法

使用 `s-md-visible` 任务运行应用程序：

```bash
npm start s-md-visible \
  --file ./scripts/example.md \
  --sharing-name my-document \
  --checking-url http://localhost:3001/api/check-visibility \
  --port 3000
```

### 中文内容示例

```bash
npm start s-md-visible \
  --file ./scripts/test-chinese/example-chinese.md \
  --sharing-name 中文文档 \
  --checking-url http://localhost:3001/api/check-visibility \
  --port 3000
```

### 命令行参数

- `--file <path>`：要提供的 Markdown 文件路径
- `--sharing-name <name>`：共享内容的唯一名称（支持中文）
- `--checking-url <url>`：返回可见性状态的 URL（必须返回包含 `visible` 布尔字段的 JSON）
- `--port <number>`：运行服务器的端口

### 可见性 API 示例

您的可见性检查 URL 必须返回以下格式的 JSON：

```json
{
  "visible": true
}
```

API 应该：
- 返回 HTTP 200 状态
- 具有 `application/json` 内容类型
- 包含 `visible` 布尔字段

## API 端点

运行后，服务器提供以下端点：

- `GET /` - 带有服务器信息的主页
- `GET /stateful-md/{sharing-name}` - 访问 Markdown 内容
- `GET /check-md-visible/{sharing-name}` - 内部可见性检查
- `GET /health` - 健康检查端点

## 工作原理

1. **服务器启动**：应用程序验证参数并启动 Express 服务器
2. **内容请求**：当用户访问 `/stateful-md/{sharing-name}` 时，服务器：
   - 检查共享名称是否与配置的名称匹配
   - 查询外部可见性 API
   - 如果可见则提供受保护的 HTML，否则显示 404
3. **实时监控**：客户端 JavaScript：
   - 每秒轮询可见性 API
   - 根据可见性状态显示/隐藏内容
   - 如果可见性发生变化则自动重新加载
4. **复制保护**：多种机制防止轻松复制内容：
   - CSS 用户选择禁用
   - 键盘快捷键被阻止
   - 右键上下文菜单禁用
   - 内容在 JavaScript 中编码

## 安全特性

- **内容编码**：Markdown 内容在客户端进行 base64 编码
- **无直接访问**：没有 JavaScript 就无法直接访问内容
- **可见性验证**：持续检查外部 API
- **复制防护**：多层复制保护
- **安全头部**：设置适当的 HTTP 安全头部
- **UTF-8 支持**：完整支持中文字符和 Unicode

## 中文内容支持

### 字符编码
- 完全支持 UTF-8 编码
- 正确处理中文字符、标点符号和特殊符号
- 支持简体中文和繁体中文

### 字体优化
- 针对中文内容优化的字体栈
- 更好的行高和字符间距
- 改进的混合语言内容显示

### 分享名称
- 支持中文字符作为分享名称
- 自动处理 URL 编码
- 支持中英文混合命名

## 可见性服务器示例

以下是一个可作为可见性检查器的简单 Node.js 服务器：

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
  console.log('可见性 API 在端口 3001 上运行');
});
```

## 开发

### 可用脚本

- `npm run build` - 将 TypeScript 构建为 JavaScript
- `npm start` - 构建并运行应用程序
- `npm run dev` - 使用 ts-node 进行开发
- `npm run clean` - 删除构建产物
- `npm run test-server` - 运行测试可见性服务器
- `./scripts/demo.sh` - 运行交互式演示
- `./scripts/test-chinese/test-chinese-simple.sh` - 测试中文内容功能

### 项目结构

```
src/
├── index.ts          # 主入口点
├── cli.ts            # 命令行界面
├── types.ts          # TypeScript 类型定义
├── tasks/
│   └── sMdVisible.ts # 主要任务实现
├── routes/
│   └── markdownRoutes.ts # Express 路由
└── utils/
    ├── markdown.ts   # Markdown 处理
    └── visibility.ts # 可见性检查
```

## 配置

### 环境变量

- `CHECKING_DOMAIN` - 可见性检查的默认域名（默认：http://localhost:3000）

### 文件要求

- Markdown 文件必须具有 `.md` 或 `.markdown` 扩展名
- 文件必须可被应用程序读取
- 分享名称必须包含字母（包括中文）、数字、连字符和下划线
- 文件必须使用 UTF-8 编码保存

## 快速开始

### 运行演示

```bash
# 完整演示（英文内容）
./scripts/demo.sh

# 中文内容测试
./scripts/test-chinese/test-chinese-simple.sh

# 或手动启动
# 终端 1：启动可见性服务器
node scripts/test-visibility-server.js

# 终端 2：启动 Markdown 服务器
npm start -- s-md-visible \
  --file ./scripts/test-chinese/example-chinese.md \
  --sharing-name 演示文档 \
  --checking-url http://localhost:3001/api/check-visibility \
  --port 3000
```

### 测试可见性控制

```bash
# 检查当前可见性
curl http://localhost:3001/api/check-visibility

# 切换可见性（观察浏览器中内容的变化）
curl -X POST http://localhost:3001/api/toggle-visibility

# 设置为不可见
curl -X POST http://localhost:3001/api/set-visibility \
  -H "Content-Type: application/json" \
  -d '{"visible": false}'

# 设置为可见
curl -X POST http://localhost:3001/api/set-visibility \
  -H "Content-Type: application/json" \
  -d '{"visible": true}'
```

## 故障排除

### 常见问题

1. **端口已被使用**：使用 `--port <number>` 选择不同端口
2. **文件未找到**：确保 Markdown 文件路径正确且可读
3. **无效的检查 URL**：验证 URL 是否可访问并返回正确的 JSON
4. **可见性 API 错误**：检查您的可见性 API 是否运行且可达
5. **中文字符显示问题**：确保文件以 UTF-8 编码保存

### 错误消息

应用程序为以下情况提供详细的错误消息：
- 无效文件路径
- 不可访问的检查 URL
- 格式错误的 API 响应
- 网络连接问题
- 字符编码问题

### 中文内容故障排除

1. **文件编码**：确保 Markdown 文件以 UTF-8 编码保存
2. **字符显示**：检查浏览器是否支持中文字体
3. **URL 编码**：中文分享名称会自动进行 URL 编码
4. **混合内容**：中英文混合内容应该正常显示

## 示例文件

- `scripts/example.md` - 英文示例文档
- `scripts/test-chinese/example-chinese.md` - 中文示例文档
- `scripts/test-visibility-server.js` - 测试可见性服务器
- `scripts/demo.sh` - 完整演示脚本
- `scripts/test-chinese/test-chinese-simple.sh` - 中文内容测试脚本

## 许可证

MIT 许可证 - 详情请参见 LICENSE 文件。

## 贡献

1. Fork 仓库
2. 创建功能分支
3. 进行更改
4. 如适用，添加测试
5. 提交拉取请求

## 支持

如有问题和疑问，请在仓库中创建 issue。

## 更新日志

### v1.0.0
- ✅ 完整的 TypeScript 实现
- ✅ 动态可见性控制
- ✅ 复制保护机制
- ✅ 实时监控
- ✅ 中文内容支持
- ✅ UTF-8 字符编码
- ✅ 安全特性
- ✅ 命令行界面
- ✅ 演示和测试工具