"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisibilityChecker = void 0;
exports.sMdContentVisible = sMdContentVisible;
exports.sharingNameToCheckingUrl = sharingNameToCheckingUrl;
exports.checkSMdVisibleCheckingUrlArgument = checkSMdVisibleCheckingUrlArgument;
const axios_1 = __importDefault(require("axios"));
class VisibilityChecker {
    constructor(checkingUrl) {
        this.intervalId = null;
        this.callbacks = [];
        this.checkingUrl = checkingUrl;
    }
    async sMdContentVisible() {
        try {
            const response = await axios_1.default.get(this.checkingUrl, {
                timeout: 5000,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (response.status >= 200 && response.status < 300) {
                return response.data.visible;
            }
            return false;
        }
        catch (error) {
            console.error(`Error checking visibility at ${this.checkingUrl}:`, error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }
    startPeriodicCheck() {
        if (this.intervalId) {
            return;
        }
        this.intervalId = setInterval(async () => {
            const visible = await this.sMdContentVisible();
            this.notifyCallbacks(visible);
        }, 1000);
    }
    stopPeriodicCheck() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    onVisibilityChange(callback) {
        this.callbacks.push(callback);
    }
    removeVisibilityCallback(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }
    notifyCallbacks(visible) {
        this.callbacks.forEach(callback => {
            try {
                callback(visible);
            }
            catch (error) {
                console.error('Error in visibility callback:', error);
            }
        });
    }
    static sharingNameToCheckingUrl(domain, sharingName) {
        const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain;
        return `${baseUrl}/check-md-visible/${encodeURIComponent(sharingName)}`;
    }
    static async checkSMdVisibleCheckingUrlArgument(checkingUrl) {
        try {
            const url = new URL(checkingUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                throw new Error('Checking URL must use HTTP or HTTPS protocol');
            }
            const response = await axios_1.default.get(checkingUrl, {
                timeout: 10000,
                validateStatus: (status) => status >= 200 && status < 500
            });
            const contentType = response.headers['content-type'];
            if (!contentType?.includes('application/json')) {
                throw new Error('Checking URL must return JSON content type');
            }
            if (typeof response.data !== 'object' || response.data === null) {
                throw new Error('Checking URL must return a valid JSON object');
            }
            if (!('visible' in response.data)) {
                throw new Error('Checking URL response must contain "visible" field');
            }
            if (typeof response.data.visible !== 'boolean') {
                throw new Error('Checking URL "visible" field must be a boolean value');
            }
            return true;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                if (error.code === 'ECONNREFUSED') {
                    throw new Error(`Cannot connect to checking URL: ${checkingUrl}`);
                }
                else if (error.code === 'ENOTFOUND') {
                    throw new Error(`Checking URL hostname not found: ${checkingUrl}`);
                }
                else if (error.code === 'ECONNABORTED') {
                    throw new Error(`Checking URL request timeout: ${checkingUrl}`);
                }
                else if (error.response) {
                    throw new Error(`Checking URL returned ${error.response.status} status: ${checkingUrl}`);
                }
            }
            throw error;
        }
    }
}
exports.VisibilityChecker = VisibilityChecker;
async function sMdContentVisible(checkingUrl) {
    const checker = new VisibilityChecker(checkingUrl);
    return checker.sMdContentVisible();
}
function sharingNameToCheckingUrl(sharingName) {
    const domain = process.env.CHECKING_DOMAIN || 'http://localhost:3000';
    return VisibilityChecker.sharingNameToCheckingUrl(domain, sharingName);
}
async function checkSMdVisibleCheckingUrlArgument(checkingUrl) {
    return VisibilityChecker.checkSMdVisibleCheckingUrlArgument(checkingUrl);
}
//# sourceMappingURL=visibility.js.map