# dsh-smart-compaction

Иерархический `/compact` для DeepSeek Harness. Берёт **модель, которая уже выбрана в чате**, режет историю на chunks, пишет checkpoint после каждого шага, не удаляет raw JSONL, не рвёт tool-call и tool-result.

```text
summary_n = выбранная_модель(summary_{n-1} + chunk_n)
surface replace один раз, когда вся цепь прошла
```

## Установка — одна команда, все проекты DSH

```bash
dsh plugin --profile web add github:stgmt/dsh-smart-compaction#v0.1.0
```

Дальше ничего руками. `prepare`/`postinstall` сам:

- ставит пакет во **все** профили (`web`, `headless`, …)
- выключает stock `compaction-basic` на host-plane
- переписывает shipped `standard` / `code` / `cordis` и user-presets (одноимённым user-preset DSH не даст заменить `standard`)

Перезапусти DSH. Новые сессии на обычном **standard** уже компактят этим движком. Отдельный пресет выбирать не надо.

Если pnpm просит allowBuilds — разреши, так ставятся git-плагины DSH. После апдейта `@deepseek-ai/dsh` повтори ту же команду (или `node node_modules/dsh-smart-compaction/scripts/install-global.mjs`).

Pinned tag: `v0.1.0`. Без tag — `main`.
