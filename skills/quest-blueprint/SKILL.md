---
name: quest-blueprint
description: Use when the player begins pursuing a specific quest line or investigation (not when generating world backdrop). Generates the GM-private blueprint for that quest — its internal truth, event outline, involved NPCs with stances/motivations/loyalty anchors, and evidence-seeding plan. Prevents NPC characterization drift (OOC) and plot incoherence during long-running quests. Trigger at the START of any quest arc, before narration.
---

# Quest Blueprint · 任务线底牌页

## Overview

每个具体任务线（讨伐某魔物、护送某货、调查某怪事）推进时，GM 先在内部生成一份"底牌页"，记录本线的**真相 / 大纲 / 涉及 NPC 立场 / 动机锚点**。它让 GM 叙事时有人设锚点，防 OOC；让真相有证据链，防临时反转。

## 核心铁律

1. **动态生成，不批量造**：玩家介入某线时才生成，不在开局批量造大量任务。
2. **真相有证据链**：本线真相必须能对应之前埋的证据，不靠临时编造反转；证据不足不凭空揭晓。
3. **动机锚点防 OOC**：每个涉及 NPC 记一条"最深层的、不可因小利/一时冲动违背的动机"。叙事时对照它写——经营多年大阴谋者不会因一点小钱背弃大计划。
4. **不进 characters/**：一次性任务 NPC 留在底牌页；升格为长期人物才转入 `characters/`。
5. **GM 私有**：底牌页的"真相"部分玩家不可直接看到，靠调查揭示。

## 工作流

1. **触发**：玩家开始推进某任务线时（进入调查/接委托/追线索）。
2. **内部推演**：用 sequential-thinking 推演本线——真相是什么、走向如何、谁卷入、证据怎么埋。
3. **写底牌页**：按模板写入 `quests/<line>.md`（模板见 `quests/_template-blueprint.md`）。
4. **叙事**：以底牌页为锚推进剧情，涉及 NPC 时对照动机锚点。
5. **收线**：按"结束状态"处理（归档/升主线/转 characters）。

## 底牌页模板（核心字段）

```markdown
# <任务线名>
- 触发：何时/如何介入
- 关联调查线：对应 clues.md 哪条

## 真相（GM 私有）
（本线内部真相，需调查揭示）

## 大纲 / 事件流程
（分支骨架，非死流程）

## 涉及 NPC
| NPC | 身份 | 立场 | 动机与利益 | 【动机锚点·不可违背】 |
（动机锚点是关键——防 OOC）

## 与主线/世界真相的关联
## 结束状态
```

## Common Mistakes

| 错误 | 后果 | 纠正 |
|---|---|---|
| 开局批量造任务 | 任务与玩家行为脱节 | 玩家介入时才生成 |
| 反派因小利背弃大阴谋 | OOC、世界失真 | 动机锚点钉死 |
| 真相无证据链 | 临时反转、调查线崩 | 证据先埋、真相后揭 |
| 一次性 NPC 混入 characters/ | 角色档噪音 | 留在底牌页 |
