---
name: economy-engine
description: Use when the RPG involves guild/merchant operations, domain or fief management, treasury accounting, troop/population changes, trade-route profitability, debt repayment, or any scene requiring income/expense/profit/balance calculations during state updates. Also use when a commercial or territorial decision needs quantitative backing before being narrated. Adapted from modern accounting methodology (net-worth, cash-flow-forecast, break-even, P&L, zero-based-budget, debt-payoff, client-profitability) ported to a medieval-fantasy economy.
---

# Economy Engine · 封建经济演算工作流

## Overview

本 skill 把现代会计的七套方法论移植到中世纪奇幻经济里,解决一个核心问题:**LLM 心算收支/兵力/人口必然出错,而状态更新又高频依赖这些数字。** 因此凡涉及经济/财政/军事数值,一律遵循"**计算外包给代码,绝不心算**"的铁律,只向用户呈现影响决策的关键取舍。

适用于长期文字 RPG 中**商会经营(第三阶段)与领地建设(第四阶段)**。早期冒险阶段用 `ledger.md` 的 prose 账本即可,经济复杂化后迁移到 SQLite。

## 核心铁律

1. **绝不心算任何多步数值。** 涉及收支、利润、兵力、人口、摊还的演算,必须写 Node/Python 脚本实算,或用 SQLite 聚合查询。心算只在"单一加减、结果明显"时允许。
2. **演算基于持久化的上一期状态。** 读 SQLite/ledger 取上次余额 → 套用本期规则 → 得新余额 → 写回。禁止凭记忆重算历史余额。
3. **只输出关键取舍,不输出全表。** 用户不亲自管账;演算细节(完整流水)存进数据库,呈现给用户的只有"这条商路这季亏 200 金,建议停运或换货"这类决策点。
4. **因果链先于数字。** 用 sequential-thinking 先拆"一个变化会引发哪些连锁"(利润→政治→军事),再算数字,避免漏算关联影响。
5. **奇幻经济用奇幻载体。** 不套用现代税表、退休账户、股票估值、银行余额查询——这些在现代会计 skill 里是核心,在奇幻世界不存在。

## When to Use

**触发场景:**
- 商会/商队经营:算某条商路盈亏、盈亏平衡运量、下季现金流预测
- 领地财政:季度净值表(资产−负债)、归零预算(收入按军备/民生/储备分配)
- 兵力变化:招募/损耗/整编,折算维持费与战力
- 人口变化:迁徙/瘟疫/征召/开荒,影响税收与劳力
- 债务/赔款/借款:选雪崩(高息先还)还是雪球(小额先还),出逐期摊还表
- 分据点/分商路盈利排名:哪个表面赚实际亏(隐藏成本)

**不要用于:**
- 纯叙事场景(角色对话、战斗演绎)——除非其中明确涉及账目决策
- 现代现实金融——本 skill 是奇幻经济专用

## 计算外包工作流(每次演算必走)

```
1. 读状态 → filesystem 读 ledger.md(早期) 或 SQLite MCP 查询(商会阶段)
2. 拆因果 → sequential-thinking 列出本次变化的直接+连锁影响
3. 写脚本 → code_execution(Node `node:sqlite`)实算,脚本读上期数据、套规则、出新数据
4. 写回   → 结果写回 ledger.md;商会阶段用 Node `node:sqlite` 写入 economy.db
5. 呈现   → 只向用户输出"关键取舍 + 一句话结论",不输出全表
6. 存档   → git commit(纯本地)
```

### ⚠️ SQLite 双轨分工(重要)

SQLite MCP(`mcp-server-sqlite`)是**只读**的(安全设计),不能写入。因此:

| 职责 | 工具 | 说明 |
|---|---|---|
| **建表/插入/更新** | `code_execution` 用 Node `node:sqlite`(`const { DatabaseSync } = require('node:sqlite')`) | 写入路径,需 Node 22.5+(本环境 v26.5.1 满足) |
| **查询/验证/聚合** | SQLite MCP 的 `list_tables`/`describe_table`/`query` | 只读路径,验证写入结果、出报表 |

