# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js 16 (App Router) application that renders an S3 bucket as a browsable directory listing, similar to Apache/nginx autoindex. Object paths map directly to URL paths; directories are listed as links, files redirect to a presigned S3 URL.

## Commands

```bash
npm run dev      # dev server with Turbopack
npm run build    # production build
npm run lint     # ESLint (next + prettier)
```

No test suite exists.

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
2. `page.tsx` — calls `getBucketContent` (double-cached: React `cache` + `unstable_cache`) and branches on the response type:
   - `prefix-response` → renders directory rows (subdirectories + objects)
   - `object-response` → `redirect()` to a 60-second presigned S3 URL
   - `not-found` → `notFound()`

Page-level ISR revalidation is set to 30 minutes (`export const revalidate = 1800`).

### S3 client (`src/clients/s3-client.ts`)

`getBucketContent(pathname)` is wrapped in both React `cache` (deduplication within a render) and `unstable_cache` (1-hour ISR cache keyed on bucket + prefix). It calls `ListObjectsV2` with `Delimiter: '/'` to simulate directory semantics. If the listing returns empty but the path looks like a file, it falls back to generating a presigned `GetObject` URL.

### Environment validation (`src/server-env.ts`)

`SERVER_ENV` is a module-level Zod parse — the app will throw at import time if any required env var is missing, surfacing misconfiguration immediately rather than at request time.

## Tech stack notes

- **Next.js 16** with React 19, App Router, RSC throughout — no client components except where `memo` is used for render optimization.
- **Tailwind CSS v4** via `@tailwindcss/postcss`.
- **ESLint** config extends `next/core-web-vitals` + `next/typescript` + `prettier/flat`. Run lint before committing.
- **Prettier** config at `.prettierrc.json`; formatting is enforced via eslint-config-prettier.
- TypeScript strict mode via `@tsconfig/strictest`.
