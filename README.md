# Pillyway

> A collaborative open-source platform for pilgrims in Europe — build, verify, and explore Camino routes together.

**Live app: [pillyway.de](https://pillyway.de/)**

## About

**Pillyway** is a community-driven web application for pilgrims and long-distance walkers across Europe.

While the Camino de Santiago routes in Spain are well documented, many pilgrimage routes outside Spain suffer from fragmented information. Route descriptions, accommodation directories, stage planning, and points of interest are often spread across dozens of websites, blogs, and forums. This makes planning a personal pilgrimage unnecessarily difficult.

Pillyway solves this problem by providing a **centralized, collaborative database for European pilgrimage routes**.

The platform works like a **wiki for Caminos and pilgrimage trails**:

- Users can create and edit pilgrimage routes
- Add and manage stages/etappes
- Document accommodations and places of interest
- Verify and improve route data collaboratively
- Navigate through stages to plan daily walking distances
- Share reliable information with other pilgrims

The goal is to make pilgrimage planning simpler, more transparent, and community-driven.

---

## Features

- 🥾 Create and edit pilgrimage routes (Caminos)
- 🗺️ Manage stages and route segments
- 🏨 Add accommodations along the way
- ⛪ Document landmarks and points of interest
- ✅ Community-driven route verification
- 📍 Daily stage planning and navigation
- 🌍 Focus on European pilgrimage routes outside the mainstream Camino ecosystem
- 🤝 Open-source and community maintained

---

## Tech Stack

### Monorepo Structure

Pillyway is built as a modern TypeScript monorepo using Yarn Workspaces:

```txt
pillyway/
├── apps/
│   ├── backend/    # NestJS API  (@pillyway/backend)
│   ├── frontend/   # Next.js App Router  (@pillyway/frontend)
│   └── e2e/        # Playwright E2E tests  (@pillyway/e2e)
├── packages/       # shared packages (future use)
└── package.json    # yarn workspaces root
```

### Backend

| Technology              | Version | Purpose                  |
| ----------------------- | ------- | ------------------------ |
| NestJS                  | 11      | API framework            |
| Prisma                  | 7       | ORM & migrations         |
| PostgreSQL (Supabase)   | —       | Database                 |
| Passport / passport-jwt | —       | JWT authentication       |
| `@nestjs/swagger`       | 11      | OpenAPI documentation    |
| Vitest                  | 4       | Unit & integration tests |
| TypeScript              | 5       | Language                 |

### Frontend

| Technology                     | Version         | Purpose                        |
| ------------------------------ | --------------- | ------------------------------ |
| Next.js                        | 16 (App Router) | React framework                |
| React                          | 19              | UI library                     |
| Tailwind CSS                   | 4               | Utility-first styling          |
| shadcn/ui                      | 4               | Component library              |
| CVA (class-variance-authority) | —               | Component variants             |
| TanStack Query                 | 5               | Server state & data fetching   |
| Zustand                        | 5               | Client-side state              |
| next-intl                      | 4               | Internationalisation (EN / DE) |
| react-hook-form                | 7               | Form handling                  |
| Kinde Auth                     | —               | Authentication                 |
| Vitest                         | 4               | Unit tests                     |
| TypeScript                     | 5               | Language                       |

### Infrastructure & Deployment

| Component         | Technology                       |
| ----------------- | -------------------------------- |
| Hosting           | Hetzner (via Coolify)            |
| Reverse proxy     | Nginx                            |
| Container runtime | Docker / Docker Compose          |
| Auth provider     | Kinde                            |
| File storage      | Supabase Storage (S3-compatible) |
| Database          | Supabase (PostgreSQL)            |
| E2E testing       | Playwright                       |

---

## Getting Started

### Prerequisites

- **Node.js 24.14.0** — activate via `nodenv` or `fnm`
- **Yarn** — enable via `corepack enable` if missing
- A running **Supabase** project (PostgreSQL database)
- A **Kinde** application (authentication)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/pillyway.git
cd pillyway

# 2. Enable Yarn via corepack (if not already active)
corepack enable

# 3. Install all workspace dependencies
yarn install
```

### Environment Variables

Copy the `.env.example` files in each app directory and fill in the values.

**Backend** (`apps/backend/.env`):

| Variable                  | Description                                                  |
| ------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`            | Supabase PostgreSQL connection string (pooler in production) |
| `DIRECT_URL`              | Direct Supabase connection (for `prisma migrate`)            |
| `PORT`                    | Backend port (default: `3033`)                               |
| `FRONTEND_URL`            | Frontend origin for CORS (e.g. `http://localhost:3000`)      |
| `KINDE_ISSUER_URL`        | Kinde tenant URL for JWT verification                        |
| `SUPABASE_URL`            | Supabase project URL                                         |
| `SUPABASE_S3_URL`         | Supabase Storage S3-compatible endpoint                      |
| `SUPABASE_S3_REGION`      | S3 region                                                    |
| `SUPABASE_S3_ACCESS_KEY`  | S3 access key                                                |
| `SUPABASE_S3_SECRET_KEY`  | S3 secret key                                                |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name                                          |

**Frontend** (`apps/frontend/.env`):

| Variable                         | Description                                 |
| -------------------------------- | ------------------------------------------- |
| `KINDE_CLIENT_ID`                | Kinde application client ID                 |
| `KINDE_CLIENT_SECRET`            | Kinde application client secret             |
| `KINDE_ISSUER_URL`               | Kinde tenant URL                            |
| `KINDE_SITE_URL`                 | Public URL of the frontend                  |
| `KINDE_POST_LOGOUT_REDIRECT_URL` | Redirect target after logout                |
| `KINDE_POST_LOGIN_REDIRECT_URL`  | Redirect target after login                 |
| `BACKEND_URL`                    | Internal URL of the backend API             |
| `SUPABASE_URL`                   | Supabase project URL (for image CDN config) |

### Database Setup

```bash
# Apply all pending migrations
yarn db:migrate:prod

# Generate Prisma client types (runs automatically via postinstall)
yarn prisma:generate

# Open Prisma Studio (visual DB browser)
yarn prisma:studio
```

### Running Locally

```bash
# Start the NestJS backend (hot-reload)
yarn dev:backend      # http://localhost:3033
                      # Swagger docs: http://localhost:3033/api/docs

# Start the Next.js frontend
yarn dev:frontend     # http://localhost:3000
```

---

## Architecture

### API

The backend exposes a REST API under the `/api` prefix. Interactive documentation is available at:

```
http://localhost:3033/api/docs   (Swagger / OpenAPI)
```

The frontend **never contacts Supabase directly** — all data flows through the NestJS API.

### Authentication & Authorisation

Authentication is handled by **Kinde** using JWTs. The backend validates tokens via `passport-jwt` and a `KindeJwtStrategy`.

| Role                     | Capabilities                                                          |
| ------------------------ | --------------------------------------------------------------------- |
| (none / unauthenticated) | View all public content                                               |
| `pilgrim`                | Create, edit, and delete caminos, stages, accommodations, and sights  |
| `owner`                  | Backoffice access (every `owner` is also assigned `pilgrim` in Kinde) |

### Frontend Architecture

- **App Router** (`app/` directory) — no `pages/` directory
- **TanStack Query** for all server-state fetching and mutation (no bare `fetch` in components)
- **Zustand** for client-side / UI state
- API hooks in `app/api/use-<resource>.ts` — auth token injection happens inside the hook layer

### Internationalisation

The app supports **English** and **German** via `next-intl`. Message files live in `apps/frontend/i18n/messages/`.

### Data Model

```
Camino          — a named pilgrimage route
CaminoPoint     — a geographic point (town / waypoint) on a route
CaminoPointOrder— ordered list of CaminoPoints for a Camino
Stage           — a leg between two CaminoPoints (with distance)
Accommodation   — lodging at a CaminoPoint (hostel, hotel, monastery, …)
Sight           — point of interest at a CaminoPoint
```

### Backend Modules

| Module           | Responsibility                        |
| ---------------- | ------------------------------------- |
| `caminos`        | CRUD for pilgrimage routes            |
| `camino-points`  | Geographic waypoints / towns          |
| `stages`         | Route legs between two points         |
| `accommodations` | Lodging options                       |
| `sights`         | Points of interest                    |
| `waypoints`      | Waypoint detail aggregation           |
| `countries`      | Country reference data                |
| `uploads`        | File upload to Supabase Storage       |
| `auth`           | JWT guard, role guard, Kinde strategy |
| `prisma`         | Global PrismaService provider         |

---

## Testing

### Unit Tests

Both backend and frontend use **Vitest**.

```bash
yarn test:backend    # runs apps/backend unit tests
yarn test:frontend   # runs apps/frontend unit tests
yarn test            # runs both
```

### E2E Tests (Playwright)

E2E tests live in `apps/e2e/tests/`. They run against a locally started frontend and a local backend.

```bash
yarn dev:backend
yarn dev:frontend:test # uses .env.test.local
yarn test:e2e          # headless run
yarn test:e2e:ui       # interactive Playwright UI
```

---

## Deployment

The application is deployed on **Hetzner** via **Coolify** using Docker containers. Environment variables are injected by the GitHub Actions deploy job — no manual `.env` file setup is required on the server.

```
Backend container  → port 3033 (internal)
Frontend container → port 3000 (internal)
Nginx              → reverse proxy, TLS termination
```

---

## Philosophy

Pillyway is based on the idea that pilgrimage knowledge should be:

- Open
- Collaborative
- Structured
- Accessible to everyone

Instead of isolated route descriptions across many websites, Pillyway aims to become a shared and continuously improving knowledge base for pilgrims.

---

## Open Source

Pillyway is fully open source and released under the MIT license.

Contributions, ideas, and improvements are welcome.

---

## License

This project is licensed under the MIT License.

See the `LICENSE` file for details.

---

## AI-Assisted Development

Pillyway was created with the help of Claude Code.

All Claude-related development data and generated artifacts are transparently included in this repository.

---

## Vision

Pillyway aims to become the central open data platform for European pilgrimage routes — empowering pilgrims to collaboratively preserve, improve, and share route knowledge for future travelers.
