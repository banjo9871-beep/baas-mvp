/**
 * Browser-as-a-Service MVP API
 * 
 * Routes:
 *   POST   /sessions     - Create browser session
 *   GET    /sessions     - List active sessions
 *   GET    /sessions/:id - Get session details
 *   DELETE /sessions/:id - Kill session
 */

const { serve } = require('@hono/node-server');
const { Hono } = require('hono');
const { cors } = require('hono/cors');
const { nanoid } = require('nanoid');
const browserManager = require('./browser-manager');

const app = new Hono();

// Middleware
app.use('*', cors());

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'Browser-as-a-Service',
    version: '0.1.0',
    status: 'ok',
    activeSessions: browserManager.getActiveCount(),
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// Sessions API
// ============================================

/**
 * POST /sessions - Create a new browser session
 * 
 * Body (optional):
 *   - headless: boolean (default: true)
 *   - proxy: { server, username, password }
 *   - viewport: { width, height }
 *   - userAgent: string
 */
app.post('/sessions', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const sessionId = `sess_${nanoid(16)}`;
    
    console.log(`Creating session ${sessionId}...`);
    
    const session = await browserManager.createSession(sessionId, {
      headless: body.headless ?? true,
      proxy: body.proxy || null,
      viewport: body.viewport || { width: 1920, height: 1080 },
      userAgent: body.userAgent || null,
    });

    console.log(`Session ${sessionId} created. WS: ${session.wsEndpoint}`);

    return c.json({
      success: true,
      session: {
        id: session.sessionId,
        wsEndpoint: session.wsEndpoint,
        cdpUrl: session.wsEndpoint, // Alias for clarity
        createdAt: session.createdAt,
        status: session.status,
      },
    }, 201);
  } catch (err) {
    console.error('Failed to create session:', err);
    return c.json({
      success: false,
      error: err.message,
    }, 500);
  }
});

/**
 * GET /sessions - List all active sessions
 */
app.get('/sessions', (c) => {
  const sessions = browserManager.listSessions();
  
  return c.json({
    success: true,
    count: sessions.length,
    sessions: sessions.map(s => ({
      id: s.sessionId,
      wsEndpoint: s.wsEndpoint,
      createdAt: s.createdAt,
      status: s.status,
      options: s.options,
    })),
  });
});

/**
 * GET /sessions/:id - Get session details
 */
app.get('/sessions/:id', (c) => {
  const sessionId = c.req.param('id');
  const session = browserManager.getSession(sessionId);

  if (!session) {
    return c.json({
      success: false,
      error: 'Session not found',
    }, 404);
  }

  return c.json({
    success: true,
    session: {
      id: session.sessionId,
      wsEndpoint: session.wsEndpoint,
      cdpUrl: session.wsEndpoint,
      createdAt: session.createdAt,
      status: session.status,
      options: session.options,
    },
  });
});

/**
 * DELETE /sessions/:id - Kill a session
 */
app.delete('/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');
  
  console.log(`Killing session ${sessionId}...`);
  
  const killed = await browserManager.killSession(sessionId);

  if (!killed) {
    return c.json({
      success: false,
      error: 'Session not found',
    }, 404);
  }

  console.log(`Session ${sessionId} killed.`);

  return c.json({
    success: true,
    message: `Session ${sessionId} terminated`,
  });
});

// ============================================
// Server
// ============================================

const PORT = process.env.PORT || 3001;

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down...');
  await browserManager.cleanup();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
console.log(`
╔══════════════════════════════════════════╗
║   Browser-as-a-Service MVP API           ║
║   Port: ${PORT}                              ║
╚══════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port: PORT,
  hostname: '127.0.0.1',
}, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
  console.log(`
Endpoints:
  GET  /          - Health check
  POST /sessions  - Create browser session
  GET  /sessions  - List active sessions
  GET  /sessions/:id  - Get session details
  DELETE /sessions/:id - Kill session
`);
});
