# Changelog - Version 0.3

## Stateful Markdown v0.3 - Configurable Timeout Support

**Release Date**: 2024-01-15

### 🎯 Overview

Version 0.3 introduces **configurable timeout support** for checking-url requests to address the issue where Serveo servers can be slow for users in different regions. Previously, timeouts were hardcoded to 2 seconds, but v0.3 makes this fully configurable via a new `--checking-url-timeout` parameter while maintaining complete backward compatibility.

---

## 🌟 New Features

### ⏱️ **Configurable Timeout Parameter**

#### **New CLI Option: `--checking-url-timeout <seconds>`**
Available on both `s-md-visible` and `serveo-share` commands:

```bash
# Local sharing with custom timeout
npm start -- s-md-visible \
  --file ./my-document.md \
  --sharing-name my-doc \
  --checking-url http://localhost:3001/api/check-visibility \
  --port 3000 \
  --checking-url-timeout 10

# Public Serveo sharing with custom timeout
npm start -- serveo-share \
  --file ./my-document.md \
  --sharing-name my-public-doc \
  --task-port 3000 \
  --checking-port 3001 \
  --checking-url-timeout 15
```

#### **Bash Script Support**
```bash
# start-serveo-public-share.sh now accepts 5th timeout parameter
./scripts/start-serveo-public-share.sh 3000 ./doc.md test 3001 10
```

#### **Parameter Validation**
- **Range**: 1-30 seconds (prevents unreasonably short or long timeouts)
- **Default**: 2 seconds (maintains v0.1-v0.2 behavior)
- **Type**: Integer validation with clear error messages

---

## 🏗️ Technical Implementation

### **Dual Timeout Application**

#### **1. Server-Side Timeout** (Node.js)
```typescript
// VisibilityChecker.ts - axios timeout
const response = await axios.get<VisibilityResponse>(this.checkingUrl, {
  timeout: this.timeoutSeconds * 1000, // Configurable instead of hardcoded 2000
  // ...
});
```

#### **2. Client-Side Timeout** (Browser JavaScript)
```javascript
// Injected into HTML template - browser fetch timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => {
    console.log('⏰ Request timeout after ${checkingUrlTimeoutSeconds} seconds');
    controller.abort();
}, ${checkingUrlTimeoutSeconds * 1000}); // Configurable instead of hardcoded 2000
```

### **Complete Data Flow**
```
User CLI Input
  ↓
--checking-url-timeout 10
  ↓
TaskArgs/ServeoShareArgs.checkingUrlTimeoutSeconds = 10
  ↓
ServerConfig.checkingUrlTimeoutSeconds = 10
  ↓
VisibilityChecker(url, timeout=10s) // Server-side axios
  ↓
MarkdownProcessor(timeout=10s) // Client-side JavaScript injection
  ↓
Browser: setTimeout(..., 10000) // Client polls with 10s timeout
```

---

## 📋 Files Modified

### **TypeScript Interfaces** (`src/types.ts`)
```typescript
export interface TaskArgs {
  // ... existing fields
  checkingUrlTimeoutSeconds?: number; // ✅ NEW
}

export interface ServeoShareArgs {
  // ... existing fields  
  checkingUrlTimeoutSeconds?: number; // ✅ NEW
}

export interface ServerConfig {
  // ... existing fields
  checkingUrlTimeoutSeconds?: number; // ✅ NEW
}
```

### **CLI Enhancement** (`src/cli.ts`)
- ✅ Added `--checking-url-timeout <seconds>` option to both commands
- ✅ Integer validation with 1-30 second range checking
- ✅ Default value assignment (2 seconds)
- ✅ Enhanced help text with timeout information

### **Core Classes Updated**

#### **VisibilityChecker** (`src/utils/visibility.ts`)
```typescript
// Before v0.3
constructor(checkingUrl: string)
timeout: 2000

// After v0.3
constructor(checkingUrl: string, timeoutSeconds: number = 2)
timeout: this.timeoutSeconds * 1000
```

#### **MarkdownProcessor** (`src/utils/markdown.ts`) 
```typescript
// Before v0.3
createProtectedMarkdownPage(content, sharingName, checkingUrl)
}, 2000);

// After v0.3
createProtectedMarkdownPage(content, sharingName, checkingUrl, checkingUrlTimeoutSeconds = 2)
}, ${checkingUrlTimeoutSeconds * 1000});
```

### **Task Implementation** (`src/tasks/sMdVisible.ts`)
- ✅ Pass timeout to VisibilityChecker constructor
- ✅ Pass timeout to MarkdownProcessor methods
- ✅ Include timeout in ServerConfig

### **Routes Integration** (`src/routes/markdownRoutes.ts`)
- ✅ Initialize VisibilityChecker with configurable timeout
- ✅ Pass timeout to createProtectedMarkdownPage method

