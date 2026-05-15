# Workers cleanup, repo registry, and prod→testing merge

**Date:** 2026-05-15
**Branch(es):** `main`, `sync/prod-into-mtesting`
**Outcome:** done (Figma export tooling deferred to next session in same chat)
**Pushed to:** `mtesting` (`mconqeuroror/mdcln-testing@main`)

## User request

Three rolling asks across the session:

1. Remove all in-repo Docker configs for external workers and document the source-of-truth git repo URL for each.
2. Pull the new motion worker (MotionX / NSFW motion control) from `mconqeuroror/motion` and add a Cursor-readable rule that always lists the canonical repo URLs so we never push to the wrong place.
3. Add Cursor rules to stop the agent from hallucinating, fix the testing repo so it isn't behind prod, and start scaffolding the Figma UI export tooling.

## What changed

**Worker source removed from monorepo (kept only the Hetzner FFmpeg bundle which has no upstream repo):**
- `ffmpeg-worker/` — deleted (superseded by `ffmpeg-worker-deploy/`)
- `runpod-mdcln/` — deleted (lives in `mconqeuroror/mdclnworker`)
- `docker/n8n-ffmpeg/` — deleted (n8n+FFmpeg unused)
- `deploy/easypanel-reel-worker/` + `.zip` — deleted (replaced by Apify scraper)
- `docs/N8N_REPURPOSER_WORKFLOW.md`, `docs/n8n-repurpose-test-payload.json` — deleted
- `.github/workflows/docker-nsfw-worker.yml` — deleted (CI belongs in worker repo)

**Worker pulled into monorepo:**
- `runpod-mdcln-motion/` — cloned from `mconqeuroror/motion` HEAD `5d79d60`, nested `.git` removed so it tracks here as a synced mirror

**Cursor rules added (all `alwaysApply: true` unless noted):**
- `.cursor/rules/repo-registry.mdc` — canonical app + worker repo URLs
- `.cursor/rules/scope-guard.mdc` — declare planned files; hard stops on billing/auth/schema
- `.cursor/rules/dead-code-registry.mdc` — list of removed paths and env vars; never resurrect
- `.cursor/rules/protected-files.mdc` — billing/auth/schema/webhooks need explicit approval
- `.cursor/rules/architecture-invariants.mdc` — established backend/frontend patterns
- `.cursor/rules/env-vars.mdc` — globbed; check `.env.example` before inventing env vars
- `.cursor/rules/session-changelog.mdc` — this file's source-of-truth rule

**Docs added:**
- `WORKERS.md` — single source of truth for app + worker repos and env wiring
- `docs/sessions/README.md` — session changelog format guide
- `docs/sessions/2026-05-15-workers-cleanup-and-merge.md` — this file

**Docs auto-regenerated:**
- `docs/generated/*` — via `npm run docs:registry` after worker deletions

**Prod → testing merge (separate branch):**
- Created `sync/prod-into-mtesting` from `mtesting/main`
- Merged `typekpaco/main` (prod, 54 commits ahead) — 10 conflicts
- All 10 resolved by taking prod side (see Decisions)
- Pushed merge commit `489be20` to `mconqeuroror/mdcln-testing@main`
- 58 testing-only commits preserved in history below the merge

## Decisions made

**Worker repos that have a git source belong in their own repo, not in the monorepo.**
The Hetzner FFmpeg worker (`ffmpeg-worker-deploy/`) is the *only* exception because there's no upstream — it's deployed as a zip.

**Sync strategy was MERGE, not force-overwrite.**
Discovered `mtesting/main` had 58 unique commits the user didn't know about (Neon pool fixes, telemetry batching, retention prune, RunPod worker experiments, Flows iterations). Force-pushing prod over testing would have destroyed real work. User confirmed merge after seeing the divergence report.

