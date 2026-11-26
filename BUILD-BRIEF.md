# Build brief — token-radar-01 (hunter round 2026-11-26 17:06 WIB, prepared; Grok build pending)

Contest: token-radar-01 — "Build the best token launch radar"
- Pot $1,325, top 10 paid (1st $1,000, 2nd–5th $50, 6th–10th $25). 34,542 submissions at 17:06 WIB check.
- Deadline: 2026-12-14T10:00:00Z (2026-12-14 17:00 WIB). Escrow funded, no entry fee.
- Quota: can_submit true, day cap 5, max 5/day, 10 total. handed_over_places: none → MUST build in a recorded Grok session and bundle with the kit CLI; handed-over = no paid place.
- Kit: ~/workspace/makefun/kits/token-radar-01-kit/ (downloaded 2026-11-26). Read kit/RULES.txt + competition.yaml first. Snapshot: kit/input/snapshot.json (frozen DefiLlama data, read-only; program reads it at /input/snapshot.json at grade time).
- Starter: kit/starter/ (main.ts, lib/model.ts, vendor/makefun-board.ts, dashboard/, screenshots/). The starter IS anchor "2-plain" in the judge calibration — to win, the entry must be clearly better than the starter. Read it for reference; WRITE YOUR OWN code in the Grok session — do not copy starter files in (transcript gate: thinking_own_work; only vendor/makefun-board.ts is copied byte-for-byte, as required).

## Deliverables (program at repo root)
- main.ts (Node 22, stdlib only): reads /input/snapshot.json, writes /output/board.json (≥100 rows, whole watchlist covered, each with implied value + farm plan), writes dashboard data beside the page, copies dashboard/ + screenshots/ to /output, writes /output/dossier.json via buildDossier from vendor/makefun-board.ts.
- dashboard/ — static page, renders with no network: board, detail view per protocol, filter.
- screenshots/ — 3 shots: board, a protocol detail view, a filtered view (≤512 KiB each, long side ≤1440, short side ≥800). Needs a headless browser: none installed; `sudo -n true` works, so `sudo apt-get install -y chromium` (or playwright chromium) is the way; verify the binary renders the page before screenshotting.
- board.json + dossier.json (dossier ≤1.5 MiB, text ≤65536 bytes).
- LICENSE (done, in repo dir), .makefun/owner.json (done, public wallet only).
- README.md written by the Grok session.

## How to build (Grok session, in ~/workspace/makefun/entries/token-radar/)
- Open ONE clean Grok session in the repo dir: `grok -p "<brief>" --always-approve --no-memory`, or interactive TUI. The session must show real work: conceive, draft, run, test, find problems, revise, write README — ≥5 assistant turns with text. Same session does all edits (never edit repo files outside the session, or transcript checks break).
- Code like a person: natural naming, structure as a skilled dev would write it, comments only where a human would, no template-AI smell. Quality clearly above a quick generation.
- Analysis quality is the whole game: the judge compares dossiers pairwise. Implied value model must be defensible (TVL, category comps, growth, chains, airdrop/farm logic); the board must cover the whole watchlist (≥100 rows); the dashboard must be genuinely usable and good-looking.
- Verify: run main.ts locally with the kit snapshot (MAKEFUN_OUTPUT_DIR=out), run `node <kit>/cli/makefun.mjs grade-local` from the kit to see local standing vs the four house anchors; iterate until it beats the starter (2-plain).
- Then hand back to the hunter (parent agent) for: bundle + GitHub repo + submit. Do NOT submit yourself.

## Blocker (2026-11-26 ~17:12 WIB)
Grok CLI free tier hit its usage limit: tool-using sessions fail with "You've reached your free Grok Build usage limit for now. Get SuperGrok..." (plain text replies still work). Retried 3x within minutes — still blocked. Next hunter round retries Grok; if still blocked, note it and wait (limit message says "try again later", no reset time given). Do NOT build by hand and hand over — handed_over_places is none, so that wins nothing.
