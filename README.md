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

## Install (after v0.1.0 is tagged)

```bash
dsh plugin --profile web add github:stgmt/dsh-smart-compaction#v0.1.0
node node_modules/dsh-smart-compaction/scripts/apply-preset.mjs
```

Then start a session on the **smart** agent preset. Do not point the disabled web host-plane `compaction-basic` row at this package — that would register a second `ctx.compaction`.

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
