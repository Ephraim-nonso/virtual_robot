# Virtual Robot Management

This repository is a monorepo for a Ground Control Station web application that sits in front of the provided Virtual Robot simulator. The application is split into a React frontend and an Express/TypeScript backend. The backend owns authentication, RBAC, audit logging, simulator integration, and database persistence; the frontend presents a role-aware dashboard for operators.

## Project Structure

- `frontend/` - React/Vite dashboard application
- `backend/` - Express and TypeScript backend adapter and API
- `compose.yaml` - local Docker Compose file for the robot simulator image
- `render.yaml` - Render Blueprint for backend and database deployment
- `.github/workflows/` - CI and deployment workflows

## Local Setup

The project is fully containerized for local use with Docker Compose. This starts the frontend, backend, PostgreSQL database, and the Virtual Robot simulator together so the system behaves much closer to its deployed shape.

```bash
npm install
npm run docker:up
```

or:

```bash
docker compose up --build
```

This launches:

- `frontend` on `http://localhost:3000`
- `backend` on `http://localhost:4000`
- `robot-simulator` on `http://localhost:5001`
- `postgres` on `localhost:5432`

The root `package.json` also provides a shutdown command:

```bash
npm run docker:down
```

### Docker Compose is designed as:

The local `compose.yaml` orchestrates the whole application:

- `frontend`
  - built from the local frontend container definition
  - exposed on port `3000`
  - routes browser traffic to the backend container
- `backend`
  - built from the local backend container definition
  - exposed on port `4000`
  - connects to Postgres and the simulator over the internal Docker network
- `postgres`
  - uses `postgres:16-alpine`
  - persists data in a named Docker volume
  - stores users and audit history
- `robot-simulator`
  - runs `ghcr.io/francescodelduchetto/cmp9134_2526_robotsim:latest`
  - exposed locally on `http://localhost:5001`


### Alternative way to spin project for development

If you want to work on the frontend and backend directly from the workspace instead of the containerized stack, you can still run them in development mode and keep the simulator in Docker:

```bash
npm install
docker compose up -d robot-simulator postgres
npm run dev:backend
npm run dev:frontend
```

The backend runs on `http://localhost:4000` by default, and the frontend runs on the Vite development server.

### Local environment variables

Frontend environment variables for production-style routing:

```env
VITE_API_BASE_URL=https://your-backend-domain.example.com
VITE_WS_BASE_URL=wss://your-backend-domain.example.com
```

In the fully containerized local setup, these are not required in the same way as Vercel because the frontend container is wired to the backend through Docker networking. In code-first local development they can be left unset when using local routing, or set explicitly if the frontend should target a remote backend.

Backend environment variables:

```env
PORT=4000
HOST=0.0.0.0
ROBOT_SIM_URL=http://127.0.0.1:5001
ROBOT_SIM_HOSTPORT=
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/virtual_robot_management
DATABASE_SSL=false
AUTH_JWT_SECRET=change-me-in-env
AUTH_TOKEN_EXPIRY=8h
SEED_COMMANDER_NAME=Commander
SEED_COMMANDER_EMAIL=commander@example.com
SEED_COMMANDER_PASSWORD=change-me
SIMULATOR_REQUEST_TIMEOUT_MS=3000
SIMULATOR_READ_RETRY_COUNT=2
SIMULATOR_READ_RETRY_DELAY_MS=400
AUDIT_DEFAULT_ACTOR=system
```

For the full local container stack, the backend is configured to use:

- `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/virtual_robot_management`
- `ROBOT_SIM_URL=http://robot-simulator:5000`

For non-container local development, `ROBOT_SIM_URL=http://127.0.0.1:5001` remains the normal fallback.


## CI/CD

The repository uses GitHub Actions for automated verification and deployment. The current workflow setup covers backend build/test, frontend lint/test/build, and Vercel deployment for the frontend.

### Backend CI

`/.github/workflows/backend-ci.yml`

This workflow runs on pushes to `master`, `feat/**`, `fix/**`, and `refactor/**`, and also on pull requests. It:

- checks out the repository
- installs Node dependencies
- builds the backend TypeScript project
- runs the backend Vitest suite

This ensures backend API changes, authentication logic, database integration code, and simulator client behaviour remain buildable and testable before merge.

### Frontend CI

`/.github/workflows/frontend-ci.yml`

This workflow runs on the same branch patterns and pull requests. It:

- installs dependencies
- lints the frontend
- runs the frontend Vitest suite
- builds the production frontend bundle

This gives the frontend a proper quality gate rather than only checking whether the app compiles.

### Frontend deployment workflow

`/.github/workflows/vercel-deploy.yml`

This workflow deploys the frontend to Vercel:

- preview deployments on pull requests to `master`
- production deployments on pushes to `master`

It uses the Vercel CLI to pull the correct environment, build the app, and deploy the prebuilt artefact.

### GitHub secrets

