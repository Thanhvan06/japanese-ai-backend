# Admin Listening & Speaking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement admin CRUD and stats for listening and speaking practice in the backend (`japanese-ai-backend`) and admin UI pages in the frontend (`japanese-ai-frontend`).

**Architecture:** Extend existing Express + Prisma backend with new admin-prefixed routes and reuse existing listening/speaking models and attempt tables. On the frontend, add two new admin pages under `AdminLayout` protected by `AdminRoute`, consuming the new admin APIs via the shared `api` helper.

**Tech Stack:** Node.js, Express, Prisma, React, Vite, Tailwind/CSS modules, existing `api` client.

---

### Task 1: Backend - Admin listening routes and controller functions

**Files:**
- Modify: `src/controllers/listening.controller.js`
- Modify: `src/routes/listening.routes.js`
- (Optional) Create later: `src/routes/adminListening.routes.js` if separation is desired
- Test: (future) `tests/listening.admin.test.js`

**Step 1: Add admin-only helper to enforce admin role**

- In `src/middlewares/admin.js` or a new helper, ensure there is a function (or add one) like `requireAdmin` that:
  - Assumes `auth(true)` already ran and `req.user` exists.
  - Checks `req.user.role === 'admin'`.
  - Returns 403 if not admin.
- If `admin.js` middleware already has equivalent logic, plan to reuse it on new routes.

**Step 2: Add admin listening controller functions**

- In `src/controllers/listening.controller.js`, append new exports:
  - `getAdminListeningSets`:
    - Reads `level`, `page`, `limit` from `req.query`.
    - Queries `prisma.listening_sets.findMany` with optional `jlpt_level` filter, include `items` for counts.
    - For each set, compute:
      - `itemsCount`.
      - Basic stats by aggregating `listening_attempts` for items in the set (total attempts, correct count, accuracy).
  - `createAdminListeningSet`:
    - Reads `title`, `jlpt_level`, `description`, `is_published` from `req.body`.
    - Creates new `listening_sets` record and returns it.
  - `updateAdminListeningSet`:
    - Reads `id` from `req.params`, updates allowed fields, returns updated record.
  - `deleteAdminListeningSet`:
    - Reads `id` from `req.params`.
    - Inside a Prisma transaction, delete child `listening_items` and optionally `listening_attempts` for those items, then delete the set.
  - `getAdminListeningItemsBySet`:
    - Reads `setId` from `req.params`.
    - Fetches items for that set and aggregates `listening_attempts` per item for stats.
  - `createAdminListeningItem`:
    - Reads `setId` from `req.params` and all item fields from `req.body`.
    - Creates new `listening_items` row.
  - `updateAdminListeningItem`:
    - Reads `itemId` from `req.params`, updates the item.
  - `deleteAdminListeningItem`:
    - Deletes the item and optionally its attempts.
  - `getAdminListeningStatsOverview`:
    - Reads `level` from `req.query`.
    - Computes:
      - total sets, total items.
      - total attempts.
      - average accuracy by combining attempts.
      - top N hardest items (lowest accuracy with enough attempts).
  - `getAdminListeningStatsBySet`:
    - Reads `setId`.
    - For each item in the set, returns per-item attempts and accuracy.

**Step 3: Wire admin listening routes**

- In `src/routes/listening.routes.js`, import `auth` and admin helpers.
- Add a new `Router` or extend existing one with admin-prefixed paths, for example:
  - `router.get("/admin/sets", auth(true), requireAdmin, getAdminListeningSets);`
  - `router.post("/admin/sets", auth(true), requireAdmin, createAdminListeningSet);`
  - `router.put("/admin/sets/:id", auth(true), requireAdmin, updateAdminListeningSet);`
  - `router.delete("/admin/sets/:id", auth(true), requireAdmin, deleteAdminListeningSet);`
  - `router.get("/admin/sets/:setId/items", auth(true), requireAdmin, getAdminListeningItemsBySet);`
  - `router.post("/admin/sets/:setId/items", auth(true), requireAdmin, createAdminListeningItem);`
  - `router.put("/admin/items/:itemId", auth(true), requireAdmin, updateAdminListeningItem);`
  - `router.delete("/admin/items/:itemId", auth(true), requireAdmin, deleteAdminListeningItem);`
  - `router.get("/admin/stats/overview", auth(true), requireAdmin, getAdminListeningStatsOverview);`
  - `router.get("/admin/stats/by-set/:setId", auth(true), requireAdmin, getAdminListeningStatsBySet);`

