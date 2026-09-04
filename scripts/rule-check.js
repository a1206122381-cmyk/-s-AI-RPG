#!/usr/bin/env node
'use strict';
// rule-check.js · 协议词表自检（铁律 2「禁三词」+ 铁律 8「杜绝日式」+ 纯西式/中式官制约束）
// 用法:
//   node scripts/rule-check.js <文件...>     扫描指定文件
//   node scripts/rule-check.js --diff        扫描 git 未提交改动（.md 新增行 + 未跟踪 .md）
//   node scripts/rule-check.js --stdin       扫描标准输入文本
//   node scripts/rule-check.js --demo        用内置样例演示命中效果
// 说明: 只警告不阻断（恒 exit 0），已由 save.js 在存档前自动调用。
//       人名中式化 / 金句腔等软约束不在词表范围，仍靠 GM 自觉（reasoning-audit / humanizer-zh）。

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const GROUPS = {
  '禁三词（铁律2）': ['平衡', '张力', '难度'],
  '日式元素（铁律8/纯西式）': [
    '冒险者公会', '冒险者工会', '定级', '等级面板', '职业小队', '坦克位', '奶妈', '辅助位',
    '迷宫', '宝箱房', '亚人', '魔物娘', '转生', '异世界', '魔法学院', '入学考试', '排名赛',
    '武道', '气脉', '斗气', '秘境', '灵药', '好感度', '任务板', '每日任务', '限时活动',
    '勇者', '魔王城', '门派', '宗门', '修炼', '武侠', '修仙', '道士', '道长', '江湖',
  ],
  '中式官制/称谓（纯西式约束）': [
    '巡按', '巡抚', '总督', '知县', '知府', '督办', '钦差', '县衙', '衙门', '圣旨', '朝廷',
    '科举', '秀才', '举人', '状元', '皇上', '朕', '太监', '东厂', '锦衣卫',
  ],
};

function scan(text) {
  const hits = [];
  for (const [group, words] of Object.entries(GROUPS)) {
    for (const w of words) {
      let idx = text.indexOf(w);
      while (idx !== -1) { hits.push({ group, word: w, index: idx }); idx = text.indexOf(w, idx + 1); }
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}

function report(hits, text, label) {
  if (!hits.length) { console.log(`  ✓ ${label}: 无命中`); return 0; }
  console.log(`  ⚠ ${label}: ${hits.length} 处命中`);
  const shown = Math.min(hits.length, 8);
  for (let i = 0; i < shown; i++) {
    const h = hits[i];
    const ctx = text.slice(Math.max(0, h.index - 18), Math.min(text.length, h.index + h.word.length + 18)).replace(/\s+/g, ' ');
    console.log(`      [${h.group}]「${h.word}」…${ctx}…`);
  }
  if (hits.length > shown) console.log(`      …（其余 ${hits.length - shown} 处略）`);
  const byGroup = {};
  for (const h of hits) { byGroup[h.group] = byGroup[h.group] || {}; byGroup[h.group][h.word] = (byGroup[h.group][h.word] || 0) + 1; }
  console.log('  汇总: ' + Object.entries(byGroup).map(([g, ws]) => `${g}: ${Object.entries(ws).map(([w, c]) => `${w}×${c}`).join(', ')}`).join(' | '));
  return hits.length;
}

function sourcesFromDiff() {
  const out = [];
  try {
    const diff = execSync('git diff --unified=0 -- "*.md"', { cwd: ROOT, encoding: 'utf8' });
    const added = diff.split(/\r?\n/).filter(l => /^\+[^+]/.test(l)).map(l => l.slice(1)).join('\n');
    if (added.trim()) out.push({ label: 'git 未提交 .md 改动', text: added });
    const untracked = execSync('git ls-files --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' })
      .split(/\r?\n/).filter(f => f.endsWith('.md'));
    for (const f of untracked) {
      const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
      out.push({ label: '未跟踪文件 ' + f, text: t });
    }
  } catch (e) { console.log('  [提示] git 不可用或非仓库：' + e.message.split('\n')[0]); }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  console.log('══ 协议词表自检（rule-check）══');
  let total = 0;
  if (args.includes('--demo')) {
    const demo = '冒险者公会发布了一个 B 级委托：前往迷宫第三层击败魔物娘，奖励很丰厚。为了平衡难度，队伍里的奶妈和坦克需要修炼斗气。总督大人和知县也来视察，皇上甚至下了圣旨。';
    total += report(scan(demo), demo, '内置样例');
  } else if (args.includes('--stdin')) {
    const text = fs.readFileSync(0, 'utf8');
    total += report(scan(text), text, '标准输入');
  } else if (args.includes('--diff')) {
    for (const { label, text } of sourcesFromDiff()) total += report(scan(text), text, label);
  } else if (args.length) {
    for (const f of args) {
      const fp = path.resolve(f);
      if (!fs.existsSync(fp)) { console.log(`  [跳过] 不存在: ${f}`); continue; }
      total += report(scan(fs.readFileSync(fp, 'utf8')), fs.readFileSync(fp, 'utf8'), f);
    }
  } else {
    console.log('用法: node scripts/rule-check.js <文件...> | --diff | --stdin | --demo');
    return;
  }
  console.log(total ? `\n⚠ 共 ${total} 处命中——请检查是否违反铁律（仅警告，不阻断存档）` : '\n✓ 无违禁词命中');
}

main();