The Vercel deployment workflow requires these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

These must be configured in GitHub before the deployment workflow can run successfully.

### Rulesets and merge protection

GitHub Actions are most effective when paired with repository rulesets or branch protection rules. The expected repository policy for `master` is to require the CI checks to pass before merge. In practice, that means requiring the backend CI, frontend CI, and frontend deployment checks as status checks for protected branches.

Github rulesets are enabled for this project and does the following:

- pull requests are required for protected branches
- required status checks must pass before merging
- direct pushes to `master` are restricted if you want preview and production deployment to remain review-driven

## Frontend

The frontend is a React dashboard that presents robot state, mission context, authenticated telemetry, and audit history through a role-aware UI.

### Authentication experience

The login page supports two flows:

- sign in with an existing backend account
- create a new account and choose an initial role of `VIEWER` or `COMMANDER`

The page also explains role permissions so the user understands the difference between read-only access and command authority.

### Dashboard information shown to all authenticated users

Once signed in, authenticated users can see:

- operator identity and current role
- robot ID
- robot position on the grid
- battery percentage
- robot state or command status
- overall connection health
- last sync time
- mission navigation summary in the sidebar
- map dimensions and robot placement
- sensor summary and lidar sample count
- live telemetry stream status
- audit log summaries and recent mission history


Users with the `COMMANDER` role can:

- move the robot by submitting target `x` and `y` coordinates
- reset the simulator

Users with the `VIEWER` role can still monitor the robot and inspect telemetry and audit history, but the movement and reset controls are hidden and replaced with a role-locked message.

### Frontend production environment variables

The frontend depends on the backend URL in production:

```env
VITE_API_BASE_URL=https://your-backend-domain.example.com
VITE_WS_BASE_URL=wss://your-backend-domain.example.com
```

- `VITE_API_BASE_URL` is used for REST calls such as auth, status, map, sensor, move, reset, and audit endpoints
- `VITE_WS_BASE_URL` is used for the authenticated telemetry WebSocket stream

If these values are incorrect in Vercel, the deployed dashboard can appear healthy while failing to reach the intended backend.

## Backend

The backend is the application boundary between the frontend and the robot simulator. The browser never talks directly to the simulator. Instead, the backend:

- authenticates users
- enforces role-based permissions
- validates movement payloads
- proxies REST requests to the simulator
- proxies the telemetry WebSocket
- persists users and audit data in PostgreSQL
- normalises errors for the frontend

### Persistence with PostgreSQL

PostgreSQL is used for durable storage of:

- registered users
- seeded commander account
- command audit logs
- robot status snapshot audit logs

The backend initialises its schema automatically on startup, creating:

- `users`
- `command_audit_logs`
- `status_audit_logs`

This means the application does not rely on in-memory state or file-based identity storage for authentication and audit history.

### Robot simulator integration

The backend integrates with the provided robot simulator image:

- REST endpoints for status, map, sensor, move, and reset
- WebSocket telemetry relay through `/ws/telemetry`

### Authentication and RBAC

Authentication is JWT-based and supports:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

RBAC is implemented with two roles:

- `VIEWER` - read-only dashboard access
- `COMMANDER` - read access plus robot command capability

Access policy:

- `VIEWER` and `COMMANDER` can access status, map, sensor, audit routes, and telemetry
- only `COMMANDER` can call move and reset operations

The backend also seeds a commander account at startup from environment variables so that an operator account is always available after deployment.

### Backend REST API

The main application routes are:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /health/live`
- `GET /health`
- `GET /api/robot/status`
- `GET /api/robot/map`
- `GET /api/robot/sensor`
- `POST /api/robot/move`
- `POST /api/robot/reset`
- `GET /api/audit/commands`
- `GET /api/audit/statuses`
- `GET /ws/telemetry`

### Error handling

The backend normalises application and upstream failures into predictable HTTP responses:

- `400` for invalid request bodies
- `401` for missing or invalid tokens
- `403` for forbidden role access
- simulator HTTP failures as `Simulator request failed.`
- simulator connection failures as `Robot simulator is unavailable.`
- simulator timeouts as `Robot simulator request timed out.`

## Deployment

The deployed system is split across Vercel and Render.

### Frontend on Vercel

The frontend is hosted on Vercel and built from the `frontend/` workspace. Vercel deployment is handled through the GitHub Actions workflow described above. The frontend needs the backend URL injected through:

- `VITE_API_BASE_URL`
- `VITE_WS_BASE_URL`

The Vercel configuration in `frontend/vercel.json` keeps SPA routes such as `/login` and `/dashboard` working correctly by rewriting unknown routes to `index.html`.

### Backend and database on Render

The backend is hosted on Render and backed by a managed Postgres database. The repository includes `render.yaml`, which describes:

- `virtual-robot-management-db` - Render Postgres database storing users and audit history
- `robot-simulator` - this service using the provided simulator image
- `backend` - Render Node web service exposes the public API