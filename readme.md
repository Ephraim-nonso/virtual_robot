# Virtual Robot Management

This repository is a monorepo for a Ground Control Station web application that sits in front of the provided Virtual Robot simulator.

## Current PR Scope

This first backend issue implements a REST adapter between our application and the simulator Docker API.

Included in this issue:

- simulator base URL configuration via environment variables
- backend routes for status, map, sensor, move, and reset
- validation for move commands
- normalized simulator HTTP and connection error responses
- preservation of the existing telemetry WebSocket proxy for compatibility

Not included yet:

- authentication or RBAC
- audit logging or database persistence
- frontend dashboard work

## Project Structure

- `backend/` - Express TypeScript backend adapter
- `frontend/` - React frontend
- `compose.yaml` - local simulator container

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start the simulator:

```bash
docker compose up -d
```

3. Start the backend:

```bash
npm run dev:backend
```

The backend runs on `http://localhost:4000` by default.

## Backend Environment Variables

Create `backend/.env` if you want to override the defaults:

```env
PORT=4000
ROBOT_SIM_URL=http://127.0.0.1:5001
SIMULATOR_REQUEST_TIMEOUT_MS=3000
SIMULATOR_READ_RETRY_COUNT=2
SIMULATOR_READ_RETRY_DELAY_MS=400
```

## Backend REST API

The frontend should use these backend routes instead of calling the simulator directly:

- `GET /health`
- `GET /api/robot/status`
- `GET /api/robot/map`
- `GET /api/robot/sensor`
- `POST /api/robot/move`
- `POST /api/robot/reset`
- `GET /ws/telemetry` (WebSocket upgrade)

### Example Move Request

```bash
curl -X POST http://localhost:4000/api/robot/move \
  -H "Content-Type: application/json" \
  -d '{"x": 5, "y": 7}'
```

## Error Handling

The backend normalizes simulator failures as follows:

- invalid move payloads return `400`
- simulator HTTP errors are forwarded with a `Simulator request failed` response
- simulator connection failures return `503` with `Robot simulator is unavailable`
- simulator timeouts return `504` with `Robot simulator request timed out`

## Retry And Timeout Behavior

The backend now applies resilience rules when talking to the simulator:

- each simulator request uses a configurable timeout
- safe read requests (`GET /health`, `GET /api/robot/status`, `GET /api/robot/map`, `GET /api/robot/sensor`) are retried automatically
- mutating requests (`POST /api/robot/move`, `POST /api/robot/reset`) are not retried automatically to avoid duplicate robot commands
- timeout and retry settings are controlled through the simulator environment variables above