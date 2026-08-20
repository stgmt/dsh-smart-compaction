# dsh-smart-compaction

Замена `@deepseek-ai/dsh-compaction-basic`: история жмётся **несколькими шагами** выбранной в чате моделью, а не одним гигантским запросом.

Протокол DSH не ломаем: lock `compaction/start`, финальный `user/message` replace, `compaction/end`. Меняется только summarizer.

```text
summary_n = выбранная_модель(summary_{n-1} + chunk_n)
checkpoint после каждого chunk
surface replace только когда цепь закончилась
```

Исходный JSONL не удаляется. Пары tool_call/tool_result не режутся. `provider + model + reasoningEffort` берутся из текущего чата. Никакой auxiliary-модели, triage, ARGP, второго Headroom.

## Установка на всю машину

Штатный пресет `standard` нельзя подменить одноимённым user-preset. Одного `dsh plugin add` в web мало.

```bash
cd путь/к/dsh-smart-compaction
npm run install-global
```

Скрипт ставит пакет во все DSH-профили, отключает stock `compaction-basic` на host-plane и переписывает живые `agent.cordis.yml` (`standard` / `code` / `cordis` и user-presets) на `dsh-smart-compaction`. После обновления `@deepseek-ai/dsh` запусти `install-global` снова. Перезапусти DSH.
