// npc-registry.js · 人物注册/检索
// 用法：
//   node scripts/npc-registry.js scan <项目目录>        → 扫描 characters/ + quests/ 里的 NPC，汇总索引
//   node scripts/npc-registry.js find <项目目录> <名字> → 在某人的所有出现处检索
//   node scripts/npc-registry.js register <项目目录> <名字> <身份> <文件>   → 追加一行到 characters/_index.md
// 目的：人物档案散在 characters/、quests/、clues.md 时，统一索引/检索，防"找不到/重复/散落"。

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
// 支持两种顺序：<cmd> <dir> 或 <dir> <cmd>
let root, cmd;
if (args[0] && ['scan','find','register'].includes(args[0])) { cmd = args[0]; root = args[1] || process.cwd(); }
else if (args[1] && ['scan','find','register'].includes(args[1])) { root = args[0]; cmd = args[1]; }
else { root = args[0] || process.cwd(); cmd = 'scan'; }

function scan() {
  console.log('══ 人物索引扫描 ══');
  const index = [];
  // characters/*.md
  const charDir = path.join(root, 'characters');
  if (fs.existsSync(charDir)) {
    for (const f of fs.readdirSync(charDir)) {
      if (f.endsWith('.md')) {
        const p = path.join(charDir, f);
        const head = fs.readFileSync(p, 'utf8').split('\n').slice(0, 6).join(' ');
        const name = (head.match(/^#\s*(.+)/m) || [])[1] || f.replace('.md', '');
        index.push({ name, file: 'characters/' + f, kind: '长期人物' });
      }
    }
  }
  // quests/*.md（含涉及 NPC 表）
  const qDir = path.join(root, 'quests');
  if (fs.existsSync(qDir)) {
    for (const f of fs.readdirSync(qDir)) {
      if (f.endsWith('.md')) {
        const content = fs.readFileSync(path.join(qDir, f), 'utf8');
        const tableRows = content.match(/^\|.+\|$/gm) || [];
        for (const row of tableRows.slice(1)) { // 跳过表头
          if (/^\|\s*:?-+\s*\|/.test(row)) continue; // 跳过分隔行
          const cells = row.split('|').map(c => c.trim()).filter(Boolean);
          if (cells.length >= 2 && cells[0] && cells[0] !== 'NPC') {
            index.push({ name: cells[0], file: 'quests/' + f, kind: '任务NPC·' + (cells[1] || '') });
          }
        }
      }
    }
  }
  console.log(`共 ${index.length} 条：`);
  for (const e of index) console.log(`  ${e.name} — ${e.kind} — ${e.file}`);
  return index;
}

function find(name) {
  const index = scan();
  console.log(`\n══ 检索「${name}」══`);
  const hits = index.filter(e => e.name.includes(name) || name.includes(e.name));
  if (hits.length === 0) console.log('  未找到，可能未登记（扫描是自动的，若在 clues/chronicle 出现则未入索引）');
  else for (const h of hits) console.log(`  ${h.name} — ${h.kind} — ${h.file}`);
}

function register(name, role, file) {
  const idxPath = path.join(root, 'characters', '_index.md');
  fs.mkdirSync(path.dirname(idxPath), { recursive: true });
  const line = `| ${name} | ${role} | ${file} |`;
  if (fs.existsSync(idxPath)) {
    fs.appendFileSync(idxPath, line + '\n', 'utf8');
  } else {
    fs.writeFileSync(idxPath, '# 人物索引\n\n| 名字 | 身份 | 所在档案 |\n|---|---|---|\n' + line + '\n', 'utf8');
  }
  console.log(`已登记: ${name} → ${file}`);
}

if (cmd === 'scan') scan();
else if (cmd === 'find') find(args[2] || args[0]);
else if (cmd === 'register') register(args[2], args[3], args[4]);
else {
  console.log('用法:');
  console.log('  node scripts/npc-registry.js scan <项目目录>');
  console.log('  node scripts/npc-registry.js find <项目目录> <名字>');
  console.log('  node scripts/npc-registry.js register <项目目录> <名字> <身份> <文件>');
}
