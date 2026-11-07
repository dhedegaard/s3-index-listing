# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js 16 (App Router) application that renders an S3 bucket as a browsable directory listing, similar to Apache/nginx autoindex. Object paths map directly to URL paths; directories are listed as links, files redirect to a presigned S3 URL.

## Commands

```bash
npm run dev      # dev server with Turbopack
npm run build    # production build
npm run lint     # ESLint (next + prettier)
npx tsc --noEmit # typecheck (no script for it)
```

No test suite exists.

- Build without real credentials: `S3_REGION=eu-west-1 S3_BUCKET=x ACCESS_KEY=x SECRET_ACCESS_KEY=x npm run build`.
- Verify against the real bucket: `direnv exec . npx next dev --turbopack -p <port>`. Pages stream behind `loading.tsx`, so every response is HTTP 200; check the body for `NEXT_HTTP_ERROR_FALLBACK;404` (not found) or `NEXT_REDIRECT` (file redirect).
- `next dev` writes an untracked `AGENTS.md` (Next's agent rules); don't commit it with unrelated work.

## Environment variables

Required at runtime (validated at startup via Zod in `src/server-env.ts`):

```
S3_REGION=eu-west-1
S3_BUCKET=my-bucket
ACCESS_KEY=AKIA...
SECRET_ACCESS_KEY=...
```

Locally these are set via `.envrc` (direnv).

## Architecture

### Request flow

Every URL path is handled by the single catch-all route `src/app/[[...prefix]]/`.

1. `layout.tsx` — renders the `<table>` shell and a `..` parent-link row based on the current prefix segments from params.
2. `page.tsx` — calls `getBucketContent(path)` (path segments joined with `/`, `''` for root) and branches on the response type:
   - `prefix-response` → renders directory rows (subdirectories + objects)
   - `object-response` → `redirect()` to a 60-second presigned S3 URL
   - `not-found` → `notFound()`

`export const revalidate = 1800` has no effect: the route builds as dynamic, so caching comes only from the S3 client.

### S3 client (`src/clients/s3-client.ts`)

- `ListObjectsV2` is billed as an S3 Tier 1 request. Any change that makes one LIST per distinct URL lets bots and scanners drive up the AWS bill.
- `listPrefix(prefix)` is the only place that lists (`Delimiter: '/'`, one page of 1000). It's wrapped in `unstable_cache` (1h) and caches a JSON-safe projection, not the SDK output.
- `getBucketContent` checks each path segment against its parent's cached listing, so a path that doesn't exist 404s without its own LIST. It's wrapped in React `cache` and takes a string, because `cache` compares arguments by identity.
- Known limits: new uploads 404 until the parent listing refreshes (≤1h); under a truncated parent (>1000 entries) a path is "unknown" and costs its own LIST, then falls back to a presigned URL.
- `%2F` in a URL stays inside a single segment, so it never matches an S3 key.

### Environment validation (`src/server-env.ts`)

`SERVER_ENV` is a module-level Zod parse — the app will throw at import time if any required env var is missing, surfacing misconfiguration immediately rather than at request time.

## Tech stack notes

- **Next.js 16** with React 19, App Router, RSC throughout — no client components except where `memo` is used for render optimization.
- **Tailwind CSS v4** via `@tailwindcss/postcss`.
- **ESLint** config extends `next/core-web-vitals` + `next/typescript` + `prettier/flat`. Run lint before committing.
- **Prettier** config at `.prettierrc.json`; formatting is enforced via eslint-config-prettier.
- TypeScript strict mode via `@tsconfig/strictest`.