### **Bash Script Support** (`scripts/start-serveo-public-share.sh`)
- ✅ Accept 5th optional timeout parameter (defaults to 2 seconds)
- ✅ Validate timeout range (1-30 seconds)  
- ✅ Pass timeout to npm start command via `--checking-url-timeout`
- ✅ Updated usage examples and error messages

---

## 🧪 Testing & Validation

### **Automated Validation**

#### **CLI Parameter Validation**
```bash
# ✅ Valid timeout values
npm start -- serveo-share --file ./doc.md --sharing-name test --checking-url-timeout 5

# ❌ Invalid timeout values (proper error messages)
npm start -- serveo-share --file ./doc.md --sharing-name test --checking-url-timeout 0
# Error: Checking URL timeout must be between 1 and 30 seconds

npm start -- serveo-share --file ./doc.md --sharing-name test --checking-url-timeout 31  
# Error: Checking URL timeout must be between 1 and 30 seconds
```

#### **Bash Script Validation**
```bash
# ✅ Valid bash usage
./scripts/start-serveo-public-share.sh 3000 ./doc.md test 3001 10

# ❌ Invalid timeout (proper error handling)
./scripts/start-serveo-public-share.sh 3000 ./doc.md test 3001 0
# ERROR: Invalid checking URL timeout: 0 (must be 1-30 seconds)
```

### **Runtime Verification**

#### **Server-Side Timeout Testing**
- ✅ VisibilityChecker respects configured timeout in axios calls
- ✅ Timeout errors logged with configured duration
- ✅ Different timeout values produce different behavior

#### **Client-Side Timeout Testing**  
- ✅ Browser JavaScript uses configured timeout in fetch requests
- ✅ Timeout messages show configured duration
- ✅ HTML content injection works correctly

### **Integration Testing**
```bash
# Test default behavior (backward compatibility)
npm start -- s-md-visible --file ./scripts/example.md --sharing-name test --checking-url http://localhost:3001/api/check-visibility --port 3000
# Client timeout: }, 2000) ✅

# Test custom timeout  
npm start -- s-md-visible --file ./scripts/example.md --sharing-name test --checking-url http://localhost:3001/api/check-visibility --port 3000 --checking-url-timeout 8
# Client timeout: }, 8000) ✅
```

---

## 🔄 Backward Compatibility

### **✅ 100% Backward Compatible**

#### **No Breaking Changes**
- **Existing CLI commands** work identically without `--checking-url-timeout`
- **Default behavior** unchanged (2-second timeout preserved)
- **All v0.0-v0.2 functionality** works exactly as before
- **Bash scripts** work with 4 parameters (5th timeout parameter optional)

#### **Migration Path**
- **Zero migration required** - purely additive enhancement
- **Gradual adoption** - users can add timeout parameter when needed
- **Existing documentation** remains valid for basic usage

### **Compatibility Examples**
```bash
# v0.2 commands still work exactly the same
npm start -- serveo-share --file ./doc.md --sharing-name test
./scripts/start-serveo-public-share.sh 3000 ./doc.md test 3001

# v0.3 adds optional timeout control  
npm start -- serveo-share --file ./doc.md --sharing-name test --checking-url-timeout 10
./scripts/start-serveo-public-share.sh 3000 ./doc.md test 3001 10
```

---

## 🌍 Use Cases & Benefits

### **Regional Network Optimization**

#### **Slow Serveo Regions**
```bash
# Asia-Pacific users experiencing slow Serveo connections
npm start -- serveo-share \
  --file ./important-doc.md \
  --sharing-name asia-doc \
  --checking-url-timeout 15  # Increased from default 2s

# European users with moderate latency  
npm start -- serveo-share \
  --file ./project-plan.md \
  --sharing-name eu-plan \
  --checking-url-timeout 6   # Slightly increased

# US users with good connectivity (can use default)
npm start -- serveo-share \
  --file ./status-report.md \
  --sharing-name us-report
  # Uses default 2s timeout
```

### **Network Condition Adaptation**

#### **Development vs Production**
```bash
# Development (local network, fast)
npm start -- s-md-visible \
  --file ./dev-notes.md \
  --sharing-name dev \
  --checking-url http://localhost:3001/api/check \
  --port 3000
  # Default 2s timeout sufficient

# Production (public internet, potentially slow)
npm start -- serveo-share \
  --file ./prod-manual.md \
  --sharing-name production \
  --checking-url-timeout 20  # Generous timeout for reliability
```

#### **Mobile/Satellite Internet**
```bash
# Users on slow connections
npm start -- serveo-share \
  --file ./mobile-guide.md \
  --sharing-name mobile \
  --checking-url-timeout 25  # Very generous for slow connections
```

---

## 📊 Performance Impact