**All 10 merge conflicts resolved by taking prod side.**
Prod is the live, paying-customer surface; mtesting is the staging branch.
- `BaseNode.jsx`, `FlowsPage.jsx`, `flowStore.js` — prod has CSS theme variables (light/dark) + `isCompatibleConnection` validator
- `ModelCloneXPage.jsx`, `modelcloneX.service.js` — prod's 5.2 workflow uses fixed sampling, removed steps/cfg controls; testing's UI would send unused params
- `runpod-mdcln/workflows/modelclonex_*_api.json` — match prod's 5.2 backend
- `sexting-scripts.controller.js`, `sexting-scripts.seed.js` — add/add resolved to prod (live and has real users)
- `api.routes.js` — prod side

**Repo URL bugs corrected.**
- Production repo is `typekpaco2002/mdlcln` (note: `mdlcln`, not `mdcln`). Initial WORKERS.md draft had `mdcln`.
- Testing repo is `mconqeuroror/mdcln-testing` (NOT `typekpaco2002/mdcln-testing` — both exist on GitHub, the user uses the `mconqeuroror` one).

**Did NOT touch `.env`.**
Per `protected-files.mdc`: when the dev server failed to boot for lack of `DATABASE_URL`, I refused to add it without explicit user approval. User chose to defer running the server.

**Dev server attempt aborted.**
Started `npm run dev` for testing — Vite served on `http://localhost:5000` but every Prisma call failed (no `DATABASE_URL` in `.env`). User killed it.

**Figma export design changed mid-discussion.**
Initially proposed using a real DB for the export. User pushed back; correct answer is to mock all `/api/*` calls in Playwright with fixture JSON. No DB needed, deterministic, safer. Rebuild plan adopted before any code was written.

## Commits

This session has **NO commits on `main`** yet — all work is uncommitted in the working tree:
- Cursor rules (7 new files in `.cursor/rules/`)
- `WORKERS.md`
- `docs/sessions/README.md` + this file
- Worker directory deletions
- `docs/generated/*` regenerated outputs
- Plus 4 modified files that were already dirty when the session started: `client/src/components/SplashScreen.jsx`, `client/src/pages/NSFWPage.jsx`, `src/controllers/sexting-scripts.controller.js`, `src/routes/stripe.webhook.js`, `src/seeds/sexting-scripts.seed.js`

The merge commit on the sync branch:
- `489be20` chore(sync): merge typekpaco/main (prod) into mtesting/main → pushed to `mtesting/main`

## Open follow-ups

- [ ] Commit the working-tree session work to `main` and push to prod (`typekpaco/main`).
- [ ] Decide what to do with the 5 pre-existing dirty files (SplashScreen, NSFWPage, sexting controller/seed, stripe webhook). They were already modified at session start; not touched this session except via merge resolution.
- [ ] Delete the local `sync/prod-into-mtesting` branch when ready (`git branch -d sync/prod-into-mtesting`).
- [ ] Build the Figma export tooling (Option 2: HTML export + light/dark + API mocking + `/__design__` route + `npm run figma:export:full`). Continuing in the next session/turn.
- [ ] If `.env` ever gets a real `DATABASE_URL`, the dev server can boot fully. User has not done this yet.

## Notes for the next agent

- **Prod remote:** `typekpaco` → `typekpaco2002/mdlcln` (typo in the name is intentional upstream).
- **Testing remote:** `mtesting` → `mconqeuroror/mdcln-testing`. There is also `testing` → `typekpaco2002/mdcln-testing` configured locally, but that one is essentially abandoned (still at the seed commit).
- **Motion worker mirror:** `runpod-mdcln-motion/` is a synced mirror of `mconqeuroror/motion`. Edits must be made upstream and pulled (`git -C runpod-mdcln-motion pull` after re-adding the remote).
- **The 4 stale stashes** (`stash@{0}` `wire-fix-v2`, `stash@{1}` `preFix-rebase-stash`, `stash@{2}` `modelclone-other-wip-before-rebase`) predate this session — left untouched.
- **Always-applied rules now total 7.** They will load automatically on every future session in this workspace.
