// season-event.js · 季节事件提醒
// 用法：node scripts/season-event.js <当前第N日> [推进天数]
//   当前第N日 → 提示当前季节 + 应发生的季节事件
//   当前第N日 + 推进天数 → 提示推进后跨了哪些季节、各季应发事件
// 世界历法：一年360天，四季各90天（春1-90/夏91-180/秋181-270/冬271-360）
// 事件表可改（按剧本自定义）。

const SEASONS = [
  { name: '春', range: [1, 90], events: ['解冻、播种', '商路开、北线货队启程', '魔物随回暖活跃'] },
  { name: '夏', range: [91, 180], events: ['河运旺、码头繁忙', '收获前农忙', '天气热、疫病偶发'] },
  { name: '秋', range: [181, 270], events: ['收获、年祭', '商路转运、冬储', '魔物迁徙'] },
  { name: '冬', range: [271, 360], events: ['封山、商路少', '冬市、节庆', '本地销路旺、取暖物资紧'] },
];

function seasonOf(day) {
  const d = ((day - 1) % 360 + 360) % 360 + 1;
  for (const s of SEASONS) {
    if (d >= s.range[0] && d <= s.range[1]) return s;
  }
  return SEASONS[0];
}

function main() {
  const day = parseInt(process.argv[2], 10);
  const advance = parseInt(process.argv[3], 10);
  if (isNaN(day)) {
    console.log('用法: node scripts/season-event.js <当前第N日> [推进天数]');
    return;
  }

  const cur = seasonOf(day);
  console.log(`第 ${day} 日 · ${cur.name}`);
  console.log(`  本季事件: ${cur.events.join(' / ')}`);

  if (!isNaN(advance)) {
    const end = day + advance;
    console.log(`\n推进 ${advance} 天 → 第 ${end} 日`);
    // 找出经过的季节边界
    const startSeason = Math.floor(((day - 1) % 360) / 90);
    const endSeason = Math.floor(((end - 1) % 360) / 90);
    const passed = [];
    for (let s = startSeason + 1; s <= endSeason; s++) {
      passed.push(SEASONS[s % 4].name);
    }
    if (passed.length === 0) console.log(`  仍在${cur.name}，无跨季`);
    else {
      console.log(`  跨季: ${passed.join(' → ')}`);
      for (const p of passed) {
        const s = SEASONS.find(x => x.name === p);
        console.log(`    ${p}: ${s.events.join(' / ')}`);
      }
    }
    console.log(`\n  抵达: ${seasonOf(end).name}（${seasonOf(end).events.join(' / ')}）`);
  }
}

main();
