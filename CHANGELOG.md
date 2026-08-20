# Changelog

## 0.1.0

- First release: hierarchical compaction on the chat-selected provider/model/effort.
- `dsh plugin --profile web add github:stgmt/dsh-smart-compaction#v0.1.0` installs globally: every profile, shipped `standard`/`code`/`cordis`, user presets.
- Sequential chunk summaries with durable checkpoints; surface replace only after the full chain.
- Replaces stock one-shot `summarizeWithLlm` without deleting raw session events.
