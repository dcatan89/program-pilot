# ProgramPilot — Change Log

---

## [Done] Google OAuth + Supabase Auth
**Status:** Working — Google login and email/password both functional

### Files Modified
- `server/prisma/schema.prisma` — made `password` optional, added `supabaseId String? @unique` to User model
- `server/src/middleware/auth.ts` — replaced custom JWT verify with `supabase.auth.getUser(token)`
- `server/src/routes/auth.ts` — removed `/login` endpoint, added `/sync` (upsert user on first OAuth login), updated `/me` to look up by `supabaseId`
- `server/.env` — replaced `JWT_SECRET` / `SUPABASE_JWT_SECRET` with `SUPABASE_URL` + `SUPABASE_ANON_KEY`; added `?pgbouncer=true` to DATABASE_URL to fix prepared statement errors with pgBouncer transaction pooler
- `client/src/hooks/useAuth.ts` — replaced axios-based auth with Supabase Auth (email + Google OAuth)
- `client/src/pages/Login.tsx` — added Google sign-in button
- `client/src/lib/supabase.ts` — **new file**, Supabase client singleton
- `client/.env` — **new file**, `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- `client/postcss.config.js` — changed `export default` to `module.exports` (CJS fix)
- `client/package.json` — added `@supabase/supabase-js`
- `server/package.json` — added `@supabase/supabase-js`

### Database (Supabase SQL Editor — run manually)
- All tables created via raw SQL (prisma db push hangs on pooler connection)
- Tables: User, Staff, City, StaffCity, Season, Program, Session, StaffAssignment, ExternalProgram

### How to Revert Auth to Email/Password Only
1. Restore `server/src/middleware/auth.ts` to use `jwt.verify(token, process.env.JWT_SECRET!)`
2. Restore `server/src/routes/auth.ts` to original `/login` + `/me` endpoints
3. Restore `client/src/hooks/useAuth.ts` to axios-based login
4. Remove Google button from `client/src/pages/Login.tsx`
5. Remove `client/src/lib/supabase.ts`
6. Remove `@supabase/supabase-js` from both package.json files

---

## [Done] Initial Scaffold
- Full project scaffolded: React 18 + TypeScript + Vite + Tailwind (client), Node + Express + Prisma (server)
- Committed and pushed to `git@github.com:dcatan89/program-pilot.git`

---

## [Done] Infrastructure
- Supabase project created: `hypnrzwngksrlbyehttz`
- Connection pooler URL configured in `server/.env`
- Google Cloud OAuth credentials created (Client ID + Secret added to Supabase)
