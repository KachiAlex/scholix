# School Management Solution (SMS)

This repository contains the implementation for a secondary school **School Management Solution (SMS)** covering:

- Secure **Computer-Based Testing (CBT)**
- **Configurable result computation** + transcripts
- Core **school operations** (SIS, attendance, timetable, fees, portals)

## Repo structure

- `apps/api`:
  - NestJS API
  - Prisma ORM
  - PostgreSQL (via Docker)
- `apps/web`:
  - Next.js web app (portal UI)

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres/Redis)

## Run locally (development)

1. Start infrastructure:
  - `docker compose up -d`
2. Install dependencies (from repo root):
  - `npm install`
3. Generate Prisma client + run migrations (from `apps/api`):
  - `npm run prisma:generate`
  - `npm run prisma:migrate`
4. Start API + Web (from repo root):
  - `npm run dev`

## Notes

- This repo previously contained a portfolio website. You asked to replace the folder contents to proceed with the SMS implementation.
- The root `index.html` is now a placeholder; the actual UI runs from `apps/web`.
