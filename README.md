# Airtable Sync & Revision Explorer

![Angular](https://img.shields.io/badge/Angular-19-DD0031?logo=angular&logoColor=white)
![Node](https://img.shields.io/badge/Node-22-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?logo=mongodb&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

A full-stack Airtable integration: an OAuth2/PKCE-authenticated sync engine that mirrors bases, tables, tickets, and users into MongoDB, paired with a browser-automation service that recovers per-field revision history that Airtable's public REST API doesn't expose, plus a dynamic Angular data browser (AG Grid) to explore everything that's been synced.

## Overview

This project pairs two very different integration techniques against the same third-party product, on purpose:

- **The documented path** — a standard OAuth2 + PKCE flow against Airtable's public REST API, with cursor-based pagination, request throttling, and 429 backoff, syncing bases → tables → records into MongoDB.
- **The undocumented path** — Airtable's REST API has no endpoint for field-level change history (who changed a ticket's `Status` or `Assignee`, and when). Getting that data means authenticating as a real browser session, including handling multi-factor auth interactively from the frontend, then calling Airtable's internal web-app API directly and parsing the HTML it returns.

Building both side by side is the point: one is "read the docs and implement the spec," the other is "there is no spec — reverse-engineer the behavior, make it resilient, and make it observable." The repo demonstrates:

- **OAuth2 + PKCE from scratch** (no auth library) — authorization code exchange, refresh-before-expiry token rotation, CSRF-safe state handling with a TTL-expiring Mongo collection.
- **Resilient third-party API integration** — request throttling, `429`/`Retry-After` handling, offset-cursor pagination abstracted into a single reusable helper.
- **Headless browser automation with human-in-the-loop MFA** — Puppeteer drives a real login flow, pauses for a one-time code submitted from the Angular UI, validates and transparently refreshes session cookies before every scrape, and falls back cleanly to interactive re-auth when a fully automated login gets challenged.
- **HTML scraping into structured data** — Airtable's revision-history response is raw HTML fragments; a Cheerio-based parser distinguishes value-pill diffs from linked-record diffs and extracts clean old/new values.
- **Concurrent, fault-tolerant batch processing** — hundreds of tickets synced with bounded concurrency, per-item retries, and a pass/fail report rather than an all-or-nothing job.
- **Schema-agnostic UI** — a single Angular data grid that renders *any* synced collection, deriving its columns at runtime from Airtable's own field metadata instead of hardcoding a table shape per entity.

## Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────────────────┐
│   Angular 19 frontend       │         │        Express + TS backend              │
│  Material · AG Grid         │◄──────► │                                          │
└─────────────────────────────┘  REST   │  ┌────────────┐   ┌───────────────────┐  │
                                        │  │ OAuth/API  │   │  Puppeteer +      │  │
                                        │  │ sync path  │   │  cookie scraper   │  │
                                        │  └─────┬──────┘   └─────────┬─────────┘  │
                                        │        └───────────┬────────┘            │
                                        │                    ▼                     │
                                        │              MongoDB (Mongoose)          │
                                        └──────────────────────────────────────────┘
```

**Backend** (`backend/`, Express + TypeScript + Mongoose)

| Module | Responsibility |
|---|---|
| `auth/` | OAuth2 + PKCE login/callback, token storage and refresh |
| `airtable/` | Throttled, paginated, retrying HTTP client for Airtable's public REST API |
| `sync/` | Upserts bases → tables → tickets/users from the REST API into MongoDB |
| `revision/` | Puppeteer login (incl. MFA), cookie session management, calls Airtable's internal revision-history endpoint, parses the HTML response, bulk-syncs with bounded concurrency |
| `browse/` | Generic read API that serves any synced collection with runtime-derived column metadata |

**Frontend** (`frontend/`, Angular 19 standalone components + Angular Material + AG Grid)

A single dashboard composed of independent feature components — connection status, base/table sync controls, revision-scraper authentication (including the MFA prompt), revision sync controls, and the data browser grid — each talking to the backend over a typed `HttpClient` layer.

## Tech Stack

- **Frontend:** Angular 19, Angular Material, AG Grid Community, RxJS, TypeScript
- **Backend:** Node 22, Express, TypeScript, Mongoose, Puppeteer, Cheerio
- **Database:** MongoDB
- **Infra:** Docker Compose (local MongoDB)

## Getting Started

### Prerequisites

- Node.js 22+
- Docker (for local MongoDB) — or your own MongoDB instance
- An [Airtable OAuth integration](https://airtable.com/create/oauth) (client ID/secret) if you want to exercise the sync path
- An Airtable account with email/password login if you want to exercise the revision-scraping path

### 1. Start MongoDB

```bash
docker-compose up -d
```

### 2. Install dependencies

```bash
npm install
```

This installs both workspaces (`backend`, `frontend`) via npm workspaces.

### 3. Configure the backend

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | | Backend port (default `3000`) |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `AIRTABLE_CLIENT_ID` / `AIRTABLE_CLIENT_SECRET` | ✅ | From your Airtable OAuth integration |
| `AIRTABLE_REDIRECT_URI` | ✅ | Must match the redirect URI registered on the integration |
| `AIRTABLE_SCOPES` | | Space-separated OAuth scopes (defaults to `schema.bases:read data.records:read`) |
| `AIRTABLE_EMAIL` / `AIRTABLE_PASSWORD` | for revision sync | Credentials used by the Puppeteer login flow |
| `REVISION_SYNC_CONCURRENCY` | | Concurrent ticket scrapes during a bulk revision sync (default `5`) |
| `FRONTEND_ORIGIN` | | Allowed CORS origin (default `http://localhost:4200`) |

### 4. Run it

```bash
npm run dev:backend    # http://localhost:3000
npm run dev:frontend   # http://localhost:4200
```

Open `http://localhost:4200`, connect to Airtable via OAuth, sync a base, then optionally authenticate the revision scraper (entering an MFA code if prompted) to pull field-level change history for every synced ticket.

### Other commands

```bash
# Backend
cd backend
npm run build   # compile to dist/
npm start        # run the compiled server

# Frontend
cd frontend
npm run build           # production build
npm test                 # Karma/Jasmine unit tests
```

## License

MIT — see [LICENSE](./LICENSE).