### **⚡ Positive Improvements**

#### **Reduced False Timeouts**  
- **Before v0.3**: Fixed 2s timeout caused failures on slow networks
- **After v0.3**: Users can set appropriate timeout for their conditions
- **Result**: Fewer timeout-related visibility check failures

#### **Better User Experience**
- **Faster Networks**: Can use shorter timeouts (1-2s) for quick feedback
- **Slower Networks**: Can use longer timeouts (10-20s) for reliability
- **Regional Adaptation**: Timeout tuned to local Serveo server performance

### **📈 Metrics**

#### **Flexibility Improvements**
- **Timeout Range**: 1-30 seconds (vs. fixed 2s in v0.2)
- **Granularity**: 1-second precision for fine-tuning
- **Validation**: Prevents unreasonable values (0s or >30s)

#### **Network Tolerance**
- **Minimum**: 1s for very fast local networks
- **Default**: 2s maintains v0.1-v0.2 behavior  
- **Maximum**: 30s for extremely slow/unreliable connections

---

## 🐛 Issues Resolved

### **Fixed Problems**

#### **Serveo Regional Latency**
- **Issue**: Hardcoded 2s timeout too short for some regions accessing Serveo
- **Solution**: Configurable timeout allows users to adapt to their network conditions
- **Benefit**: Improved reliability for global Serveo usage

#### **Network Variability**
- **Issue**: Fixed timeout didn't account for varying network conditions
- **Solution**: User-controlled timeout adaptation
- **Benefit**: Works reliably across different network environments

#### **Development vs Production**
- **Issue**: Same timeout for local development and public internet
- **Solution**: Environment-appropriate timeout configuration
- **Benefit**: Optimal performance in each deployment scenario

---

## 📚 Documentation Updates

### **Updated Help Text**
```bash
npm start -- s-md-visible --help
# Shows: --checking-url-timeout <seconds>  Timeout in seconds for checking URL requests (default: 2 seconds)

npm start -- serveo-share --help  
# Shows: --checking-url-timeout <seconds>  Timeout in seconds for checking URL requests (default: 2 seconds)
```

### **Enhanced Usage Examples**
```bash
# Basic usage (unchanged)
npm start -- serveo-share --file ./doc.md --sharing-name test

# With custom timeout (new in v0.3)
npm start -- serveo-share --file ./doc.md --sharing-name test --checking-url-timeout 10

# Bash script with timeout (new in v0.3)
./scripts/start-serveo-public-share.sh 3000 ./doc.md test 3001 15
```

---

## 🔮 Future Considerations

### **Potential v0.4 Enhancements**

#### **Advanced Timeout Features**
- **Auto-detection**: Measure initial latency and auto-set timeout
- **Adaptive timeouts**: Adjust timeout based on success/failure patterns
- **Per-region presets**: Built-in timeout presets for different geographic regions

#### **Enhanced Monitoring**
- **Timeout statistics**: Track timeout success/failure rates
- **Performance metrics**: Monitor actual response times vs. configured timeouts
- **Regional recommendations**: Suggest optimal timeouts based on usage patterns

#### **Configuration Management**
- **Config files**: Save timeout preferences in configuration files
- **Environment variables**: Set default timeouts via environment variables
- **Profile-based settings**: Different timeout profiles for different use cases

---

## ✅ **PROJECT STATUS: v0.3 COMPLETE**

**Last Updated**: 2024-01-15  
**Version**: 0.3.0  
**Status**: Production Ready with Configurable Timeout Support  
**Chinese Support**: Full Implementation (Preserved)  
**Public Sharing**: Full Serveo Integration (Preserved)  
**Backward Compatibility**: 100% Compatible  

### **v0.3 Achievements**
- ✅ **Configurable Timeout Support**: Both server-side and client-side timeout configuration
- ✅ **CLI Parameter Integration**: `--checking-url-timeout` option with validation
- ✅ **Bash Script Enhancement**: 5th parameter support with validation
- ✅ **Complete Backward Compatibility**: All existing functionality preserved
- ✅ **Regional Network Support**: Addresses slow Serveo servers in different regions
- ✅ **Comprehensive Testing**: Parameter validation and runtime verification
- ✅ **Documentation**: Updated help text and usage examples

### **Version Evolution Summary**
- **v0.0**: Basic stateful markdown sharing with visibility control
- **v0.1**: 2-second timeout improvements (hardcoded) + enhanced error handling
- **v0.2**: Public internet sharing via SSH Serveo tunnels + process orchestration
- **v0.3**: Configurable timeout support for global network adaptation + regional optimization

The Stateful Markdown application now provides complete flexibility for users in different network conditions and geographic regions, while maintaining full backward compatibility and all previous functionality.

---

**🌟 Ready for Global Usage with Network-Adaptive Timeout Control! 🌟**