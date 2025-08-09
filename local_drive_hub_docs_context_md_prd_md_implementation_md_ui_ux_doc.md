# /context.md

## Project Context & Agent Rules

You are building **LocalDriveHub** — a personal, local-only multi‑Google‑Drive backup tool (runs on `localhost`, developed in Cursor). This `context.md` captures the development-agent rules and the PRD-analysis workflow the project must follow.

### Primary Goals
- Allow a single user (you) to connect multiple Google Drive accounts locally and back up ~60 GB of files quickly.
- Keep the app local (no public hosting), simple to re-run after a system wipe.
- Deliver a working MVP in 1 day: connect up to 4 Google accounts, upload files with automatic account selection, and download/restore (single file + bulk zip).

### Development Agent Rules (short)
- Always consult `/Docs/Implementation.md` before starting work.
- Follow the staged plan: Foundation → Core → Advanced → Polish.
- Store OAuth tokens locally; encrypt them with a user passphrase.
- Prioritize reliability for large uploads (resumable uploads) and simple UX.
- No public OAuth verification is required because this is local use only; keep redirect URI to `http://localhost:3000`.

---

# /PRD.md

# Product Requirements Document — LocalDriveHub (MVP)

## 1. What is the app?
LocalDriveHub is a small, local-first desktop web app (runs on `localhost`) that aggregates multiple Google Drive accounts and provides an easy UI to upload and later download large sets of files for temporary backup and restore.

## 2. Primary use case
You need to backup ~60 GB of files quickly, wipe your laptop, and restore those files within ~2 days.

## 3. Users
- **Primary user (MVP):** Single developer / personal user.

## 4. Core features (MVP scope)
- **Connect Google Account (OAuth)** — authorize and store refresh tokens (encrypted locally). Supports up to 4 accounts for MVP.
- **Unified file browser (read-only)** — list files across accounts with account badges; basic search.
- **Upload files (auto-shard)** — select files/folders for upload; the app automatically selects the Drive(s) with available space and uploads using resumable uploads.
- **Download / Restore** — single-file download or bulk download as streamed ZIP.
- **Local token management** — encrypted tokens in SQLite and ability to re-connect after reinstall.

## 5. Non-functional requirements
- **Local-only**: All code and tokens stored locally; no hosting required.
- **Security**: Encrypt tokens with a user-supplied passphrase; use HTTPS only for OAuth calls handled by Google (browser redirects to localhost).
- **Performance**: Support large files via resumable uploads and streaming downloads; show progress UI.
- **Reliability**: Upload resume on network failure.

## 6. Out of scope (MVP)
- Multi-user / multi-device sync
- Public hosting or OAuth verification for publication
- Advanced deduplication or versioning

## 7. Success criteria
- You can upload ~60 GB across up to 4 accounts within a short window (a few hours depending on network).
- After wiping and reinstalling, you can reconnect accounts and re-download files successfully.
- UI is usable and shows progress for large transfers.

---

# /Implementation.md

# Implementation Plan for LocalDriveHub

## Feature Analysis
### Identified Features
- Google OAuth connect (local redirect) — obtain refresh tokens and account metadata.
- File listing aggregation — `files.list()` for each account, merged and searchable.
- Upload with auto-shard and resumable uploads — choose Drive(s) with space.
- Download & bulk ZIP streaming — stream files from Drive to browser as zip.
- Local SQLite metadata store and encrypted token storage.

### Feature Categorization
- **Must-Have:** OAuth connect, aggregated listing, upload auto-shard, download/zip streaming, local encrypted tokens.
- **Should-Have:** Drag & drop UI, progress bars, simple search, small CLI helper.
- **Nice-to-Have:** Resume upload on app restart, dedupe checks, import/export config.

## Recommended Tech Stack
### Frontend
- **Next.js (React)** — local dev, API routes, and ready to run inside Cursor. (`https://nextjs.org/docs`)
- **Tailwind CSS** — quick styling and responsive UI. (`https://tailwindcss.com/docs`)

### Backend
- **Node.js** (built-in via Next.js API routes) — handle OAuth flow, stream downloads, call Google Drive API.
- **googleapis** npm — official client for Drive API + OAuth. (`https://googleapis.dev/nodejs/googleapis/latest/`)

### Database
- **SQLite** — lightweight local DB for `accounts`, `files_metadata`, `uploads`.

### Additional Tools
- **archiver** or **zip-stream** (npm) for streaming zip files to the browser.
- **rclone** (optional) as a CLI alternative for immediate upload needs.
- **Node crypto** for symmetric encryption of refresh tokens (passphrase-based).

