# dsh-smart-compaction

Drop-in replacement for `@deepseek-ai/dsh-compaction-basic` that **does not** send the whole shadowed region in one model call.

It keeps DSH's lock and surface protocol (`compaction/start` → summary → `user/message` replace → `compaction/end`) and replaces only the summarizer:

```text
summary_0 = empty
summary_1 = chat_model(summary_0 + chunk_1)   # checkpoint 1
summary_2 = chat_model(summary_1 + chunk_2)   # checkpoint 2
...
surface replace once, after the chain succeeds
```

Raw JSONL is never deleted. Tool-call / tool-result pairs are never split. The compact request uses the **chat-selected** `provider`, `model`, and `reasoningEffort`. There is no auxiliary compact model, no triage plugin, no ARGP, no second Headroom.

## Install globally (every DSH profile and preset)

Shipped `standard` cannot be replaced by a user preset of the same id. A one-profile add is not enough. From this repo:

```bash
npm run install-global
```

That script:

1. Adds the package to every profile under `~/.dsh/profiles` (`web`, `headless`, …).
2. Writes `~/.dsh/cordis.patch.yml` so host-plane stock basic is disabled and `compaction-smart` is inserted (headless and any profile where compaction lives on the host).
3. Rewrites every live `agent.cordis.yml` that still names `@deepseek-ai/dsh-compaction-basic` — shipped `standard` / `code` / `cordis` and your user presets. Originals are saved as `*.dsh-smart-compaction.bak`.

Restart DSH. New sessions on the default **standard** preset compact through this engine. After `npm update -g @deepseek-ai/dsh`, run `install-global` again.

Prove it:

```bash
npm test
npm run verify
npm run doctor
dsh --profile web --dump-config   # compaction-basic disabled, compaction-smart present
```

## What it does not do

- Delete or rewrite raw session events
- Compact after every turn
- Swap in Haiku / Spark / Sol / a configured `summarizationModel`
- Install Headroom, sub2api, context-triage, or ARGP

## Development

```bash
npm install
npm test
node scripts/doctor.mjs
node --experimental-strip-types scripts/replay.mjs fixtures/oversized-session.jsonl 200
```
