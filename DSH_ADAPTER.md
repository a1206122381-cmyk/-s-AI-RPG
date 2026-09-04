# DSH_ADAPTER · DeepSeek Harness 环境适配说明

> 本战役原本针对 Kimi Code（opencode）编写。本文档记录 **DeepSeek Harness（DSH）** 环境下的适配结果与工具映射，供 DSH 会话中的 GM 阅读。Kimi Code 用户请忽略本文档，照旧用 `START_HERE.md`。
>
> 阅读顺序（DSH 会话）：`AGENTS.md`（核心规则）→ `START_HERE.md`（全局手册）→ 本文档（环境映射）→ `save-protocol.md`（存档协议）。

---

## 1. 项目目录与远程

- 游戏克隆：`C:\Users\dlzhi\OneDrive\Desktop\normal use\s-AI-RPG-play`
- 分支：`GSG`；`origin` = Gitee 公开仓库 `hkfg1206/s-AI-RPG`（主），`github` = GitHub 公开仓库 `a1206122381-cmyk/-s-AI-RPG`（镜像）
- git 身份：a1206122381-cmyk（存档提交沿用）

## 2. 工具映射（Kimi Code → DSH）

| 项目文档中的工具 | DSH 环境实际使用 |
|---|---|
| 文件读写 read_file / write_file | 内置 `read` / `write` / `edit` / `glob` / `grep` |
| 联网考证 FetchURL | `web_search` 工具 |
| rg | `grep` 工具 |
| `task` subagent（线级执行） | `subagent` 工具（一次一条线，只读/只算/只整理） |
| bash `scripts/save.sh` | PowerShell（pwsh）或 `node scripts/save.js "消息"` |
| git | pwsh 里直接 `git`（PATH 可用） |
| Skills `load_skill` | `skill` 工具，30 个全部已挂载（见 §3） |
| MCP：memory（search_nodes / add_observations / create_entities / create_relations / read_graph / open_nodes 等） | `mcp__memory__<同名工具>` |
| MCP：sequential-thinking（sequentialthinking） | `mcp__sequential-thinking__sequentialthinking` |
| MCP：alchemy（query 等，SQLite 只读） | `mcp__alchemy__<工具名>` |
| MCP：qdrant（qdrant-store / qdrant-find） | `mcp__qdrant__qdrant-store` / `mcp__qdrant__qdrant-find` |

降级映射不变：任何 MCP 不可用时，memory → 直接逐行读写 `memory.json`（JSONL，禁止整文件 JSON.parse）；推演 → 书面思维链；不阻塞游玩。

## 3. Skills（30/30 已就绪）

- 挂载方式：`C:\Users\dlzhi\.dsh\skills\` 下为 30 个目录联接，指向本项目的 `skills\`（用户级，所有 DSH 会话可见）。
- 已修复 6 个不兼容项：
  - 4 个技能的 description 跨行引号错误（creative-research / creative-writing-muse / story-memory / writing-staffing）→ 已改为单行；
  - `reasoning-audit` 的 description 含 `: ` 触发 YAML 嵌套映射错误 → 已加引号；
  - `deepseek_v4_rolepaly_instruct` 名称含下划线不符合 DSH 规则 → 已改名 `deepseek-v4-roleplay-instruct`（文件夹同步改名，AGENTS.md/START_HERE.md 引用已更新）。
- 校验脚本：`C:\Users\dlzhi\.dsh\check-skills.mjs`（用 DSH 同款解析器全量校验 30 个 frontmatter）。
- 许可清理（2026-09-04）：`pdf` 技能（Anthropic 专有条款）已移除；`deepseek-v4-roleplay-instruct` 上游无许可证，原文已删并原创重写。第三方技能许可声明见 `THIRD_PARTY_NOTICES.md`。
- 若移动/重克隆项目，需重建联接（`New-Item -ItemType Junction -Path <~/.dsh/skills/名> -Target <项目skills/名>`）。

## 4. MCP（四个服务，配置在 DSH 侧）

- 配置位置：`C:\Users\dlzhi\.dsh\profiles\web\cordis.patch.yml`（每服务一个 `@deepseek-ai/dsh-mcp-client` 实例；HMR 热加载，改配置自动重连）。Kimi Code 的 `~/.kimi-code/mcp.json` 与项目 `.mcp.json` 不受影响、互不干扰（DSH 不读它们）。
- 服务清单：

| 服务 | serverName | 数据位置 |
|---|---|---|
| memory（Node） | memory | `C:\Users\dlzhi\.dsh\mcp\node_modules\@modelcontextprotocol\server-memory`，MEMORY_FILE_PATH=项目 `memory.json` |
| sequential-thinking（Node） | sequential-thinking | 同上目录 `server-sequential-thinking` |
| alchemy（uvx） | alchemy | DB_URL=项目 `campaign.db`（首次使用自动建库） |
| qdrant（uvx） | qdrant | 项目 `.qdrant/`，collection `campaign-memories`，Python 3.12 + onnxruntime 1.20.1，HF_ENDPOINT=hf-mirror.com |

- 首次启动会下载依赖（uv 缓存），已在本机预热过；qdrant 向量模型 `all-MiniLM-L6-v2` 走国内镜像。
- ⚠️ **uvx 服务不配置代理（直连）**：代理端口 10808 不常在（VPN 时开时关），写死代理会导致 uvx 启动时连不上 PyPI 而崩溃重试。若日后 uv 缓存失效需要拉新包，先开代理手动预热一次即可。

## 5. DSH 新对话启动提示词

切换对话开玩时，把下面代码块完整贴到新对话首条：

```
项目目录：C:\Users\dlzhi\OneDrive\Desktop\normal use\s-AI-RPG-play
你是本项目的 GM+叙述者。按顺序读：
1. AGENTS.md（核心规则）→ 2. START_HERE.md（全局手册）→ 3. DSH_ADAPTER.md（DSH 环境映射）→ 4. save-protocol.md（存档协议）
再读 state.md（当前快照）与 RESUME.md 的「当前状态」。
环境已就绪：30 个 skills 可用（skill 工具）；4 个 MCP 已配（mcp__memory__* / mcp__sequential-thinking__* / mcp__alchemy__* / mcp__qdrant__*）；node v24 可跑 scripts/*.js。
若战役尚未开始：按四阶段启动（WORLD_GEN → POLITICS_GEN → CHARACTER_GEN → 正式游玩）。
若已有进度：按 state.md 恢复，给 3–4 行「上回书」开场后等玩家指令。
```

## 6. 存档与同步（DSH 环境）

- 存档四步不变：①更新文件（state.md 优先，chronicle.md 追加摘要）→ ②更新 memory（MCP 或直接 JSONL）→ ③git commit → ④贴出 `git log --oneline -3` 真实哈希。
- 半自动：`node scripts/save.js "第X章: 摘要"`（校验+add+commit+出哈希）。
- push 只推 `GSG`：`git push origin GSG`（Gitee 私有）；`git push github GSG`（GitHub 镜像，可选）。绝不推公开仓库、不加其他远程。
