# dsh-smart-compaction

Замена `@deepseek-ai/dsh-compaction-basic`: история жмётся **несколькими шагами** выбранной в чате моделью, а не одним гигантским запросом.

Протокол DSH не ломаем: lock `compaction/start`, финальный `user/message` replace, `compaction/end`. Меняется только summarizer.

```text
summary_n = выбранная_модель(summary_{n-1} + chunk_n)
checkpoint после каждого chunk
surface replace только когда цепь закончилась
```

Исходный JSONL не удаляется. Пары tool_call/tool_result не режутся. `provider + model + reasoningEffort` берутся из текущего чата. Никакой auxiliary-модели, triage, ARGP, второго Headroom.

## Установка

```bash
dsh plugin --profile web add github:stgmt/dsh-smart-compaction#v0.1.0
node node_modules/dsh-smart-compaction/scripts/apply-preset.mjs
```

Сессию открывать на пресете **smart**. Host-plane row `compaction-basic` в web-профиле должен оставаться disabled.
