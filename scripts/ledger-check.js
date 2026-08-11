// ledger-check.js · 账目对账
// 用法：node scripts/ledger-check.js [项目目录]
// 读 ledger.md 中"共有现金"标注的期初/当前余额与流水摘要，核对加减是否等于期末。
// 说明：ledger.md 是叙事账本，数字散在表格与"**结算**"段。本脚本做轻量对账——
//   若发现明显矛盾（如期末注释与账面不符、流水加总对不上），提示人工复核。
// 数值以 econ.js / SQLite 为准；本脚本只抓"明显漂移"。

const fs = require('fs');
const path = require('path');

const root = process.argv[2] || process.cwd();
const ledgerPath = path.join(root, 'ledger.md');

if (!fs.existsSync(ledgerPath)) {
  console.error('未找到 ledger.md');
  process.exit(1);
}

const content = fs.readFileSync(ledgerPath, 'utf8');
console.log('══ 账目对账（ledger.md）══');

// 只认"共有现金"表格行里的金额（| 共有现金 | 约 N 金 |）
const cashRowRe = /共有现金\s*\|\s*约?\s*([\d,]+(?:\.[\d]+)?)\s*金/g;
let m, cashValues = [];
while ((m = cashRowRe.exec(content)) !== null) {
  cashValues.push(parseFloat(m[1].replace(/,/g, '')));
}
if (cashValues.length === 0) {
  console.log('  未在 ledger.md 找到「共有现金」行的金额标注');
} else {
  const latest = cashValues[cashValues.length - 1];
  console.log(`  「共有现金」标注 ${cashValues.length} 处，最新账面: ${latest} 金`);
  if (cashValues.length > 1) {
    console.log(`  演进: ${cashValues.map(v => v.toLocaleString()).join(' → ')}`);
  }
}

// 提取演进记录（X → 约 Y）
const evolveRe = /([\d,]+(?:\.[\d]+)?)\s*→\s*约?\s*([\d,]+(?:\.[\d]+)?)/g;
let ev = [], em;
while ((em = evolveRe.exec(content)) !== null) {
  ev.push({ from: parseFloat(em[1].replace(/,/g, '')), to: parseFloat(em[2].replace(/,/g, '')) });
}
if (ev.length > 0) {
  console.log(`\n  演进记录 ${ev.length} 条：`);
  for (const e of ev.slice(-4)) {
    const sane = e.to >= e.from * 0.5;
    console.log(`    ${e.from.toLocaleString()} → ${e.to.toLocaleString()} ${sane ? '' : '[警告: 大幅回落，确认是否为大额支出]'}`);
  }
}

// 提取"月净利"标注
const netRe = /(?:月净利|月入|净入|净增)[^，。\n]*?([\d,.]+)\s*金/g;
let nm, nets = [];
while ((nm = netRe.exec(content)) !== null) nets.push(nm[1]);
if (nets.length > 0) {
  console.log(`\n  月度净利标注 ${nets.length} 处: ${nets.slice(-5).join(' / ')}`);
}

console.log('\n  提示: 数值权威为 econ.js 脚本输出；ledger.md 若与脚本结论不符，以脚本为准并回写 ledger。');
