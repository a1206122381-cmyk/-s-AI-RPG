# SETUP · 环境自举配置（给 agent 的 SOP）

> **本文件给"要在这个环境里运行本战役的 agent"看**（DSH / Kimi Code / opencode / 其他）。
> 触发条件：新会话首轮跑 `node scripts/env-check.js` 输出 **not-ready**，或玩家说「开始玩吧」而环境未就绪。
> 流程：自检 → 装前置 → 装 MCP → 写配置 → 挂技能 → 验证 → 就绪后进入四阶段（或按 state.md 恢复游玩）。

---

## 粘贴版提示词（仅当你的环境不自动加载 AGENTS.md 时给玩家用）

```
项目目录：<本项目的绝对路径>
请读 SETUP.md 并执行环境自举配置（检查前置依赖、安装 MCP 服务、写入配置、挂载技能、
跑 env-check 验证），全部就绪后按 AGENTS.md 进入四阶段启动（或按 state.md 恢复游玩）。
```

## 第 0 步 · 环境自检（先查再装）

跑 `node scripts/env-check.js`，逐项核对。输出 [MISS] 的项按下面步骤补；输出 ready 直接进四阶段，别重复装。

## 第 1 步 · 前置依赖

| 依赖 | 必需？ | 检查 | 缺失时 |
|---|---|---|---|
| Node.js ≥ 18 | ✅ 必需（跑 scripts/*.js 与 Node 系 MCP） | `node --version` | 引导玩家去 https://nodejs.org 装 LTS 版，装完重开终端 |
| git | ✅ 必需（存档四步） | `git --version` | 引导玩家装 https://git-scm.com（Windows 直接装 Git for Windows） |
| uv | ⭕ 可选（仅 alchemy/qdrant 进阶 MCP） | `uv --version` | 不装也不阻塞（按降级映射玩）；想装引导 https://docs.astral.sh/uv |

## 第 2 步 · 安装 MCP 服务（Node 系，必需项）

把两个 Node MCP 服务装到用户目录（一次安装，多个项目共用）：

```bash
mkdir -p ~/.dsh/mcp && cd ~/.dsh/mcp
npm init -y
npm install @modelcontextprotocol/server-memory @modelcontextprotocol/server-sequential-thinking
```

（Windows 用 PowerShell 时 `~` 展开为 `$env:USERPROFILE`；路径随平台自适配。）

### 进阶可选（alchemy / qdrant，不装不阻塞）

- **alchemy**（SQLite 只读经济库）：`uvx --from mcp-alchemy mcp-alchemy`
- **qdrant**（语义检索）：`uvx --python 3.12 --with onnxruntime==1.20.1 --with socksio --from mcp-server-qdrant mcp-server-qdrant`

⚠️ **三个已知坑（务必照做）**：
1. qdrant 必须加 `--with socksio`（否则 HTTP 客户端走 socks 代理时报 ImportError）；
2. qdrant 必须 `--python 3.12` + `onnxruntime==1.20.1`（新版 Python/onnxruntime 在本机 DLL 加载失败）；
3. **不要给 uvx 服务写死代理变量**（代理端口时开时关会导致启动崩溃重试）；qdrant 向量模型走国内镜像：env 里设 `HF_ENDPOINT=https://hf-mirror.com`。首次启动会下载依赖与模型（已装过则秒起）。

## 第 3 步 · 写 MCP 配置（按运行环境选一个）

### DSH（DeepSeek Harness）

在 `~/.dsh/profiles/web/cordis.patch.yml` 里**插入**条目（保留文件原有的注释头；若已有 mcp 条目则跳过本步）：

```yaml
- insert:
    - id: mcp-memory
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: memory
        transport: stdio
        command: node
        args: ['<home>/.dsh/mcp/node_modules/@modelcontextprotocol/server-memory/dist/index.js']
        env:
          MEMORY_FILE_PATH: '<项目根>/memory.json'
        toolCallTimeoutMs: 60000
        failOnStartupError: false

    - id: mcp-sequential-thinking
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: sequential-thinking
        transport: stdio
        command: node
        args: ['<home>/.dsh/mcp/node_modules/@modelcontextprotocol/server-sequential-thinking/dist/index.js']
        toolCallTimeoutMs: 60000
        failOnStartupError: false
```

- `<home>` 与 `<项目根>` 替换为实际绝对路径（**用正斜杠**）；加 alchemy/qdrant 时 serverName 分别用 `alchemy` / `qdrant`，command 用 `uvx`，args/env 按第 2 步（qdrant 记得 `HF_ENDPOINT` 与 `QDRANT_LOCAL_PATH=<项目根>/.qdrant`、`COLLECTION_NAME=campaign-memories`；alchemy 记得 `DB_URL=sqlite:///<项目根>/campaign.db`）。
- 改完 HMR 热加载自动重连；若新会话仍无 `mcp__*` 工具，重启 DSH。

### Kimi Code（opencode）

在 `~/.kimi-code/mcp.json` 写入 memory / sequential-thinking /（可选）alchemy / qdrant 四个 server 条目（memory 设 `MEMORY_FILE_PATH`、alchemy 设 `DB_URL`、qdrant 设 `QDRANT_LOCAL_PATH`+`COLLECTION_NAME`+`HF_ENDPOINT`，路径一律绝对路径）；修改后需重启会话生效。

## 第 4 步 · 挂载技能（按环境选一个；都不可用时降级）

- **DSH**：在 `~/.dsh/skills/` 下为 `skills/` 里每个技能目录建联接：
  - Windows（无需管理员）：`New-Item -ItemType Junction -Path "$env:USERPROFILE\.dsh\skills\<名>" -Target "<项目根>\skills\<名>"`
  - macOS/Linux：`ln -s "<项目根>/skills/<名>" ~/.dsh/skills/<名>`
- **Kimi Code**：在 `~/.kimi-code/config.toml` 的 `extra_skill_dirs` 加入 `<项目根>/skills`。
- **降级**（都不行）：agent 直接按需读 `skills/<名>/SKILL.md` 文件执行，效果等同，仅失去"skill 工具目录"便利。

## 第 5 步 · 验证与完成标志

1. 重跑 `node scripts/env-check.js`，应输出 `ready`（可选缺失 uv 不算未就绪）；
2. 握手验证（可选）：对每个已配 MCP 发送 initialize 请求确认能响应；
3. **完成标志 = env-check 输出 ready**。之后按 `AGENTS.md` 进入四阶段启动（WORLD_GEN → POLITICS_GEN → CHARACTER_GEN → 正式游玩），或按 `state.md`/`RESUME.md` 恢复游玩。

## 注意事项

- **agent 需要命令执行权限**（DSH 默认已满足；Kimi Code 需允许运行命令）。若无权限，把本文件各步骤中的命令逐条给玩家手动执行，执行完重跑 env-check。
- 一切配置**只在本机用户目录**（`~/.dsh` / `~/.kimi-code`），不改动项目仓库文件；项目内容始终可换机迁移（clone 或下载 zip）。
- 换机迁移 = ①装前置 → ②按本 SOP 配置 → ③clone 最新 GSG（或解压 zip）→ ④开玩。存档本身在 git 里，无需额外导出。
