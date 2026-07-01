# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js (App Router) tool for tracking, comparing, and merging local filesystem directories. A user registers absolute directory paths ("folders") in a local SQLite database; the app scans each folder's files, checksums them, and lets the user compare folders side-by-side to find matching/mismatched/missing files, copy files between folders, and archive or trash folders that are no longer needed.

## Commands

```bash
npm run dev     # Start dev server (Next.js + Turbopack) at localhost:3000
npm run build   # Production build
npm run start   # Run production build
npm run lint    # ESLint (next/core-web-vitals + next/typescript)
```

There is no test suite configured in this repo.

## Architecture

### Data layer (`src/lib/`)

- **`db.ts`** — Single `better-sqlite3` connection to `data/data.db` (created on first run, gitignored). Schema is created/migrated imperatively at import time via `CREATE TABLE IF NOT EXISTS` + a sequence of best-effort `ALTER TABLE` migrations wrapped in try/catch. There is no migration framework — when adding a column, follow the existing pattern: check `PRAGMA table_info(<table>)` for the column, then `ALTER TABLE ... ADD COLUMN` if missing.
- **`folderStore.ts`**, **`fileItemStore.ts`**, **`settingsStore.ts`** — CRUD wrappers around three tables: `folders`, `file_items` (FK to folders, cascade delete), `settings` (singleton row, `id = 1`). All reads/writes go through these modules; nothing queries `db` directly outside `src/lib/`.
- **`directoryScanner.ts`** — Walks the real filesystem to build a `DirectoryNode` tree (used for the "add subdirectories" flow) and to enumerate a folder's immediate subdirectories.
- **`syncManager.ts`** (`syncFolder`) — The core scan operation: recursively walks a folder's absolute path on disk (excluding `settings.globalExcludePatterns` + the folder's own `excludePatterns`, matched with `micromatch`), SHA-256 checksums every file, and diffs against the existing `file_items` rows for that folder (add/update/remove as needed). Updates the folder's `totalBytes`, `countFiles`, `lastSync`, and aggregate `checksum`.
- **`checksum.ts`** (`calculateFolderChecksum`) — Folder-level checksum = SHA-256 of the concatenation of all file checksums, sorted by `relativeRoute`. Two folders are "identical" iff their `checksum` fields match.
- **`archiveStore.ts`** / **`trashStore.ts`** — Type definitions only (`ArchivedFolder`, `TrashedFolder`). Archive/trash are not database tables — they are directories on disk (`settings.archivedProjectsPath`, `settings.trashDirectory`) where each moved folder gets `<dir>/<folderId>/<originalFolderName>/` plus a sibling `folder.json` metadata file. Listing archived/trashed folders means reading these `folder.json` files from disk, not querying SQLite.

### Folder lifecycle

A `Folder` row's `absoluteRoute` always points at where the directory currently lives on disk. Moving a folder to archive/trash/merge is a real `fs.rename` plus a database row update/delete — not a soft flag:

- **Trash** (`src/app/actions/trash.ts`, `src/app/api/trash/route.ts`): moves the directory into `trashDirectory/<folderId>/<name>`, writes `folder.json`, deletes the folder's `file_items` rows and the `folders` row. Restore does the reverse and re-inserts the folder row (reusing the original `id`).
- **Archive**: same pattern as trash, using `archivedProjectsPath` (`src/app/actions/archive.ts`, `src/app/api/archive/route.ts`).
- **Merge**: `folders.merging` marks a folder as a merge-destination. `POST /api/folders` with `{ merging: true, folderName }` creates a new empty directory under `settings.mergeDirectory` and registers it. The merge UI (`src/app/merge/page.tsx`) treats the first selected folder as the "merge column" (destination) and the rest as sources to compare against and copy from via `POST /api/copy-files`, which copies each source file onto the target path and then re-runs `syncFolder` on the target.

### Routes

- `src/app/page.tsx` — folder list / dashboard (add folders, trigger sync, navigate to detail/edit/merge/trash/archive).
- `src/app/folders/[id]/page.tsx` — single folder detail (file list). `src/app/folders/[id]/edit/` — edit a folder's exclude patterns.
- `src/app/merge/page.tsx` — client component driving the multi-folder comparison/merge UI described above; folder selection is persisted in the `?folders=id1,id2` URL query param.
- `src/app/settings/page.tsx` + `actions.ts` — edit global settings (`globalExcludePatterns`, `trashDirectory`, `archivedProjectsPath`, `mergeDirectory`).
- `src/app/trash/page.tsx`, `src/app/archive/page.tsx` — list/restore/permanently-delete folders parked in trash/archive.
- `src/app/api/**` — REST-ish JSON endpoints backing the above pages (folders CRUD, file listing, sync, copy-files, archive, trash). Some mutations are also exposed as server actions (`'use server'` / `'server'` files under `src/app/actions*`) that are called directly from server components/forms.

### Conventions to preserve

- Exclude pattern matching is inconsistent by design across two code paths: `directoryScanner.ts` treats patterns as **regexes** tested against a single path segment (`name`), while `syncManager.ts` treats patterns as **micromatch globs** tested against the full relative path. Don't unify these without checking both call sites' expectations.
- All filesystem paths stored in the DB are absolute (`absoluteRoute`) or relative to a folder's root (`relativeRoute`), normalized to forward slashes for matching in `syncManager.ts`.
- Path aliasing: `@/*` maps to `src/*` (see `tsconfig.json`). Some files use `@/lib/...` imports, others use relative `../../lib/...` — both resolve the same; prefer `@/` in new code for consistency with newer files.
