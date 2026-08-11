#!/usr/bin/env node
// check-memory.js — memory.json 健康校验 + 与 filesystem 一致性比对
//
// 用法:  node scripts/check-memory.js        （项目根目录或任意 cwd 均可）
// 退出码: 0 = 全部通过（含空图谱的合法新档）; 1 = 有需关注项
//
// 校验内容:
//   1. JSONL 格式健康（每行可解析、type 字段正确、无重复实体名）
//   2. 末尾换行检测（JSONL 规范建议每行含末行以 \n 结尾）
//   3. 与 characters/*.md 一致性（角色档 ↔ memory 实体名）
//   4. 关系引用完整性（from/to 必须指向已存在实体）
//
// 只报告，不修改任何文件。

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MEM_PATH = path.join(ROOT, 'memory.json');
const CHAR_DIR = path.join(ROOT, 'characters');

let problems = 0;
const fail = (msg) => { console.log(`  ✗ ${msg}`); problems++; };
const warn = (msg) => { console.log(`  ⚠ ${msg}`); };
const ok = (msg) => { console.log(`  ✓ ${msg}`); };

// ---------- 1. JSONL 格式 ----------
console.log('=== memory.json 格式校验 ===');
if (!fs.existsSync(MEM_PATH)) { fail('memory.json 不存在'); process.exit(1); }

const raw = fs.readFileSync(MEM_PATH, 'utf8');
const endsLF = raw.endsWith('\n') && !raw.endsWith('\r\n');
if (!endsLF) warn('文件未以 LF 结尾（末行无换行）。server-memory 通常容忍，但部分工具会误判。');

const lines = raw.split(/\r?\n/).filter(l => l.trim());
const ents = [], rels = [];
let bad = 0;
for (const [i, l] of lines.entries()) {
  try {
    const o = JSON.parse(l);
    if (o.type === 'entity') ents.push(o);
    else if (o.type === 'relation') rels.push(o);
    else fail(`第 ${i + 1} 行 type 异常: ${JSON.stringify(o.type)}`);
  } catch (e) { bad++; fail(`第 ${i + 1} 行 JSON 解析失败: ${e.message}`); }
}
console.log(`  实体 ${ents.length} | 关系 ${rels.length} | 坏行 ${bad}`);
if (bad === 0 && ents.length > 0) ok('JSONL 格式健康');
if (ents.length === 0) warn('无任何实体，图谱为空（新存档初始状态属正常；开局后建立实体）');

// 重复实体名
const nameCount = {};
for (const e of ents) nameCount[e.name] = (nameCount[e.name] || 0) + 1;
const dups = Object.entries(nameCount).filter(([, c]) => c > 1);
if (dups.length) fail(`重复实体名: ${dups.map(([n, c]) => `${n}(${c})`).join(', ')}`);

// ---------- 2. characters/ 一致性 ----------
console.log('\n=== characters/ ↔ memory 一致性 ===');
const charNames = [];
if (fs.existsSync(CHAR_DIR)) {
  for (const f of fs.readdirSync(CHAR_DIR)) if (f.endsWith('.md')) charNames.push(f.slice(0, -3));
}
const entNames = new Set(ents.map(e => e.name));

const memMissing = charNames.filter(n => !entNames.has(n));
if (memMissing.length === 0) ok('characters/ 所有角色在 memory 均有实体');
else warn(`characters/ 有档但 memory 无实体: ${memMissing.join(', ')}（NPC 按需 create_entities）`);

const charMissing = [...entNames].filter(n => !charNames.includes(n));
if (charMissing.length === 0) ok('memory 所有实体在 characters/ 均有档案');
else console.log(`  ℹ memory 有实体但无角色档: ${charMissing.length} 个（势力/地点/物品/未建档 NPC 属正常）— ${charMissing.slice(0, 8).join(', ')}${charMissing.length > 8 ? ' …' : ''}`);

// ---------- 3. 关系引用完整性 ----------
console.log('\n=== 关系引用完整性 ===');
let dangling = 0;
for (const r of rels) {
  if (!entNames.has(r.from)) { fail(`关系 from 指向不存在实体: ${r.from}`); dangling++; }
  if (!entNames.has(r.to)) { fail(`关系 to 指向不存在实体: ${r.to}`); dangling++; }
}
if (dangling === 0) ok('所有关系两端均指向已存在实体');

// ---------- 总结 ----------
console.log('\n=== 总结 ===');
if (problems === 0) { console.log('✓ 全部通过'); process.exit(0); }
console.log(`✗ ${problems} 项需关注（⚠ 为提示，✗ 为硬伤）`); process.exit(1);
