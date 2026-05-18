# Virtual Robot Management

This repository is a monorepo for a Ground Control Station web application that sits in front of the provided Virtual Robot simulator.

## Project Structure

- `backend/` - Express TypeScript backend adapter
- `frontend/` - React frontend
- `compose.yaml` - local full-stack container orchestration

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start the local development services:

```bash
docker compose up -d
```

This brings up:

- `frontend` at `http://localhost:3000`
- `backend` at `http://localhost:4000`
- `robot-simulator` at `http://localhost:5001`
- `postgres` at `localhost:5432`

3. For code-first local development, you can still run the app workspaces directly:

```bash
npm run dev:frontend
npm run dev:backend
```

The backend runs on `http://localhost:4000` by default.

4. Run the backend test suite:

```bash
npm run test:backend
```

## Containerization

The repository now includes container artifacts for the full stack:

- `backend/Dockerfile` - production backend image
- `frontend/Dockerfile` - production frontend image served by Nginx
- `frontend/docker/default.conf.template` - SPA + API/WebSocket reverse proxy
- `.dockerignore` - shared Docker build exclusions
- `compose.yaml` - orchestrates `frontend`, `backend`, `postgres`, and `robot-simulator`

### Start The Full Stack

```bash
npm run docker:up
```

or:

```bash
docker compose up --build
```

### Stop The Full Stack

```bash
npm run docker:down
```

### Container Networking

Inside the container stack:

- the frontend proxies `/api`, `/health`, and `/ws` to the backend container
- the backend connects to Postgres using `postgres:5432`
- the backend connects to the simulator using `http://robot-simulator:5000`

This makes the stack portable for platforms such as AWS or Azure container services where the app, API, database, and simulator can run as separate containers on the same network.

## CI/CD

GitHub Actions now supports both CI and frontend deployment flows:

- `backend-ci.yml`
  - installs workspace dependencies
  - builds the backend TypeScript project
  - runs the backend Vitest suite

- `frontend-ci.yml`
  - installs workspace dependencies
  - lints the frontend
  - runs the frontend test suite
  - builds the frontend production bundle

- `vercel-deploy.yml`
  - deploys frontend preview builds to Vercel for pull requests against `master`
  - deploys the frontend production build to Vercel on pushes to `master`

### GitHub Secrets For Vercel Deployment

Add these repository secrets before enabling the Vercel deployment workflow:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Frontend Environment Variables

The frontend needs a reachable backend URL in production. Set these in the Vercel project environment:

- `VITE_API_BASE_URL`
- `VITE_WS_BASE_URL`

Example values:

```env
VITE_API_BASE_URL=https://your-backend-domain.example.com
VITE_WS_BASE_URL=wss://your-backend-domain.example.com
```

The frontend Vercel configuration lives in `frontend/vercel.json` and includes SPA rewrites for `/login` and `/dashboard`.

## Backend Environment Variables

Create `backend/.env` if you want to override the defaults:

```env
PORT=4000
HOST=0.0.0.0
ROBOT_SIM_URL=http://127.0.0.1:5001
ROBOT_SIM_HOSTPORT=
SIMULATOR_REQUEST_TIMEOUT_MS=3000
SIMULATOR_READ_RETRY_COUNT=2
SIMULATOR_READ_RETRY_DELAY_MS=400
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/virtual_robot_management
DATABASE_SSL=false
AUTH_JWT_SECRET=change-me-in-env
AUTH_TOKEN_EXPIRY=8h
SEED_COMMANDER_NAME=Commander
SEED_COMMANDER_EMAIL=commander@example.com
SEED_COMMANDER_PASSWORD=change-me
```

`ROBOT_SIM_HOSTPORT` is optional and is useful on platforms such as Render where the simulator is exposed over an internal `host:port` pair. If `ROBOT_SIM_URL` is set, it takes precedence.

## Render Deployment

The repository now includes a root `render.yaml` Blueprint that provisions three Render resources together:

- a Render Postgres database: `virtual-robot-management-db`
- a private service for the simulator image: `robot-simulator`
- a public web service for the API: `backend`

The simulator runs from the existing image:

- `ghcr.io/francescodelduchetto/cmp9134_2526_robotsim:latest`

The backend uses `/health/live` for Render healthchecks so it can deploy even if the simulator service is still starting.

### Backend Variables On Render

The Blueprint configures most backend variables automatically. You still need to provide secret values for:

- `AUTH_JWT_SECRET`
- `SEED_COMMANDER_PASSWORD`

The Blueprint also wires:

- `DATABASE_URL` from Render Postgres
- `ROBOT_SIM_HOSTPORT` from the simulator service's internal `host:port`

### Render CLI Workflow

1. Install and authenticate the CLI:

```bash
npm install -g @render/cli
render login
```

2. Validate the Blueprint:

```bash
render blueprints validate
```

3. In the Render dashboard, create a new Blueprint-backed project from this repo and approve the three resources declared in `render.yaml`.

4. After the services are created, trigger deploys from the CLI as needed:

```bash
render services --output json
render deploys create <backend-service-id> --wait
render deploys create <robot-simulator-service-id> --wait
```

5. Verify the backend once deployed:

```bash
curl https://<backend-onrender-domain>/health/live
curl https://<backend-onrender-domain>/health
```

Use the CLI to inspect service metadata and find the backend URL:

```bash
render services --output json
```

### Services Created By The Blueprint

- `backend`
- `HOST=0.0.0.0`
- web service
- build command: `npm install && npm run build --workspace backend`
- start command: `npm run start --workspace backend`
- healthcheck: `/health/live`

- `robot-simulator`
- private service
- image source: `ghcr.io/francescodelduchetto/cmp9134_2526_robotsim:latest`
- internal port: `5000`

- `virtual-robot-management-db`
- Render Postgres database

## Backend REST API

The frontend should use these backend routes instead of calling the simulator directly:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
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
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"x": 5, "y": 7}'
```

## Authentication And RBAC

The backend now provides JWT-based authentication and role-based access control backed by Postgres persistence for users and audit history.

- new registrations can choose `VIEWER` or `COMMANDER`
- a seed `COMMANDER` account is created at startup from the environment variables above
- `VIEWER` and `COMMANDER` can access:
  - `GET /api/auth/me`
  - `GET /api/robot/status`
  - `GET /api/robot/map`
  - `GET /api/robot/sensor`
  - `GET /ws/telemetry?token=<jwt-token>`
- only `COMMANDER` can access:
  - `POST /api/robot/move`
  - `POST /api/robot/reset`

### Example Registration

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Viewer One","email":"viewer@example.com","password":"password123","role":"VIEWER"}'
```

### Example Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"commander@example.com","password":"change-me"}'
```

## Error Handling

The backend normalizes simulator failures as follows:

- invalid move payloads return `400`
- invalid login/registration payloads return `400`
- missing or invalid auth tokens return `401`
- forbidden role access returns `403`
- simulator HTTP errors are forwarded with a `Simulator request failed` response
- simulator connection failures return `503` with `Robot simulator is unavailable`
- simulator timeouts return `504` with `Robot simulator request timed out`

## Retry And Timeout Behavior

The backend now applies resilience rules when talking to the simulator:

- each simulator request uses a configurable timeout
- safe read requests (`GET /health`, `GET /api/robot/status`, `GET /api/robot/map`, `GET /api/robot/sensor`) are retried automatically
- mutating requests (`POST /api/robot/move`, `POST /api/robot/reset`) are not retried automatically to avoid duplicate robot commands
- timeout and retry settings are controlled through the simulator environment variables above