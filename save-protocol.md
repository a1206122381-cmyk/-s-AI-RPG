# 存档协议 · Save Protocol

> 不可违反。每次新对话恢复时，与 RESUME.md 一同读取。

---

## 触发点（规则化，不靠记忆）

以下任一发生，**立即存档**：
1. 战斗结束（无论大小）
2. 获得新线索 / 调查线触发
3. 过夜、转场、移动到新地点
4. 重大决策确定
5. 金钱、物资、资产发生变动
6. 玩家说"存档"
7. 每次场景自然段落告一段落

## 存档四步（按顺序，不跳步）

1. **更新文件**：先更新 `state.md`（当前日期/位置/资源/在场小队/委托快照），再根据进展更新 ledger.md / clues.md / chronicle.md / characters/*.md / world.md / quests.md / quests/*.md（任务线底牌页）/ commerce.md / domain.md / arms.md / expedition.md 中受影响者。**chronicle.md 每次都追加**最新剧情摘要（见下方写入规范）。
2. **更新 memory**：新增或更新相关实体的观察。
3. **git 提交**：`git add` 受影响文件 → `git commit -m "简述"`。（可用助手 `node scripts/save.js "简述"` 半自动化：先自动跑 save-verify 校验 → add → commit → 强制出 `git log --oneline -3` 哈希；任一步失败即报错退出。也可用 `bash scripts/save.sh "简述"` 三合一。加 `--skip-verify` 跳过校验。）
4. **出示证据**：执行 `git log --oneline -3`，将**真实终端输出**贴给玩家。

## 三条铁律

1. **存档与叙事分离**：存档是独立步骤，不混在剧情文本里。存档时只做存档+报结果，不编故事。
2. **必须出示证据**：每次存档后贴出 `git log --oneline -3` 真实返回。**我自己说"已存档"不算数，必须看见 git 哈希。**
3. **失败即停报错，但系统解耦**：**文件编辑或 git 命令**失败——**立即停下，告知玩家"存档失败，原因xxx"，绝不假装成功、绝不继续往下走。** 但 **memory 与 filesystem 是独立系统**：memory 调用失败时，**不阻止** filesystem + git 完成本次存档；改为在 chronicle 记一笔"⚠️ memory 未同步（原因xxx）"并告知玩家。**filesystem 为唯一权威**，memory 降级为 best-effort 互补索引（可事后补同步，或从 memory.json 备份恢复）。**git 失败**：`git add`/`commit` 失败时，filesystem 已写内容**不回滚**，立即停下报错（贴出报错信息），修复后重试 commit 即可，无须重写文件。

## 玩家验证

- 看不到 git 哈希 = 没存成功，直接质疑。
- 哈希与提交信息对不上 = 追问。
- 任何时候喊"存档" = 立即执行上述四步。

## 纪事录（chronicle.md）写入规范

每次存档向 chronicle.md **追加**一段精炼叙事摘要（非原始聊天记录全文），保留：
- 关键决策与玩家意图（为什么这么做）
- 对话精华与人物互动细节（谁说了什么、语气、关系变化）
- 伏笔触发情况（调查线钩子是否被碰）
- 氛围与叙事基调要点（叙述风格、人物"活"的方式）
- 关键数值变化（钱、物资、关系节点）

**去掉**：状态面板、选项列表、工具调用说明等非叙事内容。

> 目的：新对话恢复时读 chronicle.md 即可了解来龙去脉，不必重读全部历史聊天——既省上下文，又保留连续性。

---

## 4. 备注与边界

- **memory.json 已纳入 git 跟踪**（`.gitattributes` 强制 LF 行尾）。它含调查线预设真相等 GM 私库内容，**不再视为纯易失索引**——每次存档 `git add` 时一并提交作备份。filesystem 仍为叙事权威，memory 为可查询的互补索引；二者均在 git 内有备份。
- **memory.json 是 JSONL，非单 JSON**：每行一个 `{type:"entity"|"relation",...}` 对象。**禁止**整文件 `JSON.parse` / `jq '.'`（会报 "Unexpected non-whitespace character" 误判损坏，进而引发危险的手动重写）。按行解析（`split('\n')` 逐行 parse）或直接用 memory MCP。存档后可选跑 `node scripts/check-memory.js` 校验格式与一致性。
- **memory 写操作须串行**：server-memory 是 read-modify-write，并发写会丢更新。`create_entities` 与 `create_relations` 分两次调用，勿并行。
- **memory 查询省内存**：用 `search_nodes` 按需查人物关系/已确定事实；**不要每次全量 `read_graph`**（图谱随游玩增长，全量读越来越贵，曾因 RAM 重操作冻结）。全量校验一致性跑 `node scripts/check-memory.js`（只读、轻量）。
- **生成期（阶段一/二）存档节奏从轻**：本协议七条触发点与四步流程为**阶段三场景级**调校。阶段一/二世界与角色生成时，改为**每个 Block 或每个阶段完成时存一次**即可，不必每轮走完整四步仪式；进入阶段三后恢复完整协议。
