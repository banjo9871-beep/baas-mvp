/**
 * Browser Manager - Manages Playwright browser instances with stealth
 */

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Apply stealth plugin
chromium.use(StealthPlugin());

class BrowserManager {
  constructor() {
    // In-memory session store: { sessionId: { server, wsEndpoint, createdAt, status, options } }
    this.sessions = new Map();
  }

  /**
   * Create a new browser session using launchServer for CDP access
   * @param {string} sessionId - Unique session identifier
   * @param {object} options - Browser launch options
   * @returns {object} Session info including CDP websocket URL
   */
  async createSession(sessionId, options = {}) {
    const {
      headless = true,
      proxy = null,
      viewport = { width: 1920, height: 1080 },
    } = options;

    const launchOptions = {
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        `--window-size=${viewport.width},${viewport.height}`,
      ],
    };

    // Add proxy if provided
    if (proxy) {
      launchOptions.proxy = {
        server: proxy.server,
        username: proxy.username,
        password: proxy.password,
      };
    }

    // Launch browser server (gives us WebSocket endpoint)
    const server = await chromium.launchServer(launchOptions);
    const wsEndpoint = server.wsEndpoint();

    // Store session
    const session = {
      server,
      wsEndpoint,
      createdAt: new Date().toISOString(),
      status: 'active',
      options: { headless, proxy: !!proxy, viewport },
    };

    this.sessions.set(sessionId, session);

    return {
      sessionId,
      wsEndpoint,
      createdAt: session.createdAt,
      status: session.status,
    };
  }

  /**
   * Get session info
   * @param {string} sessionId
   * @returns {object|null} Session info or null if not found
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId,
      wsEndpoint: session.wsEndpoint,
      createdAt: session.createdAt,
      status: session.status,
      options: session.options,
    };
  }

  /**
   * List all active sessions
   * @returns {array} Array of session info objects
   */
  listSessions() {
    const sessions = [];
    for (const [sessionId, session] of this.sessions) {
      sessions.push({
        sessionId,
        wsEndpoint: session.wsEndpoint,
        createdAt: session.createdAt,
        status: session.status,
        options: session.options,
      });
    }
    return sessions;
  }

  /**
   * Kill a session
   * @param {string} sessionId
   * @returns {boolean} True if session was killed, false if not found
   */
  async killSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      await session.server.close();
    } catch (err) {
      console.error(`Error closing server for session ${sessionId}:`, err.message);
    }

    this.sessions.delete(sessionId);
    return true;
  }

  /**
   * Get active session count
   * @returns {number}
   */
  getActiveCount() {
    return this.sessions.size;
  }

  /**
   * Cleanup all sessions (for graceful shutdown)
   */
  async cleanup() {
    console.log(`Cleaning up ${this.sessions.size} browser sessions...`);
    for (const [sessionId] of this.sessions) {
      await this.killSession(sessionId);
    }
  }
}

// Export singleton instance
module.exports = new BrowserManager();
