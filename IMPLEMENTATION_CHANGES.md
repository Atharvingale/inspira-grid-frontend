# Implementation changes

This file records repository changes made during the recovery work.

## Security and build reliability

- Removed hard-coded Firebase Admin credential fallbacks; server startup now requires environment-provided Firebase credentials.
- Removed production build settings that ignored TypeScript and ESLint failures.
- Removed development mock-token authentication support.

## Required external action

- Rotate every Firebase Admin private key, GitHub OAuth secret, Pusher secret, and deployment credential that was previously exposed, then configure replacements in Vercel.

## Platform safety

- Removed the unused NextAuth endpoint and dependency; Firebase Auth is the sole identity system.
- Added sanitized environment-variable documentation, Firebase Firestore/Storage rules, a Vercel-compatible CI quality gate, and a release checklist.

## Core workflow

- Pusher private channel authentication now verifies Firebase tokens and authorizes only the current user's channel.
- Application acceptance now uses a Firestore transaction for membership, capacity, application status, and notification creation.
- Replaced the mock upload endpoint with authenticated Firebase Storage uploads, server-side file validation, and one-hour signed download URLs.
- Added a native Node test suite for key security and build invariants.
- Completed authorized message edits, reactions, soft deletion, and participant-aware typing events.
- Added role-protected user suspension and project moderation APIs with audit-log records.
- Resolved the existing TypeScript errors; `npm run type-check` now passes.
- Set Next.js output tracing to this repository so parent-directory lockfiles cannot break production builds.
