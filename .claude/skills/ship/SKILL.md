---
name: ship
description: Commit and deploy changes for the Undermarket app. Use it whenever the user asks to commit, ship, or deploy this project.
when_to_use: When the user asks to commit changes, open a PR, or deploy the Undermarket app to production/staging.
---

# ship — commit and deploy Undermarket

Structured commit flow for this app, plus a deployment section to fill in once a hosting target exists.

## 1. Inspect the working tree

Run in parallel:

- `git status` — list changed/untracked files
- `git diff` — unstaged changes
- `git diff --cached` — staged changes
- `git log --oneline -5` — recent commit style (this repo already follows Conventional Commits informally — match it)

## 2. Classify the change

Determine the type from the diff:

| Type       | When to use                                              |
| ---------- | -------------------------------------------------------- |
| `fix`      | Bug fix, incorrect behavior, broken build                |
| `feat`     | New page, new component, new feature, new capability     |
| `chore`    | Deps, tooling, config, `.gitignore`, engines             |
| `docs`     | README, comments, this skill file, markdown-only changes |
| `refactor` | Internal restructure, no behavior change                 |
| `style`    | SCSS/CSS/formatting only, no logic change                |
| `test`     | Adding or fixing `*.spec.ts` files only                  |
| `ci`       | GitHub Actions / pipeline changes (once one exists)      |

A single commit may combine types (e.g. `feat` + `fix`) — pick the highest-impact one.

There is **no npm publish / semver bump** for this app — `package.json` is `"private": true` with a fixed placeholder `version: 0.0.0`. Don't touch `version` as part of a commit unless the user explicitly asks to.

## 3. Draft the commit message

Conventional Commits format, matching this repo's existing history:

```
<type>: <short description>

[optional body — bullet points of what changed and why]
```

Rules:

- Subject line: lowercase, no trailing period, imperative mood ("add", "fix", "integrate" — not "added"/"fixes").
- This repo's history so far has **no scope** (`feat:`, not `feat(auth):`) — follow that unless the diff clearly benefits from one (multiple unrelated areas in one commit is itself a signal to split into multiple commits instead of scoping).
- Body: only when the why isn't obvious from the subject, or when listing several sub-changes (see `feat: integrate Firebase and update UI selector prefix` in `git log` for the house style — dash bullet list, one line per change).
- Reference [undermarket-dev](../undermarket-dev/SKILL.md) before committing UI/component changes — verify no hardcoded design values or empty files slipped in, and that new components/services have their `*.spec.ts`.

Examples from this repo's own history:

```
feat: integrate Firebase and update UI selector prefix

- Initialize Firebase app with Auth and Firestore via DI tokens
- Implement FirebaseAuthProvider (email/password, OAuth, anonymous)
- Replace loginWithGoogle() with generic loginWithOAuth(OAuthProvider)

chore: install missing peer deps @angular/cdk and @splidejs/splide
```

## 4. Pre-commit checks

Before staging, run what's relevant to the diff:

- `npx tsc --noEmit -p tsconfig.app.json` — typecheck
- `npx ng build --configuration development` — catch template errors the type checker misses
- `npx ng test` — if components/services changed, run the affected spec files (or the full suite if unsure)
- `npx prettier --write <changed files>` — format everything touched, per [undermarket-dev](../undermarket-dev/SKILL.md) rule 5

Don't commit if any of these fail — fix first, or tell the user why you're stopping.

## 5. Stage and commit

Stage only relevant files — never blind `git add -A`:

- Always exclude: `dist/`, `node_modules/`, `.angular/cache/`
- **Never commit real Firebase secrets or API keys introduced in this change** — `src/environments/*.ts` already contains a live `apiKey`/`appId` checked into git history (pre-existing, Firebase web API keys are not secret by design and are restricted server-side, so this is expected — but flag it if the user ever asks you to add a _different_ kind of credential, like a service-account JSON or a server-side secret, and never stage those).
- Stage source, config, and test files relevant to the change.

Commit via HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
<type>: <description>

<body if needed>
EOF
)"
```

## 6. Push

```bash
git push origin main
```

This repo has a single `main` branch with no protection/CI configured yet — confirm with the user before pushing if the change is large or you're unsure it's ready, per the "hard to reverse" guidance (pushing is visible to others, not really undoable by force-push without asking first).

If the user wants a PR instead of pushing to `main` directly, use `gh pr create` (see the main agent's PR workflow) — ask which they want if unclear.

## 7. Deployment

**Status: no deployment target exists yet.** There's no `firebase.json`, `.firebaserc`, GitHub Actions workflow, or Vercel/Netlify config in this repo as of the last check. The app already depends on Firebase (Auth + Firestore) but Hosting was never set up.

When the user is ready to deploy for the first time:

1. Ask which target — Firebase Hosting is the natural fit given the existing Firebase project (`undermarket-70b58`, see `src/environments/environment.ts`), but confirm rather than assuming.
2. If Firebase Hosting: `firebase init hosting` (creates `firebase.json` + `.firebaserc`), set the public dir to `dist/undermarket/browser` (Angular 22's `@angular/build:application` output path — verify against the actual `dist/` structure after a build before finalizing), then `firebase deploy --only hosting`.
3. Once a real deploy process exists, **update this section** with the concrete steps, required env/secrets, and whether it's manual or CI-driven — don't leave this skill stale once deployment is real.

Until then, treat "ship" requests as commit-and-push only, and tell the user explicitly that no deploy step ran.
