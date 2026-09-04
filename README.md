# s-AI-RPG

长期低魔奇幻文字 **RPG + GSG + SIM + SLG** 四合一战役项目：以纯文本文件 + git + Node 脚本为运行基础，由 LLM 担任 GM+叙述者。多模型 / 多 agent 中立，文件即接口。

## 快速开始（一句话开玩）

1. 把 agent 的**工作目录设为本项目文件夹**（或告诉 agent 本项目的绝对路径）
2. 对它说「**开始玩吧**」——agent 会自动读 `AGENTS.md`，先跑 `node scripts/env-check.js` 检查环境：已就绪直接进入四阶段开玩；未就绪则按 `SETUP.md` 自举配置（装前置/MCP/挂技能，全程它会告诉你每一步）
3. 换对话续玩时贴 `RESUME.md` 中的恢复提示词

> 前置：本机需有 Node.js 与 git（缺失时 agent 会提示下载地址）；agent 需有命令执行权限。

## 给 agent / 深度用户

- **Agent 接管**：读 `AGENTS.md`（核心规则）→ `START_HERE.md`（全局手册）→ `save-protocol.md`（存档协议）
- **环境自举**：`SETUP.md`（agent 配置 SOP）+ `node scripts/env-check.js`（就绪检查）
- **DSH（DeepSeek Harness）环境**：另见 `DSH_ADAPTER.md`（工具映射 / MCP / 启动提示词）

## 声明

- 本项目为个人创意 / 实验项目，AI 辅助开发与运行，非商用。
- 世界、人物与剧情纯属虚构；玩法设定（凤傲天 / 长寿 / 后宫 / 感情线等）为虚构创作内容。
- 第三方组件及其许可证见 `THIRD_PARTY_NOTICES.md`。
- 战役内容持续演化，仓库内文档可能处于进行中状态。
