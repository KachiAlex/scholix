# Scholix

This repository contains the implementation for **Scholix**, a secondary school management solution covering:

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
  - Next.js Route Handlers for `/api/*` (Vercel-compatible backend)
- Shared schema features (Prisma):
  - SIS entities (sessions, terms, classes, subjects, students, guardians)
  - CBT blueprint (questions, exams, attempts)
  - New results module added to API and Prisma now includes ResultTemplate + StudentResultDraft tables while Next.js API + UI has matching routes.

## Source of truth

- **Git repository**: <https://github.com/KachiAlex/scholix>
- **Default DATABASE_URL**: `postgresql://neondb_owner:npg_pZj8TINg9SyK@ep-patient-butterfly-ad7gv48g-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres/Redis)

## Run locally (development)

1. Start infrastructure:
  - `docker compose up -d`
2. Install dependencies (from repo root):
  - `npm install`
3. Copy environment templates and set secrets (from repo root):
  - `cp apps/api/.env.example apps/api/.env`
  - `cp apps/web/.env.example apps/web/.env`
  - set `JWT_SECRET` to the **same value** in both files (and configure any other secrets)
4. Generate Prisma client + run migrations (from `apps/api`):
  - `npm run prisma:generate`
  - `npm run prisma:migrate`
5. Start API + Web (from repo root):
  - `npm run dev`

## Notes

- This repo previously contained a portfolio website. You asked to replace the folder contents to proceed with the SMS implementation.
- The root `index.html` is now a placeholder; the actual UI runs from `apps/web`.
- Result/transcript APIs are in progress; schema is prepared for templates + drafts while services/routes are being implemented.