**Step 4: Manual sanity testing for listening admin**

- Start backend server.
- Use curl/Postman to:
  - Call `GET /api/listening/admin/sets` (or configured path) as admin and verify data.
  - Create/update/delete sets and items.
  - Fetch stats endpoints and confirm numbers match expectations on seed data.

---

### Task 2: Backend - Admin speaking routes and controller functions

**Files:**
- Modify: `src/controllers/speaking.controller.js`
- Modify: `src/routes/speaking.routes.js`
- Test: (future) `tests/speaking.admin.test.js`

**Step 1: Add admin speaking controller functions**

- In `src/controllers/speaking.controller.js`, append:
  - `getAdminSpeakingPhrases`:
    - Reads `level`, `topic`, `page`, `limit`.
    - Uses `prisma.speaking_phrases.findMany` with filters.
    - For each phrase, aggregates `speaking_attempts` for count and average `accuracy_score`.
  - `createAdminSpeakingPhrase`:
    - Creates new `speaking_phrases` row with fields from `req.body`.
  - `updateAdminSpeakingPhrase`:
    - Updates fields of an existing phrase.
  - `deleteAdminSpeakingPhrase`:
    - Deletes phrase, optionally deleting `speaking_attempts` linked to it.
  - `getAdminSpeakingStatsOverview`:
    - Uses `speaking_attempts` and `speaking_phrases` to compute:
      - total phrases.
      - total attempts.
      - overall average accuracy.
      - top hardest phrases (lowest average).

**Step 2: Expose admin speaking routes**

- In `src/routes/speaking.routes.js`, import admin helpers and new controller functions.
- Add new routes such as:
  - `router.get("/admin/phrases", auth(true), requireAdmin, getAdminSpeakingPhrases);`
  - `router.post("/admin/phrases", auth(true), requireAdmin, createAdminSpeakingPhrase);`
  - `router.put("/admin/phrases/:id", auth(true), requireAdmin, updateAdminSpeakingPhrase);`
  - `router.delete("/admin/phrases/:id", auth(true), requireAdmin, deleteAdminSpeakingPhrase);`
  - `router.get("/admin/stats/overview", auth(true), requireAdmin, getAdminSpeakingStatsOverview);`
- Optionally:
  - Reuse `generatePhraseAudio` for admin by protecting it with admin auth on a separate path or by checking admin in the existing handler.

**Step 3: Manual sanity testing for speaking admin**

- With backend running and admin token:
  - Call `GET /api/speaking/admin/phrases` to list phrases.
  - Create/update/delete phrases.
  - Call stats overview endpoint and verify aggregates on seed data.

---

