// blueprint-gen.js · 任务线底牌页生成器
// 用法：node scripts/blueprint-gen.js <线名> [关联调查线]
//   node scripts/blueprint-gen.js "讨伐水灵" "调查线二"
//   node scripts/blueprint-gen.js "护送灵药"
// 在项目 quests/ 目录生成 <slug>.md 底牌页骨架（GM 填空），避免手搓模板。
// slug 由线名拼音/英文转（此处简单按输入文件名安全化）。

const fs = require('fs');
const path = require('path');

const root = process.argv[3] ? path.resolve(process.argv[2]) : process.cwd();
// 简化：若第一个参数是目录则视为项目根，否则第二个参数为线名
let lineName, questsDir;
if (process.argv[2] && fs.existsSync(process.argv[2])) {
  questsDir = path.join(process.argv[2], 'quests');
  lineName = process.argv[3];
} else {
  questsDir = path.join(root, 'quests');
  lineName = process.argv[2];
}

if (!lineName) {
  console.log('用法: node scripts/blueprint-gen.js <线名> [关联调查线]');
  console.log('  示例: node scripts/blueprint-gen.js 讨伐水灵 "调查线二"');
  console.log('  或指定项目目录: node scripts/blueprint-gen.js <项目目录> 线名');
  process.exit(1);
}

if (!fs.existsSync(questsDir)) fs.mkdirSync(questsDir, { recursive: true });

// 生成 slug（英文/数字/连字符，中文转拼音首字母？这里简单用"line-N"序号）
// 更稳：用已存在文件数 +1 命名，或允许中文（但我们统一英文文件名）
function slugify(name) {
  // 去掉空白和特殊字符，转小写连字符；中文保留（但按规则应英文——这里给 fallback）
  let s = name.toLowerCase().replace(/[^\w\u4e00-\u9fff-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  // 若全中文，追加序号
  if (/^[\u4e00-\u9fff-]+$/.test(s)) {
    const count = fs.readdirSync(questsDir).filter(f => f.endsWith('.md')).length;
    s = 'quest-' + (count + 1) + '-' + s;
  }
  return s;
}

const slug = slugify(lineName);
const file = path.join(questsDir, slug + '.md');

const related = process.argv[3] && fs.existsSync(process.argv[2])
  ? process.argv[4]
  : (process.argv[3] || '');

const template = `# ${lineName} · 任务线底牌页

> GM 私有蓝图。玩家开始推进此线时生成；记录本线真相/大纲/涉及NPC立场/动机锚点，防人设漂移。真相玩家不可直接看全貌。

---

## 任务线标识

- **线名**：${lineName}
- **触发**：__（玩家如何介入此线）
- **关联调查线**：${related || '__'}

## 真相（GM 私有）

- __（本线内部真相；证据不足不凭空揭晓）

## 大纲 / 事件流程

- __（分支骨架，非死流程）

## 涉及 NPC（立场 / 动机 / 利益 / 动机锚点）

| NPC | 身份 | 立场 | 动机与利益 | 【动机锚点·不可违背】 |
|---|---|---|---|---|
| __ | __ | __ | __ | __ |

## 与主线 / 世界真相的关联

- __

## 结束状态

- [ ] 进行中
- [ ] 已完成（一次性，此页归档）
- [ ] 升格为主线（内容并入对应调查线）
- [ ] 涉及 NPC 转入 \`characters/\`（长期人物）

---

生成时间：${new Date().toISOString().slice(0, 10)}
`;

fs.writeFileSync(file, template, 'utf8');
console.log(`已生成底牌页: ${file}`);
console.log('打开后填空，再推进叙事。');
