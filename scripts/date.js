// date.js · 世界历法换算（边境历·圣炉节后第 N 日 → 月/日/季/星期/节庆）
// 历法模型（可改）：
//   一年 360 天 = 12 月 × 30 天；四季各 90 天（春 1-90 / 夏 91-180 / 秋 181-270 / 冬 271-360）
//   每周 6 天（一二三四五六）
//   第 0 日 = 圣炉节当日（纪元锚点）；第 N 日 = 圣炉节后第 N 日
// 用法：
//   node date.js                    → 显示第 1 日（圣炉节次日）与默认示例
//   node date.js 260                → 第 260 日换算
//   node date.js add 60 260         → 从第 260 日起推进 60 天
//   node date.js now 260            → 第 260 日 + 当前日期/季节/星期/节庆

const DAYS_PER_YEAR = 360;
const DAYS_PER_MONTH = 30;
const MONTHS = ['元月', '仲月', '季月', '槐月', '榴月', '荷月', '兰月', '桂月', '菊月', '霜月', '葭月', '冰月'];
const WEEKDAYS = ['圣日', '曜一', '曜二', '曜三', '曜四', '曜五'];

// 季节：第1-90春 91-180夏 181-270秋 271-360冬
function season(day) {
  const d = ((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR; // 归到 0-359
  if (d < 90) return '春';
  if (d < 180) return '夏';
  if (d < 270) return '秋';
  return '冬';
}

// 节庆（按一年内偏移，可扩展）
const FESTIVALS = [
  { offset: 0, name: '圣炉节' },
  { offset: 90, name: '仲夏祭' },
  { offset: 180, name: '收获节' },
  { offset: 270, name: '霜降祭' },
];
function festival(day) {
  const d = ((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
  return FESTIVALS.find(f => f.offset === d);
}

function format(day) {
  const d = ((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
  const year = Math.floor(day / DAYS_PER_YEAR);
  const monthIdx = Math.floor(d / DAYS_PER_MONTH);
  const dayOfMonth = d % DAYS_PER_MONTH + 1;
  const weekday = WEEKDAYS[((day % 6) + 6) % 6];
  const fest = festival(d);
  return `第 ${day} 日（圣炉节后）\n  边境历 ${year} 年 ${MONTHS[monthIdx]} ${dayOfMonth} 日 · ${season(d)} · ${weekday}\n  ${fest ? '★ 今日节庆：' + fest.name : '（平日）'}`;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === 'add') {
    const days = parseInt(args[1], 10);
    const from = parseInt(args[2], 10);
    if (isNaN(days) || isNaN(from)) { console.log('用法: node date.js add <天数> <从第N日起>'); return; }
    console.log(`推进 ${days} 天，自第 ${from} 日 → 第 ${from + days} 日`);
    console.log('---');
    console.log(format(from));
    console.log('  ↓');
    console.log(format(from + days));
  } else if (args[0] === 'now') {
    const day = parseInt(args[1], 10);
    if (isNaN(day)) { console.log('用法: node date.js now <第N日>'); return; }
    console.log(format(day));
  } else if (args[0]) {
    const day = parseInt(args[0], 10);
    if (isNaN(day)) { console.log('用法: node date.js [add <天> <从第N日> | now <第N日> | <第N日>]'); return; }
    console.log(format(day));
  } else {
    console.log('边境历换算工具：');
    console.log('  node date.js <第N日>          → 第 N 日换算');
    console.log('  node date.js add <天> <起点>  → 推进 N 天');
    console.log('  node date.js now <第N日>      → 当前状态\n');
    console.log('示例：');
    console.log('---');
    console.log(format(260));
  }
}

main();
