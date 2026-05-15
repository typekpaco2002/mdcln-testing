# Session Changelog

One file per Cursor session that produced any code change. Format and rules
are enforced by `.cursor/rules/session-changelog.mdc`.

## Why this exists

`git log` tells you *what* changed. Session files tell you *why* — including
decisions that didn't end up as code (rejected approaches, deferred tasks,
manual steps the user took, environmental gotchas).

## File naming

`YYYY-MM-DD-<kebab-slug>.md` — newest first when sorted.
Example: `2026-05-15-workers-cleanup-and-merge.md`

## Reading order

When picking up where someone (human or agent) left off, skim the newest
3–5 files. The "Open follow-ups" sections accumulate the running TODO list
across sessions.

## Skipping

A session that was purely Q&A or exploration with no file edits doesn't
get a file. The rule judges by whether anything was written/deleted/pushed.
