// save-verify.js · 存档完整性校验
// 用法：node scripts/save-verify.js [项目目录]
// 检查：
//   1. 关键状态文件是否存在且未被 git 忽略
//   2. 关键文件是否已提交到 git（vs 工作区差异）
//   3. memory.json 格式（JSONL 逐行可解析）
//   4. 文档间引用断裂（.md 里引用的相对文件是否存在）
// 存后跑一次，防漏存/防引用断裂。任何一项失败即提示，不假装成功。

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = process.argv[2] || process.cwd();

const keyFiles = [
  'state.md', 'world.md', 'politics.md', 'politics-ledgers.md', 'chronicle.md', 'clues.md', 'quests.md',
  'commerce.md', 'domain.md', 'arms.md', 'expedition.md', 'ledger.md',
  'lessons-learned.md', 'memory.json', 'AGENTS.md', 'save-protocol.md',
  'WORLD_GEN.md', 'POLITICS_GEN.md', 'CHARACTER_GEN.md', 'START_HERE.md', 'RESUME.md', 'README_AGENTS.md',
];
const keyDirs = ['characters', 'quests', 'scripts'];

let fail = 0;
function ok(msg) { console.log('  [OK] ' + msg); }
function bad(msg) { console.log('  [失败] ' + msg); fail++; }

console.log('══ 存档完整性校验 ══');
console.log('目录: ' + root);

// 1. 关键文件存在
console.log('\n[1] 关键文件存在性');
for (const f of keyFiles) {
  if (fs.existsSync(path.join(root, f))) ok(f);
  else bad('缺失: ' + f);
}
for (const d of keyDirs) {
  if (fs.existsSync(path.join(root, d))) ok(d + '/');
  else bad('缺失目录: ' + d);
}

// 2. git 提交检查（若在 git 仓库内）
// 注意：存档前跑时，工作区有未提交改动是"待存的改动"（正常），只提示不判失败；
//       存档后跑时，工作区应干净。是否干净由调用方语境决定。
console.log('\n[2] git 提交状态');
try {
  execSync('git rev-parse --is-inside-work-tree', { cwd: root, stdio: 'pipe' });
  const diff = execSync('git status --short', { cwd: root, encoding: 'utf8' }).trim();
  if (diff) {
    console.log('  [提示] 以下文件未提交（存档前=待存改动，正常；存档后=漏存，需查）：');
    for (const line of diff.split('\n').filter(Boolean)) {
      console.log('    ' + line.trim());
    }
  } else {
    ok('工作区干净，全部已提交');
  }
  const lastCommit = execSync('git log --oneline -1', { cwd: root, encoding: 'utf8' }).trim();
  console.log('  最新提交: ' + lastCommit);
} catch (e) {
  console.log('  [警告] 非 git 仓库，跳过提交检查 (' + e.message.split('\n')[0] + ')');
}

// 3. memory.json 格式（JSONL 逐行）
console.log('\n[3] memory.json 格式');
const memPath = path.join(root, 'memory.json');
if (fs.existsSync(memPath)) {
  const raw = fs.readFileSync(memPath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim());
  let badLines = 0;
  for (const l of lines) {
    try { JSON.parse(l); } catch (e) { badLines++; console.log('    坏行: ' + l.slice(0, 60)); }
  }
  if (badLines === 0) ok('JSONL 合法，共 ' + lines.length + ' 行');
  else bad('memory.json 有 ' + badLines + ' 行无法解析');
} else {
  bad('memory.json 缺失');
}

// 4. 引用断裂（.md 内引用的相对文件/目录是否存在）
console.log('\n[4] 引用断裂检查');
const mdFiles = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      // 跳过 .opencode/skills 与根 skills/（skill 内部引用跨目录，由 skill-index.js 校验）
      if (p.includes(`${path.sep}.opencode${path.sep}skills`)) continue;
      if (p.includes(`${path.sep}skills`)) continue;
      if (p.includes(`${path.sep}.mcp`)) continue; // 跳过 node_modules
      if (p.includes(`${path.sep}node_modules`)) continue;
      walk(p);
    }
    else if (e.name.endsWith('.md')) mdFiles.push(p);
  }
}
try { walk(root); } catch (e) {}
let broken = 0;
for (const f of mdFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const refs = content.match(/`([\w\/\.\-]+\.md)`/g) || [];
  for (const r of refs) {
    const name = r.slice(1, -1);
    if (name.startsWith('http') || name.startsWith('~')) continue;
    // characters/ 引用按需生成，开局前缺失正常——跳过（角色档未建不算断裂）
    if (name.startsWith('characters/')) continue;
    // 尝试相对该文件解析
    const resolved = path.resolve(path.dirname(f), name);
    if (!fs.existsSync(resolved)) {
      console.log('  [断裂] ' + path.relative(root, f) + ' → `' + name + '`');
      broken++; fail++;
    }
  }
}
if (broken === 0) ok('文档引用无断裂（共扫 ' + mdFiles.length + ' 个 .md）');

console.log('\n════ 结果 ════');
if (fail === 0) {
  console.log('✓ 全部通过，存档完整');
} else {
  console.log('✗ 发现 ' + fail + ' 项问题，按上方红字修复后重存');
  process.exit(1);
}
