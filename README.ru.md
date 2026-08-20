# dsh-smart-compaction

Иерархический `/compact` для DeepSeek Harness. Берёт **модель, которая уже выбрана в чате**, режет историю на chunks, пишет checkpoint после каждого шага, не удаляет raw JSONL, не рвёт tool-call и tool-result.

```text
summary_n = выбранная_модель(summary_{n-1} + chunk_n)
surface replace один раз, когда вся цепь прошла
```

Свой режим не трогаем (Standard, Creator, Code, твой пресет). Отдельной строки в пикере **нет**.

## Установка — одна команда

```bash
dsh plugin --profile web add github:stgmt/dsh-smart-compaction#v0.1.3
```

Дальше ничего руками. Пакет сам:

- ставится во **все** профили DSH
- навешивает движок **внутрь каждого агентского режима, где есть compaction** (`standard` / `code` / `cordis` и user-presets)
- повторяет это на каждом старте DSH и перед mount/copy пресета — новый `copy(standard → свой)` и апгрейд DSH не откатывают stock
- не просит переключить режим

После первой установки перезапусти DSH один раз. Дальше сиди на своём режиме.

Если pnpm просит allowBuilds — разреши. Если lifecycle-скрипты срезаны, overlay всё равно сработает на следующем старте DSH.

Pinned tag: `v0.1.3`. Без tag — `main`.
