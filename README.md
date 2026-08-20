# dsh-smart-compaction

Hierarchical `/compact` for DeepSeek Harness. Uses the **model already selected in the chat**, splits history into chunks, checkpoints each step, never deletes the raw session log, never splits a tool-call from its result.

```text
summary_n = chat_model(summary_{n-1} + chunk_n)
surface replace once, after the whole chain succeeds
```

## Install (one command, every DSH project)

```bash
dsh plugin --profile web add github:stgmt/dsh-smart-compaction#v0.1.0
```

That is the whole install. The package `prepare`/`postinstall` then:

- adds itself to **every** DSH profile on the machine (`web`, `headless`, …)
- disables stock `compaction-basic` on the host plane
- rewrites shipped `standard` / `code` / `cordis` (DSH will not let a user preset steal those ids) and your user presets so compact goes through this engine

Restart DSH. New sessions on the default **standard** preset already compact this way. No extra preset to pick.

If pnpm asks to allow the build script, allow it — git-hosted DSH plugins need that. If compact is still stock after a DSH upgrade, run the same `dsh plugin add` again (or `node node_modules/dsh-smart-compaction/scripts/install-global.mjs`).

Pinned tag is `v0.1.0`. `github:stgmt/dsh-smart-compaction` tracks `main`.

## What it does not do

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
