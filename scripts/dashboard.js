#!/usr/bin/env node
'use strict';
// dashboard.js · 单文件战役面板
// 用法: node scripts/dashboard.js   → 在项目根生成 dashboard.html，浏览器直接打开
// 内容: state.md 快照 + ledger.md 摘要 + 地图 ASCII（geo.js render）+ 最近 3 次存档 + 生成时间
// 建议: 每次存档后重跑一次（或并入 save.js 存档链）。

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const readOr = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; } };

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function sectionBullets(md, title) {
  const out = [];
  let inSec = false;
  for (const l of md.split(/\r?\n/)) {
    if (/^##\s/.test(l)) { inSec = l.includes(title); continue; }
    if (inSec && /^-\s+\*\*/.test(l)) out.push(l.replace(/^-\s+/, '').replace(/\*\*/g, '').trim());
  }
  return out;
}

function mapAscii() {
  try {
    const out = execSync(`"${process.execPath}" "${path.join(__dirname, 'geo.js')}" render`, { cwd: ROOT, encoding: 'utf8', timeout: 20000 });
    return out.trim() || '';
  } catch (e) { return ''; }
}

function gitLog() {
  try { return execSync('git log --oneline -3', { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return '（非 git 仓库）'; }
}

const stateMd = readOr('state.md');
const ledgerMd = readOr('ledger.md');

const mainLine = sectionBullets(stateMd, '当前主线线');
const snap = sectionBullets(stateMd, '快照');
const ledgerLines = ledgerMd.split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^#/.test(l) && !/^>/.test(l)).slice(0, 16);
const map = mapAscii();

const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>s-AI-RPG 战役面板</title>
<style>
  body { background:#14161c; color:#d8dbe4; font-family:"Segoe UI","Microsoft YaHei",sans-serif; margin:0; padding:24px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:#8a90a0; font-size:13px; margin-bottom:20px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  @media (max-width:900px){ .grid { grid-template-columns:1fr; } }
  .card { background:#1d212b; border:1px solid #2a3040; border-radius:10px; padding:14px 16px; }
  .card h2 { font-size:15px; margin:0 0 10px; color:#9fb6ff; }
  ul { margin:0; padding-left:18px; } li { margin:4px 0; font-size:14px; }
  pre { background:#0f1117; border:1px solid #2a3040; border-radius:8px; padding:12px; overflow:auto; font-size:13px; line-height:1.45; white-space:pre; }
  .warn { color:#e0a458; }
</style>
</head>
<body>
<h1>⚔ s-AI-RPG 战役面板</h1>
<div class="sub">生成于 ${new Date().toLocaleString('zh-CN')} · 重新生成：<code>node scripts/dashboard.js</code></div>
<div class="grid">
  <div class="card">
    <h2>📌 当前主线</h2>
    <ul>${mainLine.length ? mainLine.map(l => `<li>${esc(l)}</li>`).join('') : '<li class="warn">（待玩家指令确立）</li>'}</ul>
  </div>
  <div class="card">
    <h2>📋 状态快照（state.md）</h2>
    <ul>${snap.length ? snap.map(l => `<li>${esc(l)}</li>`).join('') : '<li class="warn">（待生成）</li>'}</ul>
  </div>
  <div class="card">
    <h2>💰 账本摘要（ledger.md）</h2>
    <ul>${ledgerLines.length ? ledgerLines.map(l => `<li>${esc(l)}</li>`).join('') : '<li class="warn">（账本为空/待生成）</li>'}</ul>
  </div>
  <div class="card">
    <h2>🗺 地图（geo.js render）</h2>
    ${map ? `<pre>${esc(map)}</pre>` : '<p class="warn">（map.json 尚未生成地缘数据）</p>'}
  </div>
  <div class="card" style="grid-column:1/-1;">
    <h2>📜 最近存档</h2>
    <pre>${esc(gitLog())}</pre>
  </div>
</div>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'dashboard.html'), html, 'utf8');
console.log('✓ 已生成: ' + path.join(ROOT, 'dashboard.html'));
