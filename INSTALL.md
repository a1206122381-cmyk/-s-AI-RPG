# INSTALL · 在另一台机器上完整复现本战役

> 目标：clone 之后，在**自己的 Windows 电脑**上拉起与源机器一致的 GM 环境（战役文件 + scripts + MCP + skills），自己当 GM 跑，而不是当玩家。本战役不绑定特定 agent（opencode / Claude Code / Kimi Code / 其它均可）。

---

## 0. 前提

- 一个 **GitHub 私有仓库**（源机器 push 后，你 clone 它）。
- **你自己的模型 API key**（DeepSeek / GLM 等）。**绝不使用别人的 key**——任何配置文件都不要从别人那里拷贝含 key 的内容。

## 1. 安装运行环境

| 项 | 版本要求 | 安装方式 |
|---|---|---|
| Node.js | ≥ 22.5（scripts 用到 `node:sqlite`） | https://nodejs.org |
| Git（含 Git Bash） | 任意新版本 | https://git-scm.com |
| uv（Python 包管理器） | 任意新版本 | `winget install astral-sh.uv` 或 https://docs.astral.sh/uv/ |
| agent CLI | 任选 | opencode / Kimi Code / Claude Code 各自官网 |

> 脚本全部为纯 Node、无第三方依赖，任何环境 `node` 可跑；`campaign.db`（sqlite 经济库）与 `.qdrant/`（语义库）由 MCP 服务器**首次运行自动创建**，已 gitignore，不入库。

## 2. 克隆

```bash
git clone <私有仓库URL> "N2" && cd "N2"
```

## 3. MCP 配置（memory / sqlite 经济库 / qdrant / sequential-thinking）

仓库根目录自带项目级 **`.mcp.json`**（相对路径）：

- **opencode / Claude Code 类**：clone 后即识别项目根 `.mcp.json`，无需改动。
- **Kimi Code**：把 `.mcp.json` 的内容复制进 `~/.kimi-code/mcp.json`，并把**相对路径改成你的绝对路径**，例如：
  ```json
  {
    "mcpServers": {
      "memory": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-memory"],
        "env": { "MEMORY_FILE_PATH": "C:\\<你的克隆路径>\\N2\\memory.json" }
      },
      "alchemy": {
        "command": "uvx",
        "args": ["--from", "mcp-alchemy", "mcp-alchemy"],
        "env": { "DB_URL": "sqlite:///C:/<你的克隆路径>/N2/campaign.db" }
      },
      "qdrant": {
        "command": "uvx",
        "args": ["--python", "3.12", "--with", "onnxruntime==1.20.1", "--from", "mcp-server-qdrant", "mcp-server-qdrant"],
        "env": { "QDRANT_LOCAL_PATH": "C:/<你的克隆路径>/N2/.qdrant", "COLLECTION_NAME": "campaign-memories" }
      },
      "sequential-thinking": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
      }
    }
  }
  ```
- 首次启动 MCP 会联网下载依赖（`npx` 与 `uvx`），之后离线可用。

## 4. Skills（可选增强，建议安装）

仓库自带 **`skills/`**（32 个，源机器同款）。任选其一：

- 把 `skills/` 下的内容拷到 `~/.claude/skills/`（合并/覆盖）；或
- 在 agent 配置里把 skill 目录指向 clone 出来的 `skills/`（Kimi Code：`extra_skill_dirs = [ "<克隆路径>/skills" ]`）。

> skills 是增强项：没有也能跑（AGENTS.md 已写明降级规则——按同名工作流的精神直接执行）。

## 5. 首次自检

```bash
node scripts/save-verify.js    # 关键文件存在性与引用断裂检查
node scripts/check-memory.js   # memory.json 格式（0 实体 = 新存档，正常）
git log --oneline -3
```

## 6. 开始

**Kimi Code 用户（最快路径）**：clone 后直接贴 `START_HERE.md` §10 的启动咒语，它会自动补齐 `extra_skill_dirs` 和 `~/.kimi-code/mcp.json`；**你已配置的模型 key 保持不动**，重启后再贴一次即可进游戏。

手动方式：读 `START_HERE.md` → 按四阶段启动（阶段一 `WORLD_GEN.md` 世界 → 阶段二 `POLITICS_GEN.md` 政治地缘 → 阶段三 `CHARACTER_GEN.md` 人物与势力）或直接续玩。

---

## 安全与维护提醒

- `.qdrant/`、`campaign.db`、`.memini/memory.db` 已在 `.gitignore` 中，不入库。
- **不要把任何含明文 API key 的文件提交进仓库**（如 `~/.kimi-code/config.toml` 里的 key）。
- 存档协议（`save-protocol.md`）只做本地 git 提交，可自行决定是否 push 到自己的私有仓库。