> **铁律:写入永远走 Node,查询可用 MCP。** 两者操作同一个 `economy.db` 文件,不冲突。
> 脚本要可复现:同一输入同一输出。脚本留在 `chatbox-rpg/scripts/` 便于复用与审计。
> Node `node:sqlite` 是实验性 API,会有 `ExperimentalWarning`,无害可忽略。

## 七套方法论(奇幻化)

### 1. 净值追踪(Net Worth)→ 领地季度财报

资产 − 负债 = 净值。分项列示,追踪增减来源,标最大贡献项。

```
领地净值表 — [年份/季度]
══════════════════════════════════════
资产
  现金库            X,XXX 金
  库存(货/粮/矿)    X,XXX 金
  据点估值(含在建)  XX,XXX 金
  牲畜/畜群         X,XXX 金
  应收(契约欠款)    X,XXX 金
─────────────────────────
  总资产            XX,XXX 金
负债
  借款/赔款         X,XXX 金
  契约义务(未付)    X,XXX 金
  欠税/欠贡         X,XXX 金
─────────────────────────
  总负债            X,XXX 金
══════════════════════════════════════
  净值              XX,XXX 金
  较上期 Δ          ±X,XXX (来源:商路盈利/工程支出/...)
══════════════════════════════════════
```

**奇幻化要点:** 牲畜/据点估值用世界内口径(如"一头耕牛≈若干金");应收账款来自封建契约(采邑贡赋、商队欠款),非银行贷款。

### 2. 现金流预测(Cash-Flow Forecast)→ 商会下季预警

用过往数季数据 + 季节性系数预测下几季收支,预警"哪季商会会断链"。

```
方法:3季移动平均 × 季节系数
  移动均收入 = (季-1 + 季-2 + 季-3) / 3 × 季节系数
  移动均支出 = 同上
  期末余额 = 期初 + 收入 - 支出
预警:期末余额 < 2季运营支出 → 标红,建议储备或缩支
```

**奇幻化要点:** 季节系数来自世界设定(冬季封山商路断、收获季粮价跌、战时军需涨);"安全线"= 能维持雇佣兵护卫两季的现金。

### 3. 盈亏平衡(Break-Even)→ 单条商路值不值得开

固定/变动成本分离,算出"开多少货才不亏"。

```
固定成本(护卫费/码头常租/常驻伙计)= F
变动成本(每单位货的运费/损耗/关税)= v
售价/单位 = p
贡献毛利 = p - v
盈亏平衡运量 = F / 贡献毛利
安全边际 = (当前运量 - 盈亏平衡运量) / 当前运量
```

**奇幻化要点:** 固定成本含"雇佣护卫队月钱""码头包租""沿途打点领主";变动成本含"骡马草料""损耗率""关卡税";战时护卫费暴涨会直接抬高盈亏平衡点。

### 4. 损益表(P&L)→ 分据点/分周期盈亏

收入 − 直接成本(COGS)− 运营费用 = 净利,算毛利率/净利率。

```
据点损益 — [周期]
收入:  售货 + 服务 + 关税分成 = 总收入
COGS:  进货 + 直接劳力 + 运输 = 总COGS
毛利 = 总收入 - 总COGS ; 毛利率 = 毛利/总收入
运营:  房租/仓租 + 伙计薪 + 杂费 = 总运营费
净利 = 毛利 - 总运营费 ; 净利率 = 净利/总收入
```

**奇幻化要点:** "服务收入"含护送/代办/汇兑;"关税分成"是封建特许权收益;无现代意义上的"折旧",但可计"据点修缮摊销"。

### 5. 归零预算(Zero-Based Budget)→ 领地财政分配

每枚币分配去向,强制余额归零(避免"钱花哪了不清楚")。

```
领地收入: X 金
分配:
  军备/城防    XX%  (上限建议,战时上调)
  民生/赈济    XX%
  储备/应急    XX%
  工程建设     XX%
  偿债         XX%
  ───────────
  合计 = 收入  → 余 = 0
```

**奇幻化要点:** 比例由世界内政治决定(领主议会、教会、行会各有压力);"储备"对应冬荒/战时的缓冲。

