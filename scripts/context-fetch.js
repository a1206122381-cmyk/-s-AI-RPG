#!/usr/bin/env node
'use strict';
// context-fetch.js · 自动上下文提取（memory.json 检索兜底）
// 用法:
//   node scripts/context-fetch.js [关键词...]
//   无参数: 从 state.md 自动提取关键词（当前主线 / 位置 / 班底 / 危机 + characters/ 档名）
// 输出: 相关实体 + 观察 + 关系的精简块，供 GM 每轮注入上下文。
//       正常路径优先用 MCP（qdrant-find 语义召回 + search_nodes 图谱查询）；
//       本脚本是 MCP 不可用时的自动化兜底（纯 Node，无第三方依赖）。

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MEM = path.join(ROOT, 'memory.json');
const STATE = path.join(ROOT, 'state.md');

function tokenize(s) {
  const parts = (s || '').split(/[\s，。；：、（）()「」『』【】\-—|/*`>#]+/).filter(Boolean);
  const out = new Set();
  for (const p of parts) {
    const t = p.replace(/[*`>#]/g, '').trim();
    if (/^[\u4e00-\u9fa5]{2,10}$/.test(t) || /^[A-Za-z][A-Za-z0-9_-]{2,}$/.test(t)) out.add(t);
  }
  return [...out];
}

function keywordsFromState() {
  if (!fs.existsSync(STATE)) return [];
  const raw = fs.readFileSync(STATE, 'utf8');
  const kws = new Set();
  const grab = (re) => { const m = raw.match(re); if (m) tokenize(m[1]).forEach(k => kws.add(k)); };
  grab(/当前推进的线[^\n]*：\s*([^\n*（(]+)/);
  grab(/位置[^\n]*：\s*([^\n*（(]+)/);
  grab(/日期\/季节[^\n]*：\s*([^\n*（(]+)/);
  grab(/资源\/班底\/危机[^\n]*：\s*([^\n*（(]+)/);
  const cd = path.join(ROOT, 'characters');
  if (fs.existsSync(cd)) for (const f of fs.readdirSync(cd)) if (f.endsWith('.md') && f !== 'README.md') kws.add(f.slice(0, -3));
  return [...kws];
}

function main() {
  const kws = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const explicit = kws.length > 0;
  const finalKws = explicit ? kws : keywordsFromState();
  if (!finalKws.length) {
    console.log('（未提取到关键词：state.md 尚无内容，且未给参数。开局生成世界后即可自动提取。）');
    return;
  }

  const entities = [], relations = [];
  if (fs.existsSync(MEM)) {
    for (const line of fs.readFileSync(MEM, 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const o = JSON.parse(line);
        if (o.type === 'entity') entities.push(o);
        else if (o.type === 'relation') relations.push(o);
      } catch { /* 坏行跳过（check-memory.js 会报告） */ }
    }
  }

  const kw = finalKws.map(k => k.toLowerCase());
  const score = (s) => { s = (s || '').toLowerCase(); let n = 0; for (const k of kw) if (s.includes(k)) n++; return n; };
  const matched = entities
    .map(e => ({ e, n: score(e.name) * 3 + score(e.entityType) + (e.observations || []).reduce((a, o) => a + score(o), 0) }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n);

  console.log('══ 上下文注入（context-fetch）══');
  console.log(`关键词: ${finalKws.join(' / ')}（${explicit ? '手动指定' : '从 state.md 自动提取'}）`);
  console.log(`实体 ${entities.length} | 命中 ${matched.length}`);
  if (!entities.length) { console.log('（memory 为空——新战役尚未建实体，正常。）'); return; }
  if (!matched.length) { console.log('（无命中——可用 MCP qdrant-find 语义召回，或指定更宽的关键词。）'); return; }

  const top = matched.slice(0, 12);
  const names = new Set(top.map(x => x.e.name));
  for (const { e } of top) {
    const obs = (e.observations || []).join('；');
    console.log(`\n■ ${e.name}${e.entityType ? `（${e.entityType}）` : ''}`);
    console.log(`  ${obs.slice(0, 300) || '（无观察）'}`);
  }
  const rel = relations.filter(r => names.has(r.from) && names.has(r.to));
  if (rel.length) {
    console.log('\n— 相关关系 —');
    for (const r of rel.slice(0, 12)) console.log(`  ${r.from} → ${r.to}: ${r.relationType || '相关'}`);
  }
}

main();