### Task 3: Frontend - Wire admin routes and menu items

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/components/AdminRoute.jsx` (only if role checks need adjustment)

**Step 1: Add React routes for new admin pages**

- In `src/App.jsx` (or wherever routes are declared):
  - Import `AdminListening` and `AdminSpeaking` (to be created).
  - Add:
    - `<Route path="/admin/listening" element={<AdminRoute><AdminListening /></AdminRoute>} />`
    - `<Route path="/admin/speaking" element={<AdminRoute><AdminSpeaking /></AdminRoute>} />`

**Step 2: Add menu links in `Sidebar`**

- In `src/components/Sidebar.jsx`:
  - Add nav items under the Admin section linking to `/admin/listening` and `/admin/speaking`.
  - Ensure they are only shown when `user` is admin (reuse existing logic used for other admin pages).

---

### Task 4: Frontend - Implement `AdminListening` page

**Files:**
- Create: `src/pages/admin/AdminListening.jsx`
- Use existing: `src/pages/admin/AdminLayout.jsx`
- Use helper: `src/lib/api.js`

**Step 1: Basic layout and state**

- Create `AdminListening.jsx`:
  - Wrap content with `<AdminLayout title="Quản lý luyện nghe">`.
  - State:
    - `level`, `exerciseType`, `sets`, `selectedSet`, `items`, `statsOverview`, `loading`, `error`.

**Step 2: Fetch overview and sets**

- On mount and when `level` changes:
  - Call `/api/listening/admin/stats/overview?level=...` to populate stats cards.
  - Call `/api/listening/admin/sets?level=...` to populate table of sets.

**Step 3: Implement sets table and CRUD UI**

- Render table of sets with:
  - Columns: name, level, items count, published flag, attempts, accuracy, action buttons.
  - Click row or button to select a set and load items via `/api/listening/admin/sets/:setId/items`.
  - Add button "Tạo set" which opens a modal or inline form:
    - On submit, call `POST /api/listening/admin/sets` and refresh list.
  - For each row, add edit/delete buttons:
    - Edit opens form prefilled, calls `PUT /api/listening/admin/sets/:id`.
    - Delete confirms, then calls `DELETE /api/listening/admin/sets/:id` and refreshes.

**Step 4: Implement items panel for selected set**

- When `selectedSet` is set:
  - Fetch items for set (if not already loaded) and show table:
    - Columns: id, exercise type, question, has audio, attempts, accuracy, actions.
  - Add button "Thêm câu hỏi":
    - Simple modal form with fields:
      - `exercise_type` (select).
      - `question`.
      - Depending on type, dynamic inputs for options/words/transcript.
    - On submit, call `POST /api/listening/admin/sets/:setId/items` then refresh.
  - For each item:
    - Edit button: open same form prefilled, call `PUT /api/listening/admin/items/:itemId`.
    - Delete button: call `DELETE /api/listening/admin/items/:itemId`.

**Step 5: Optional audio helpers**

- Add per-item actions to:
  - Upload audio via `POST /api/listening/upload` and then update item with returned `audio_url`.
  - Generate audio via `POST /api/listening/generate-audio` with transcript and update item.

---

### Task 5: Frontend - Implement `AdminSpeaking` page

**Files:**
- Create: `src/pages/admin/AdminSpeaking.jsx`
- Use existing: `src/pages/admin/AdminLayout.jsx`

**Step 1: Basic layout and state**

- Similar structure to `AdminListening`, but for phrases:
  - Wrap in `<AdminLayout title="Quản lý luyện nói">`.
  - State: `level`, `topic`, `phrases`, `statsOverview`, `loading`, `error`.

**Step 2: Fetch overview and phrases**

- On mount and when filters change:
  - Call `/api/speaking/admin/stats/overview?...` for stats.
  - Call `/api/speaking/admin/phrases?...` for table data.

**Step 3: Implement phrases table and CRUD**

- Table columns:
  - id, JP text, romaji, Vietnamese, topic, level, published flag, has audio, attempts, avg score, actions.
- Add button "Thêm câu mẫu":
  - Form: `jp`, `romaji`, `vi`, `topic`, `jlpt_level`, `is_published`.
  - Submit → `POST /api/speaking/admin/phrases`.
  - Refresh table.
- Each row:
  - Edit → `PUT /api/speaking/admin/phrases/:id`.
  - Delete → `DELETE /api/speaking/admin/phrases/:id`.
  - Generate audio if missing → `POST /api/admin/speaking/phrases/:id/generate-audio` (or reused route).

---

### Task 6: Basic regression checks

**Step 1: Smoke test existing user flows**

- Verify existing listening endpoints (non-admin) still behave:
  - `/api/listening?level=N5...`, `/api/listening/review`, `/api/listening/progress`, `/api/listening/:id`.
- Verify speaking endpoints:
  - `/api/speaking/phrases`, `/api/speaking/practice`, `/api/speaking/stats`.

**Step 2: Sanity-check admin UI**

- Login as admin in frontend.
- Navigate to:
  - `/admin/listening` and exercise CRUD + stats.
  - `/admin/speaking` and exercise CRUD + stats.
- Ensure non-admin users cannot access these pages (redirect or 403).

