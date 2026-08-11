# Release checklist

- [ ] Rotate all credentials exposed before this recovery work and configure replacements in Vercel.
- [ ] Restrict the Firebase Web API key by HTTP referrer and enabled Google APIs; never commit it outside environment-specific deployment configuration.
- [ ] Set Firebase Admin, Pusher, and GitHub environment variables from `.env.example`.
- [ ] Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to empty values in Vercel; do not point them to `inspira-grid-backend.vercel.app`.
- [ ] Deploy `firestore.rules` and `storage.rules` to the intended Firebase project.
- [ ] Configure the GitHub OAuth callback URL and verify repository linking as a project owner.
- [ ] Verify Pusher private-channel authentication with two different users.
- [ ] If the browser reports `ERR_BLOCKED_BY_CLIENT` for `firestore.googleapis.com`, allow that domain in the content blocker and retry. This is a local browser configuration issue, not a Firestore rules or deployment failure.
- [ ] Run `npm run type-check`, `npm run lint`, and `npm test`.
- [ ] Smoke-test registration, profile completion, project application, acceptance, messaging, upload, and moderation.
