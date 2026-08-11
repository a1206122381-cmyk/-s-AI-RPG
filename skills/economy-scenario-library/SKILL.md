---
name: economy-scenario-library
description: Companion to economy-engine. Provides parameterized scenario templates for recurring economic calculations (expansion, new product line, real-estate purchase, armed-force upkeep, trade war, territory building) so the GM does not rewrite econ scripts from scratch each time. Use when a commercial/territorial decision needs a profit/break-even/cash-flow figure and an econ-*.js scenario template already exists or should be reused. Inputs are market capacity, cost structure, prices; outputs are income/profit/break-even tables.
---

# Economy Scenario Library · 经济场景库

## Overview

economy-engine 规定"计算外包给代码，绝不心算"。但每次立项都手写新脚本（econ-venture / econ-expand / econ-timeskip ...）重复度高。本 skill 提供**参数化场景模板**：把高频经济决策固化成可复用的脚本骨架，GM 只需填参数（市场容量/成本/价格/产量），脚本算账。

## 核心铁律（继承 economy-engine）

1. **绝不心算多步数值**——必须脚本实算或 SQLite 聚合。
2. **先列假设后给结论**——输入参数即假设，输出由假设推出；数字高只由世界事实决定，不因"起步期该不该赚太多"压数。
3. **只输出关键取舍**——不抛全表，给"建议/结论/一句话"。
4. **演算基于持久化状态**——读 ledger/SQLite 上次余额，套本期规则，写回；不凭记忆重算历史。

## 场景模板库

| 场景 | 脚本骨架 | 关键输入 | 输出 |
|---|---|---|---|
| 新产线立项 | `econ-product.js` | 单批成本/产量/售价/月批数 | 月净利/毛利率/回本 |
| 扩产投入 | `econ-expand.js` | 各线投入额/预期增幅 | 月净利增量/回本周期 |
| 购置地产 | `econ-buyprops.js` | 月租/买价/年化 | 回本周期/租购取舍 |
| 武装维持 | `econ-orgs.js` | 编制/月饷/入账 | 净贡献/占比 |
| 时间推进 | `econ-timeskip.js` | 期初余额/月净利/月数 | 逐月账面 |
| 贸易战/战略 | `econ-strategy.js` | 收买/降价/放贷/吞并 | 净得/风险 |

> 脚本放 `scripts/`，命名 `econ-*.js`，输入用变量常量（可改），输出只打结论。每个脚本存本 skill 同目录或 scripts/，随项目走。

## 工作流

1. 判断场景属于哪类（立项/扩产/地产/武装/推进/战略）。
2. 复用对应脚本骨架（或从已有 econ-*.js 复制改造），填参数。
3. 跑脚本实算，把结论写回 ledger/commerce，存档。
4. 向玩家输出"关键取舍 + 一句话结论"，不抛全表。

## 参考

- 依赖 `economy-engine` skill 的七套方法论（盈亏平衡/现金流/损益/净现值等）。
- 参数（价格/成本）由世界事实决定——用 world.md 的物价基准 + 玩家设定，不凭空估。