## Implementation Stages

### Stage 1: Foundation & Setup
**Duration:** 3–5 hours (priority for 1-day build)
- [ ] Scaffold Next.js project and basic pages.
- [ ] Add Tailwind and simple layout.
- [ ] Add `googleapis`, create OAuth helper and dev console notes for localhost redirect.
- [ ] Initialize SQLite schema (`accounts`, `files_metadata`, `uploads`).
- [ ] Add encryption helper using Node `crypto` and a passphrase prompt.

### Stage 2: Core Features
**Duration:** 5–7 hours
- [ ] Implement OAuth connect flow and account save (encrypted refresh token).
- [ ] Implement `files.list()` aggregation API route and lightweight merging logic.
- [ ] Create file browser UI with list/grid, account badges, and basic search.
- [ ] Implement upload UI (file selector + drag & drop) and server-side resumable upload handler.

### Stage 3: Advanced Features
**Duration:** 2–3 hours
- [ ] Implement bulk download as streamed zip (server fetches file streams from Drive and pipes to zip stream).
- [ ] Implement upload resume and retry logic.
- [ ] Add small import/export of account metadata (encrypted) to aid re-setup after reinstall.

### Stage 4: Polish & Testing
**Duration:** 1–2 hours
- [ ] Add progress bars, toasts, and basic accessibility checks.
- [ ] Test a full backup+restore cycle with a smaller dataset, then scale.
- [ ] Write a Reinstall & Restore README with step-by-step re-connection instructions.

## Quick timeline for 1‑day MVP
- Foundation & Setup: 3–5 hours
- Core Features (minimal): 5–7 hours
- Advanced & Polish: 2–3 hours
**Total:** 10–15 hours — achievable if you focus on the essentials and skip optional features.

## Notes & Risks
- For fastest progress, limit to **4 accounts max** and avoid building advanced dedupe.
- Use resumable uploads in Drive API to avoid re-uploading large files on failure.
- Keep your encryption passphrase safe; losing it means losing token access.

---

# /UI_UX_doc.md

# UI & UX for LocalDriveHub (MVP)

## Design goals
- **Clarity:** Show which account each file belongs to at a glance.
- **Simplicity:** Minimal screens: Connect Accounts, Browser/Upload, Restore.
- **Visibility:** Clear progress for uploads/downloads; actions must be obvious.

## Pages & Flows
1. **Welcome / Connect Accounts**
   - Prompt user to set a local passphrase (used to encrypt tokens).
   - Button: `Connect Google Account` (repeat up to 4 times).
   - Small hint: "Use up to 4 accounts to reach ~60 GB."

2. **Browser / Upload Page** (main screen)
   - Top bar: App name, Connect account button, Settings (passphrase change, export config).
   - Left column: Account list with used/available storage bars and quick-connect status.
   - Main area: Unified file list / grid with search and filter by account.
   - Right or floating: Upload panel (drag & drop) with selected files list and target account suggestions.
   - Footer: Active transfers, progress bars per transfer.

3. **Restore / Downloads**
   - Bulk-select files and `Download as ZIP` action.
   - Show estimated zip size and progress.

## Components
- **AccountCard:** name, email, used/total GB bar, remove button.
- **FileRow / FileCard:** file name, size, account badge, download button.
- **UploadPanel:** drag & drop area, queue list, start/cancel buttons.
- **TransferToast:** small notifications for success/failure.

## Interaction Patterns
- Drag a folder → app enumerates files (client-side) → shows upload queue → user clicks `Start Upload`.
- When uploading, the server chooses accounts with space and performs resumable uploads; UI shows per-file chunk progress.
- If the network fails, the UI shows "Paused — reconnect to resume".

## Accessibility & Responsive
- Ensure keyboard focus on primary actions (Connect, Upload, Download).
- Use ARIA labels for Drag & Drop area and progress bars.
- UI should scale to small laptop windows — two-column layout collapses to single column below 900px.

## Visual Style
- Minimal, utility-first: Tailwind classes for spacing and responsive.
- Two theme options: Light / Dark (respect OS prefers-color-scheme).
- Use clear green for success toasts and amber for warnings.

## Quick Wireframe (text)
- Header: [LocalDriveHub] [Connect Account] [Settings]
- Left pane: Accounts list (vertical)
- Main: Search bar → File list / Grid
- Right: Upload panel (collapsible)
- Bottom: Active transfers bar

---

# End of documents




