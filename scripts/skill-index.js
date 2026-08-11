// skill-index.js · skills 清单校验
// 用法：node scripts/skill-index.js [skills目录]
// 检查 skills 目录：每个 skill 是否有 SKILL.md、frontmatter(name/description) 是否合法、source.json 是否存在。
// 打包前跑一次，防漏包/格式坏。

const fs = require('fs');
const path = require('path');

const skillsDir = process.argv[2] || path.join(__dirname, '..', 'skills');

if (!fs.existsSync(skillsDir)) {
  console.error('未找到 skills 目录: ' + skillsDir);
  process.exit(1);
}

const dirs = fs.readdirSync(skillsDir, { withFileTypes: true }).filter(e => e.isDirectory());
let ok = 0, warn = 0, fail = 0;
const warns = [];

console.log(`══ skills 清单校验（${skillsDir}）══`);
console.log(`共 ${dirs.length} 个 skill\n`);

for (const d of dirs) {
  const dir = path.join(skillsDir, d.name);
  const skillFile = path.join(dir, 'SKILL.md');
  const issues = [];

  if (!fs.existsSync(skillFile)) {
    issues.push('缺 SKILL.md');
  } else {
    const content = fs.readFileSync(skillFile, 'utf8').replace(/\r\n/g, '\n'); // 归一化行尾，兼容 CRLF
    // frontmatter: 开头 --- ... --- （opencode 不强制，缺了是警告）
    const m = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!m) warns.push(d.name + ': SKILL.md 无 frontmatter(警告, opencode 可加载)');
    else {
      if (!m[1].includes('name:')) warns.push(d.name + ': frontmatter 缺 name');
      if (!m[1].includes('description:')) warns.push(d.name + ': frontmatter 缺 description');
    }
    if (content.trim().length < 50) issues.push('SKILL.md 内容过短');
  }

  if (!fs.existsSync(path.join(dir, 'source.json'))) {
    warns.push(d.name + ': 缺 source.json(警告, 非强制)');
  }

  if (issues.length === 0) { ok++; console.log(`  [OK] ${d.name}`); }
  else { fail++; console.log(`  [问题] ${d.name}: ${issues.join('; ')}`); }
}

console.log(`\n════ 结果 ════`);
console.log(`✓ ${ok} 个正常 | ⚠ ${warns.length} 条警告(不阻塞) | ✗ ${fail} 个真问题`);
for (const w of warns) console.log('  警告: ' + w);
if (fail > 0) process.exit(1);
else console.log('skills 目录校验通过（警告项可不处理，opencode 可加载）');
