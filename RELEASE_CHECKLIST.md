# Release checklist

- [ ] Rotate all credentials exposed before this recovery work and configure replacements in Vercel.
- [ ] Set Firebase Admin, Pusher, and GitHub environment variables from `.env.example`.
- [ ] Deploy `firestore.rules` and `storage.rules` to the intended Firebase project.
- [ ] Configure the GitHub OAuth callback URL and verify repository linking as a project owner.
- [ ] Verify Pusher private-channel authentication with two different users.
- [ ] Run `npm run type-check`, `npm run lint`, and `npm test`.
- [ ] Smoke-test registration, profile completion, project application, acceptance, messaging, upload, and moderation.
