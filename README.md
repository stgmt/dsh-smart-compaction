# dsh-smart-compaction

Hierarchical `/compact` for DeepSeek Harness. Uses the **model already selected in the chat**, splits history into chunks, checkpoints each step, never deletes the raw session log, never splits a tool-call from its result.

```text
summary_n = chat_model(summary_{n-1} + chunk_n)
surface replace once, after the whole chain succeeds
```

You keep the agent mode you already use (Standard, Creator, Code, your own copy). This package does **not** add a picker row.

## Install (one command)

```bash
dsh plugin --profile web add github:stgmt/dsh-smart-compaction#v0.1.2
```

That is the whole install. After that, forget it.

The package:

- adds itself to **every** DSH profile on the machine
- overlays stock `compaction-basic` **inside every agent preset that has compaction** (shipped `standard` / `code` / `cordis`, and your user presets)
- does that again on every DSH boot, and again right before a preset mounts or is copied, so a later `copy(standard → mine)` and a DSH upgrade do not silently go back to stock
- never asks you to switch modes

Restart DSH once after the first add so the overlay plugin is loaded. New and existing sessions on **your current mode** compact through this engine.

If pnpm asks to allow the build script, allow it — git-hosted DSH plugins need that. If scripts were skipped, the next DSH start still overlays: the host plugin is the installer.

Pinned tag is `v0.1.2`. `github:stgmt/dsh-smart-compaction` tracks `main`.

## What it does not do

- Add a "Smart compaction" agent mode
- Delete or rewrite raw session events
- Compact after every turn
- Swap in Haiku / Spark / Sol / a configured `summarizationModel`
- Install Headroom, sub2api, context-triage, or ARGP

## Development

```bash
npm install
npm test
npm run verify
npm run doctor
```