### 6. 债务摊还(Debt Payoff)→ 还债/赔款策略

雪崩(高息先还,省总息)vs 雪球(小额先还,速见效),出逐期摊还表。

```
每期: 利息 = 余额 × 期利率 ; 本金 = 还款 - 利息 ; 新余额 = 余额 - 本金
雪崩: 额外还款全砸最高息债
雪球: 额外还款全砸最小余额债
对比总利息、总期数 → 推荐
```

**奇幻化要点:** "利息"在奇幻世界常表现为"契约期限""人质""封建义务"而非纯金钱——若某笔债的"利息"是政治义务,雪球法(先了结以解除要挟)可能比雪崩法更优。**这是奇幻经济与纯现代会计的关键分歧点。**

### 7. 客户盈利(Client Profitability)→ 分商路/分据点排名

按对象分摊收入+直接成本+按比例摊间接成本,看**利润率而非收入**。

```
对象(商路/据点): 收入 - 直接成本 - 摊入间接成本 = 利润 ; 利润率
间接成本按收入占比摊: 对象摊入 = 总间接 × (对象收入/总收入)
排名后: 标注利润率<阈值 的为"价谈或停运"候选
```

**奇幻化要点:** "隐藏成本"=某条商路虽赚钱但途经敌对领地、风险溢价高,或耗费某稀缺护卫资源——纯金钱利润率会高估其真实价值,需在排名旁标注风险调整。

## SQLite 数据模型(商会阶段启用)

经济复杂化后,从 `ledger.md` 迁移到 `economy.db`。建议表:

| 表 | 关键字段 |
|---|---|
| `treasury` | date, category, amount, note |
| `trade_routes` | id, route, origin, dest, cargo, volume, cost, revenue, season, status |
| `holdings` | id, name, type, scale, output, status |
| `population` | settlement, year, pop, composition |
| `military` | unit, count, type, upkeep, status |
| `construction` | id, location, fund, labor, material, duration, status |
| `contracts` | id, party_a, party_b, type, terms, due, status |
| `debts` | id, creditor, principal, rate, balance, method |

查询示例(盈亏平衡可一条 SQL 出):
```sql
SELECT route,
  SUM(CASE WHEN category='fixed' THEN amount END) AS fixed_cost,
  SUM(CASE WHEN category='variable' THEN amount END)/NULLIF(SUM(revenue),0) AS var_ratio
FROM ... GROUP BY route;
```

## Common Mistakes

| 错误 | 后果 | 纠正 |
|---|---|---|
| 心算多步数值 | 数字漂移、余额对不上 | 强制写脚本实算 |
| 凭记忆重算上期余额 | 历史被覆盖、状态失真 | 只读持久化数据 |
| 把全套流水抛给用户 | 用户被数字淹没、破坏叙事节奏 | 只输出关键取舍+一句话结论 |
| 套用现代税表/退休账户 | 世界感崩坏 | 用封建契约/采邑/特许权载体 |
| 只算直接成本漏间接 | 利润率虚高、决策失误 | 间接成本按收入占比摊入 |
| 把政治义务债当纯金钱债处理 | 选错摊还策略 | 政治义务债优先用雪球法了结 |

## 与其它 skill / 工具的协作

- **worldbuilding**:阶段一设计封建经济结构(货币体系、采邑制、行会特许、商路格局)——经济演算的规则前提
- **sequential-thinking**:每次演算前先拆因果链(利润→政治→军事连锁)
- **data-analysis**:已有 skill,辅助经济数据分析
- **filesystem MCP**:读写 ledger.md / world.md
- **sqlite MCP**:商会阶段持久化经济数据
- **git**:每期结算后 commit 存档(纯本地,绝不 push)

## 启用时机

- 阶段一/二(世界生成、角色确立):仅用 worldbuilding 设计经济结构,不启用演算
- 冒险阶段:用 ledger.md 简单记账,偶尔手算
- **商会阶段起:正式启用本 skill + SQLite**,所有经济演算走"计算外包"工作流
- 领地阶段:全套七套方法论按需调用
