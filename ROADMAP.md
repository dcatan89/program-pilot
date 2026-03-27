# ProgramPilot — Roadmap

Status key: ✅ Done · 🔄 In Progress · 🔲 Not Started

---

## Phase 1 — Foundation ✅
Core infrastructure, auth, and data model.

| Feature | Status |
|---------|--------|
| Project scaffold (React + Node + Prisma) | ✅ |
| Supabase PostgreSQL database | ✅ |
| Email/password auth | ✅ |
| Google OAuth | ✅ |
| Automated DB migrations (`prisma db push`) | ✅ |

---

## Phase 2 — Scheduler ✅
Staff scheduling grid with shift management.

| Feature | Status |
|---------|--------|
| Staff × day grid (week / 2-week / month views) | ✅ |
| Add / edit / delete shifts | ✅ |
| Visual colored shift blocks (AM, PM, Full Day) | ✅ |
| Proportional block height by duration | ✅ |
| Drag-to-resize (change end time) | ✅ |
| Drag-to-move (reassign staff or date) | ✅ |
| Staff total hours display | ✅ |

---

## Phase 3 — Production Hardening ✅
Make the app safe and stable for real use.

| Feature | Priority | Status |
|---------|----------|--------|
| Input validation (Zod on all API routes) | High | ✅ |
| Rate limiting (express-rate-limit) | High | ✅ |
| Security headers (helmet.js) | High | ✅ |
| React error boundaries | High | ✅ |
| Health check endpoint (`GET /health`) | Medium | ✅ |
| Structured logging (pino) | Medium | ✅ |
| Graceful server shutdown | Low | ✅ |
| Pagination on shifts query | Medium | 🔲 (deferred — date range is bounded to 90 days) |

---

## Phase 4 — Deployment ✅
Get the app running on a real URL.

| Feature | Priority | Status |
|---------|----------|--------|
| Server deployment (Railway) | High | ✅ https://program-pilot-server-production.up.railway.app |
| Client deployment (Vercel) | High | ✅ https://client-five-rho-26.vercel.app |
| Production environment variables | High | ✅ |
| CI/CD (GitHub Actions — typecheck on push) | Low | ✅ |
| Custom domain | Low | 🔲 |

---

## Phase 5 — Program & Season Management ✅
Core domain features beyond scheduling.

| Feature | Priority | Status |
|---------|----------|--------|
| Season CRUD | High | ✅ |
| Program CRUD | High | ✅ |
| Session CRUD | High | ✅ |
| Staff assignment to sessions | High | ✅ |
| No-class dates per session | Medium | ✅ |
| External programs (conflict tracking) | Medium | ✅ |
| Conflict detection | Medium | ✅ |

---

## Phase 6 — Staff Management 🔲
Staff profiles and city clearances.

| Feature | Priority | Notes |
|---------|----------|-------|
| Staff list page | High | View/edit all staff |
| Add / deactivate staff | High | |
| City clearance management | Medium | Which cities a staff member can work |
| Staff availability / time off | Medium | Block out dates per staff |
| Staff notes and contact info | Low | |

---

## Phase 7 — Reporting & Export 🔲
Data visibility and exports.

| Feature | Priority | Notes |
|---------|----------|-------|
| Weekly schedule PDF export | High | Print-friendly schedule |
| Staff hours report | Medium | Hours per staff over a date range |
| City coverage report | Medium | Which cities are staffed each day |
| CSV export of shifts | Low | For external spreadsheet use |

---

## Phase 8 — Multi-User & Roles 🔲
Support for multiple admins and view-only access.

| Feature | Priority | Notes |
|---------|----------|-------|
| SUPER_ADMIN role enforcement | Medium | Currently role exists but isn't enforced |
| Invite new admin users | Medium | Email invite flow |
| Read-only staff portal | Low | Staff can view their own schedule |

---

## Known Technical Debt
- No tests (unit, integration, or e2e)
- No API documentation
- `client/src/routes/schedule.ts` (old schedule route) may be stale — audit and remove if unused
