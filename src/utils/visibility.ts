import axios from 'axios';
import { VisibilityResponse } from '../types';

export class VisibilityChecker {
  private checkingUrl: string;
  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: Array<(visible: boolean) => void> = [];

  constructor(checkingUrl: string) {
    this.checkingUrl = checkingUrl;
  }

  /**
   * Check if markdown content is visible by calling the checking URL
   */
  public async sMdContentVisible(): Promise<boolean> {
    try {
      const response = await axios.get<VisibilityResponse>(this.checkingUrl, {
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
    } catch (error) {
      console.error(`Error checking visibility at ${this.checkingUrl}:`, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Start periodic visibility checking every 1 second
   */
  public startPeriodicCheck(): void {
    if (this.intervalId) {
      return; // Already running
    }

    this.intervalId = setInterval(async () => {
      const visible = await this.sMdContentVisible();
      this.notifyCallbacks(visible);
    }, 1000);
  }

  /**
   * Stop periodic visibility checking
   */
  public stopPeriodicCheck(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Add callback to be notified of visibility changes
   */
  public onVisibilityChange(callback: (visible: boolean) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove callback
   */
  public removeVisibilityCallback(callback: (visible: boolean) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Notify all callbacks of visibility change
   */
  private notifyCallbacks(visible: boolean): void {
    this.callbacks.forEach(callback => {
      try {
        callback(visible);
      } catch (error) {
        console.error('Error in visibility callback:', error);
      }
    });
  }

  /**
   * Generate checking URL for a specific sharing name
   */
  public static sharingNameToCheckingUrl(domain: string, sharingName: string): string {
    const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain;
    return `${baseUrl}/check-md-visible/${encodeURIComponent(sharingName)}`;
  }

  /**
   * Validate that a checking URL argument is properly formatted and accessible
   */
  public static async checkSMdVisibleCheckingUrlArgument(checkingUrl: string): Promise<boolean> {
    try {
      // Validate URL format
      const url = new URL(checkingUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Checking URL must use HTTP or HTTPS protocol');
      }

      // Test accessibility
      const response = await axios.get(checkingUrl, {
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 500
      });

      // Check content type
      const contentType = response.headers['content-type'];
      if (!contentType?.includes('application/json')) {
        throw new Error('Checking URL must return JSON content type');
      }

      // Validate response structure
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
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Cannot connect to checking URL: ${checkingUrl}`);
        } else if (error.code === 'ENOTFOUND') {
          throw new Error(`Checking URL hostname not found: ${checkingUrl}`);
        } else if (error.code === 'ECONNABORTED') {
          throw new Error(`Checking URL request timeout: ${checkingUrl}`);
        } else if (error.response) {
          throw new Error(`Checking URL returned ${error.response.status} status: ${checkingUrl}`);
        }
      }
      throw error;
    }
  }
}

/**
 * Standalone function to check if content is visible (for compatibility with Clojure spec)
 */
export async function sMdContentVisible(checkingUrl: string): Promise<boolean> {
  const checker = new VisibilityChecker(checkingUrl);
  return checker.sMdContentVisible();
}

/**
 * Generate checking URL from sharing name (for compatibility with Clojure spec)
 */
export function sharingNameToCheckingUrl(sharingName: string): string {
  // Default domain - this should be configurable in a real application
  const domain = process.env.CHECKING_DOMAIN || 'http://localhost:3000';
  return VisibilityChecker.sharingNameToCheckingUrl(domain, sharingName);
}

/**
 * Check if checking URL argument is valid (for compatibility with Clojure spec)
 */
export async function checkSMdVisibleCheckingUrlArgument(checkingUrl: string): Promise<boolean> {
  return VisibilityChecker.checkSMdVisibleCheckingUrlArgument(checkingUrl);
}
