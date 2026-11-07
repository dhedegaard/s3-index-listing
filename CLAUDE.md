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
- Verify against the real bucket with a production build: `direnv exec . npm run build && direnv exec . npx next start -p <port>`, then `curl -s -o /dev/null -w '%{http_code}'`: folders 200, files 307 to a presigned URL, missing paths 404.
- Don't add `loading.tsx` or `<Suspense>` around the page: a streamed fallback locks the status at 200, so `notFound()` no longer 404s and `redirect()` no longer 307s. Click feedback comes from `PendingLabel` (`useLinkStatus`) instead; render folder links with `FolderLink`, which carries it and `prefetch={false}`, and build key URLs with `keyHref`, which encodes each segment (its inverse is `decodeSegments`).
- `next dev` writes an untracked `AGENTS.md` (Next's agent rules); don't commit it with unrelated work.
- Vercel project is `p.dhedegaard.dk` (team `d-hedegaard`); the repo has no `.vercel/` link. Hobby keeps request logs 1h and Observability queries need Pro; the app logs nothing, so MCP runtime logs are empty — read requests with `vercel logs --scope d-hedegaard -p p.dhedegaard.dk --since 1h --json`.

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

The route builds as dynamic, so caching comes only from the S3 client.

### S3 client (`src/clients/s3-client.ts`)

- `ListObjectsV2` is billed as an S3 Tier 1 request. Any change that makes one LIST per distinct URL lets bots and scanners drive up the AWS bill.
- `listPrefix(prefix)` is the only place that lists (`Delimiter: '/'`, one page of 1000). It's wrapped in `unstable_cache` (1h) and caches a JSON-safe projection rather than the SDK output. Reads are checked with the compiled `Listing.validate`; an entry that fails is treated as a miss.
- Bump `LISTING_CACHE_VERSION` when the `Listing` schema or `fetchListing`'s output changes: Next keys the cache on the callback's source, not on what it calls, so old entries would otherwise be served (or cost an uncached LIST each) until they expire.
- `getBucketContent` checks each path segment against its parent's cached listing (`resolveEntry`), so a path that doesn't exist 404s without its own LIST. It's wrapped in React `cache` and takes a string, because `cache` compares arguments by identity.
- Known limits: new uploads 404 until the parent listing refreshes (≤1h); under a truncated parent (>1000 entries) a path is "unknown" and costs its own LIST, then falls back to a presigned URL.
- Next leaves route params percent-encoded (`g%C3%A5tur.png`); `decodeSegments` (`src/key-path.ts`) decodes them once, and 404s a malformed escape, a decoded `/` (`%2F`) or a control character. The walk matches names NFC/NFD-insensitively (`findKey`) and uses the stored key from then on.
- Vercel's edge rewrites some URLs before the app sees them, so production differs from `next start`: `%2F` arrives as `/` (an alias for the real path, so `/bold%2Fbold.css` 307s) and `%00` gets a 400 from the edge. Check these cases against production, not just locally.
- Keys with a hidden segment (`HIDDEN_NAMES`: `.git`, `.env*`, `.htaccess`, …, case-insensitive) are dropped from the cached listings and 404 before any lookup, so uploads don't leak repo history or secrets.

### Environment validation (`src/server-env.ts`)

`SERVER_ENV` is a module-level Zod parse — the app will throw at import time if any required env var is missing, surfacing misconfiguration immediately rather than at request time.

## Tech stack notes

- **Next.js 16** with React 19, App Router, RSC throughout. The only client component is `src/components/pending-label.tsx`.
- **Tailwind CSS v4** via `@tailwindcss/postcss`.
- **zod** is imported as a namespace only (`import * as z from 'zod'`), enforced by a basic `no-restricted-syntax` rule in `eslint.config.mjs`. Schemas share their type's name (`const Listing` + `interface Listing`). Hot schemas use `z.compile()` (zod ≥ 4.5) with sync `safeParse`/`validate`, since async parses skip the compiled path.
- **ESLint** config extends `next/core-web-vitals` + `next/typescript` + `prettier/flat`. Run lint before committing.
- **Prettier** config at `.prettierrc.json`; formatting is enforced via eslint-config-prettier.
- TypeScript strict mode via `@tsconfig/strictest`.
