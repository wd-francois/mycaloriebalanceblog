# MyCalorieBalance — Claude Code Instructions

## Two distinct apps live in this repo

### Pro
The new cloud-based version. This is the **active development target**.

**Pro files (safe to edit freely):**
- `src/components/pro/` — all Pro React components
- `src/pages/pro/` — Pro Astro page(s)
- `convex/` — Convex backend (auth, schema, queries, mutations)

### Original
The original local-first app. It is **feature-complete and must not be changed** unless the user explicitly says "change the Original app."

**Original files (read-only by default):**
- `src/components/` (excluding `pro/`) — Original React components
- `src/pages/` (excluding `pro/`) — Original Astro pages
- `src/hooks/`, `src/lib/`, `src/utils/`, `src/contexts/`, `src/styles/`, `src/config/`

## Shared files — ask before touching
`src/layouts/`, `src/layouts/components/` (e.g. `Layout.astro`, `TopNavigation.astro`) are shared between both apps. If a task requires editing these, **stop and ask the user** — explain what needs to change and why — before making any edits.

## Default assumption
When the user says "add X" or "fix Y" with no qualifier, assume they mean the **Pro** app.

## Stack
- Frontend: Astro + React (JSX)
- **Pro** backend: Convex (auth, database, file storage)
- **Original** backend: local IndexedDB via `src/lib/database.js`
