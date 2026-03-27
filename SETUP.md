# ProgramPilot — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL (local or cloud, e.g. Railway, Supabase, Neon)

---

## 1. Server Setup

```bash
cd server
npm install
```

Copy the env file and fill in your values:
```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/programpilot"
JWT_SECRET="any-long-random-string"
PORT=4000
CLIENT_URL="http://localhost:5173"
```

Run database migrations and seed:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

Start the server:
```bash
npm run dev
```

The server runs at **http://localhost:4000**

---

## 2. Client Setup

```bash
cd client
npm install
npm run dev
```

The client runs at **http://localhost:5173**

---

## Default Login

| Email | Password |
|-------|----------|
| admin@programpilot.com | admin123 |

---

## Project Structure

```
program-pilot/
├── client/          # React 18 + TypeScript + Vite + Tailwind
│   └── src/
│       ├── pages/   # Login, Dashboard, Schedule, Staff, Programs
│       ├── components/layout/   # Sidebar + Layout
│       ├── hooks/   # useAuth
│       ├── api/     # Axios client
│       └── types/   # TypeScript interfaces
│
└── server/          # Node.js + Express + TypeScript + Prisma
    ├── prisma/      # Schema + seed
    └── src/
        ├── routes/  # auth, staff, schedule, cities
        ├── middleware/  # JWT auth
        └── lib/     # Prisma client singleton
```

## Key Features
- **Schedule Grid** — Week × City visual grid with drag-to-assign staff
- **Conflict Detection** — Auto-flags staff double-booked on same dates
- **NMUSD Overlap** — Orange highlight on weeks overlapping external programs
- **Staff Clearances** — Staff only shown for cities they're cleared for
- **Programs & Sessions** — Full CRUD for camp programs and individual sessions
