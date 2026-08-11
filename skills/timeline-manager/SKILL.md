---
name: timeline-manager
description: Use when the story involves time advancement (days/seasons/years passing), scheduling of events, or any need to track the campaign calendar consistently. Manages the in-world date/season progression, season-aware events, and avoids timeline drift across long-running campaigns. Trigger when "advance time", "over a season", "days later", or when the current date needs recording in state.md.
---

# Timeline Manager · 日历与时间线

## Overview

长期战役最容易漂移的就是**日期**——"圣炉节后第 N 日"推进几次就乱，季节事件漏掉，跨章时间线对不上。本 skill 统一管日历：记录当前日期/季节、推进天数→季节换算、标记季节事件，防时间线漂移。

## 核心铁律

1. **日期记在 state.md**：每轮快照的日期/季节必须准确，存档时核对。
2. **推进 = 明确天数**：玩家说"推进两个月"，GM 明确"第 N 日 → 第 N+60 日 + 季节变化"，写回 state。
3. **季节事件不丢**：推进跨季时，触发对应季节事件（冬市/年祭/封山/收获季）——这些是世界运转的质感，不能因时间推进跳掉。
4. **时间线有锚**：关键事件（战役/决定/获物）标日期，chronicle 可回溯。

## 日历模型（示例，按世界生成调整）

- 历法：如"边境历"，纪元起点 + 圣炉节等节庆。
- 一年：四季（春/夏/秋/冬），每季约 3 个月。
- 季节事件参考：
  - 春：解冻、播种、商路开、北线货队启程
  - 夏：收获前、河运旺、魔物活跃
  - 秋：收获、年祭、商路转运
  - 冬：封山、冬市、节庆、本地销路旺
- 推进换算：1 月 ≈ 30 日，1 季 ≈ 90 日。

## 工作流

1. **读当前日期**：从 state.md 取"第 N 日 + 季节"。
2. **明确推进量**：玩家说"推进 X 月/季"，换算成天数。
3. **过季节事件**：跨季时列出该季事件，叙事中至少带一笔。
4. **写回**：更新 state.md 日期/季节 + 触发的事件，存档。

## Common Mistakes

| 错误 | 后果 | 纠正 |
|---|---|---|
| 推进不记具体天数 | 时间线漂移、对不上 | 明确"第 N→N+X 日" |
| 跨季跳掉季节事件 | 世界质感丢失 | 过季必带一笔事件 |
| 历史日期凭记忆 | chronicle 回溯错 | 关键事件标日期 |
