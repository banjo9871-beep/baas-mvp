# Browser-as-a-Service MVP API

Simple API server for spinning up stealth browser sessions with CDP (Chrome DevTools Protocol) access.

## Quick Start

```bash
# Install dependencies (if needed)
npm install

# Install Playwright browsers (first time only)
npx playwright install chromium

# Start server
npm start
# Or with custom port
PORT=3000 npm start
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check, shows active session count |
| GET | `/health` | Simple health check |
| POST | `/sessions` | Create new browser session |
| GET | `/sessions` | List all active sessions |
| GET | `/sessions/:id` | Get session details |
| DELETE | `/sessions/:id` | Kill a session |

## Usage

### Create a session

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "headless": true,
    "viewport": {"width": 1920, "height": 1080}
  }'
```

Response:
```json
{
  "success": true,
  "session": {
    "id": "sess_abc123",
    "wsEndpoint": "ws://localhost:12345/guid",
    "cdpUrl": "ws://localhost:12345/guid",
    "createdAt": "2026-01-29T00:00:00.000Z",
    "status": "active"
  }
}
```

### Connect with Playwright

```javascript
const { chromium } = require('playwright');

const browser = await chromium.connect('ws://localhost:12345/guid');
const page = await browser.newPage();
await page.goto('https://example.com');
```

### Connect with Puppeteer

```javascript
const puppeteer = require('puppeteer');

const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://localhost:12345/guid'
});
const page = await browser.newPage();
await page.goto('https://example.com');
```

### List sessions

```bash
curl http://localhost:3000/sessions
```

### Kill a session

```bash
curl -X DELETE http://localhost:3000/sessions/sess_abc123
```

## Options

When creating a session, you can pass:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headless` | boolean | `true` | Run browser headless |
| `proxy` | object | `null` | Proxy config: `{server, username, password}` |
| `viewport` | object | `{width: 1920, height: 1080}` | Browser window size |
| `userAgent` | string | Chrome default | Custom user agent |

## Features

- ✅ Playwright-powered Chrome instances
- ✅ Stealth mode (puppeteer-extra-plugin-stealth)
- ✅ CDP WebSocket endpoint for remote control
- ✅ Proxy support
- ✅ In-memory session management
- ✅ Graceful shutdown

## Next Steps (Phase 2)

- [ ] Database persistence (PostgreSQL/Supabase)
- [ ] Authentication (API keys)
- [ ] Session timeouts
- [ ] Captcha solving integration
- [ ] Residential proxy integration
- [ ] Session recording
