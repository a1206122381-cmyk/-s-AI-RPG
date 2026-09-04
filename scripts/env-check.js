#!/usr/bin/env node
'use strict';
// env-check.js · 环境就绪检查（只读，agent 首轮用它决定是否自举配置）
// 用法:
//   node scripts/env-check.js         人类可读输出
//   node scripts/env-check.js --json  机器可读 JSON
// 退出码: 0 = ready（可直接开玩）; 1 = not-ready（需按 SETUP.md 自举配置）
// 检查项: 前置(node/git/uv) / MCP 配置(DSH 或 Kimi Code) / 技能挂载 / 项目数据文件

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const HOME = os.homedir();
const results = [];
function check(name, ok, detail, optional = false) { results.push({ name, ok, detail, optional }); }

// 1. 前置依赖
check('node', true, process.version);
try { check('git', true, execSync('git --version', { encoding: 'utf8' }).trim()); }
catch { check('git', false, '未找到 git（存档必需）'); }
try { check('uv', true, execSync('uv --version', { encoding: 'utf8' }).trim(), true); }
catch { check('uv', false, '未安装（仅 alchemy/qdrant 进阶 MCP 需要，可跳过）', true); }

// 2. MCP 配置（DSH 或 Kimi Code，任一即可）
const dshPatch = path.join(HOME, '.dsh', 'profiles', 'web', 'cordis.patch.yml');
const kimiMcp = path.join(HOME, '.kimi-code', 'mcp.json');
if (fs.existsSync(dshPatch)) {
  const t = fs.readFileSync(dshPatch, 'utf8');
  const m = ['mcp-memory', 'mcp-sequential-thinking'].map(s => `${s}:${t.includes(s) ? '✓' : '✗'}`);
  check('MCP 配置', t.includes('mcp-memory') && t.includes('mcp-sequential-thinking'), m.join(' ') + '（DSH cordis.patch.yml）');
} else if (fs.existsSync(kimiMcp)) {
  const t = fs.readFileSync(kimiMcp, 'utf8');
  check('MCP 配置', t.includes('server-memory') && t.includes('sequential-thinking'), '（Kimi Code mcp.json）');
} else {
  check('MCP 配置', false, 'DSH cordis.patch.yml 与 Kimi mcp.json 均未找到');
}

// 3. 技能挂载（DSH junction 或 Kimi extra_skill_dirs；都无则降级为直接读文件）
const dshSkills = path.join(HOME, '.dsh', 'skills');
const kimiCfg = path.join(HOME, '.kimi-code', 'config.toml');
if (fs.existsSync(dshSkills)) {
  try {
    const n = fs.readdirSync(dshSkills).filter(d => fs.existsSync(path.join(dshSkills, d, 'SKILL.md'))).length;
    check('技能挂载', n >= 20, `~/.dsh/skills 挂载 ${n} 个`);
  } catch { check('技能挂载', false, '~/.dsh/skills 读取失败'); }
} else if (fs.existsSync(kimiCfg)) {
  const ok = /extra_skill_dirs/.test(fs.readFileSync(kimiCfg, 'utf8'));
  check('技能挂载', ok, 'Kimi extra_skill_dirs ' + (ok ? '已配置' : '未配置'));
} else {
  check('技能挂载', false, '未检测到挂载（降级：agent 直接读 skills/*/SKILL.md 亦可玩，仅缺 DSH skill 工具目录）');
}

// 4. 项目数据文件
const root = path.resolve(__dirname, '..');
check('memory.json', fs.existsSync(path.join(root, 'memory.json')), '项目数据文件');

const missing = results.filter(r => !r.optional && !r.ok);
const ready = missing.length === 0;
const optionalMiss = results.filter(r => r.optional && !r.ok);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ready, checks: results.map(r => ({ name: r.name, ok: r.ok, optional: !!r.optional, detail: r.detail })) }, null, 2));
  process.exit(ready ? 0 : 1);
}

console.log('══ 环境就绪检查（env-check）══');
for (const r of results) {
  const tag = r.ok ? '[OK] ' : (r.optional ? '[OPT]' : '[MISS]');
  console.log(`${tag} ${r.name}: ${r.detail}`);
}
console.log('── 结论 ──');
if (ready) {
  console.log('ready：可直接进入四阶段开玩（或按 state.md 恢复游玩）。');
  if (optionalMiss.length) console.log(`（可选缺失：${optionalMiss.map(r => r.name).join('、')}——仅进阶 MCP 需要，按降级映射不阻塞）`);
} else {
  console.log(`not-ready：缺少 ${missing.map(r => r.name).join('、')}。请按 SETUP.md 自举配置后再开玩。`);
}
process.exit(ready ? 0 : 1);
