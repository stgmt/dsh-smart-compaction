# Changelog

## 0.1.3

- Home-layer overlay no longer replaces the whole `$DSH_HOME/cordis.patch.yml` when stripping a leftover `compaction-smart` insert.

## 0.1.2

- Drop leftover `apply-preset` script. Overlay is `install-global` plus the host autonomy plugin; there is no roster preset to apply.

## 0.1.1

- No extra agent preset. Overlay stock compaction inside every mode that already has it (standard, code, cordis, user copies).
- Host plugin `dsh-smart-compaction/autonomy` re-applies the overlay on boot, before mount/copy/recompose, and on composition-file writes, so later presets and DSH upgrades stay on this engine without the user picking anything.
- Removes the leftover `Smart compaction` roster row if present.

## 0.1.0

- First release: hierarchical compaction on the chat-selected provider/model/effort.
- `dsh plugin --profile web add github:stgmt/dsh-smart-compaction#v0.1.0` installs globally: every profile, shipped `standard`/`code`/`cordis`, user presets.
- Sequential chunk summaries with durable checkpoints; surface replace only after the full chain.
- Replaces stock one-shot `summarizeWithLlm` without deleting raw session events.
