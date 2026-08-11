// econ.js · 通用经济演算入口（参数化场景，不用每次重写脚本）
// 铁律：先列假设（输入即假设）→ 数字由假设推出；只输出关键取舍。
// 用法：
//   node econ.js product <json>    新产线立项
//   node econ.js expand <json>     扩产投入
//   node econ.js buyprops <json>   购置地产（租vs买）
//   node econ.js orgs <json>       武装维持
//   node econ.js timeskip <json>   时间推进
//   node econ.js strategy <json>   贸易战/战略
// JSON 可写文件传入：node econ.js product params.json
// 也支持内联：node econ.js expand '{"start":100,"lines":[{"name":"砖","invest":150,"current":218,"growth":0.5}]}'

const S = 10; // 银/金

function loadJSON(input) {
  // 若是文件路径则读文件，否则当作内联 JSON
  const fs = require('fs');
  try {
    if (fs.existsSync(input)) return JSON.parse(fs.readFileSync(input, 'utf8'));
  } catch (e) { /* fallthrough */ }
  return JSON.parse(input);
}

function pad(n) { return n.toFixed ? n.toFixed(1) : String(n); }

const scenarios = {
  // 新产线立项：{name, qty, price, cost} 或 {name, batches:[{qty,price,cost}]}
  product(p) {
    console.log(`【新产线·${p.name}】`);
    const rows = Array.isArray(p.batches) ? p.batches : [{ qty: p.qty, price: p.price, cost: p.cost }];
    let rev = 0, cost = 0;
    for (const r of rows) {
      const rv = r.qty * r.price, ct = r.cost;
      rev += rv; cost += ct;
      console.log(`  ${r.label || ''} ${r.qty}×${r.price}金 = ${rv}金 − ${ct}金 = ${pad(rv - ct)}金`);
    }
    const net = rev - cost;
    console.log(`  月净利 ${pad(net)}金 | 毛利率 ${((rev - cost) / rev * 100).toFixed(0)}%`);
    if (p.invest) console.log(`  一次性投入 ${p.invest}金 | 回本 ${(p.invest / net).toFixed(1)}月`);
  },

  // 扩产：{start, invest, lines:[{name,current,growth}]}
  expand(p) {
    console.log('【扩产投入】');
    let totalInv = 0, add = 0;
    for (const l of p.lines) {
      const inc = l.current * l.growth;
      add += inc; totalInv += l.invest;
      console.log(`  ${l.name}: 投${l.invest}金 → 月净利 +${pad(inc)}金`);
    }
    console.log(`  总投入 ${totalInv}金 | 月净利增 +${pad(add)}金 | 回本 ${(totalInv / add).toFixed(1)}月`);
  },

  // 地产：{props:[{name,rentMonthly,buyPrice}]}
  buyprops(p) {
    console.log('【购置地产·租vs买】');
    for (const x of p.props) {
      const annual = x.rentMonthly * 12;
      const years = x.buyPrice / annual;
      const verdict = years <= 5 ? '建议购' : (years <= 8 ? '可购' : '租更划算');
      console.log(`  ${x.name}: 年租${pad(annual)}金 买价${x.buyPrice}金 → 回本${years.toFixed(1)}年 | ${verdict}`);
    }
  },

  // 武装：{orgs:[{name,count,pay,bonus}], income:[{name,amount}]}
  orgs(p) {
    console.log('【武装维持】');
    let cost = 0;
    for (const o of p.orgs) {
      const c = o.count * o.pay + (o.bonus || 0);
      cost += c;
      console.log(`  ${o.name}: ${o.count}人×${o.pay}金 + 赏${o.bonus || 0} = ${pad(c)}金/月`);
    }
    let income = 0;
    if (p.income) for (const i of p.income) income += i.amount;
    console.log(`  月维持 ${pad(cost)}金 | 入账 ${pad(income)}金 | 净 ${pad(income - cost)}金/月`);
  },

  // 时间推进：{start, monthlyNet, months, once?}
  timeskip(p) {
    console.log('【时间推进】');
    let cash = p.start - (p.once || 0);
    if (p.once) console.log(`  一次性投入 ${p.once}金`);
    for (let m = 1; m <= p.months; m++) {
      cash += p.monthlyNet;
      console.log(`  第${m}月: +${pad(p.monthlyNet)}金 → 期末≈${pad(cash)}金`);
    }
  },

  // 战略/贸易战：{monthlyCost, monthlyRevenue, gloveCapital, takeover}
  strategy(p) {
    console.log('【战略/贸易战】');
    const net = (p.monthlyRevenue || 0) - (p.monthlyCost || 0);
    console.log(`  月净 ${pad(net)}金（收${pad(p.monthlyRevenue||0)} − 支${pad(p.monthlyCost||0)}）`);
    if (p.gloveCapital) console.log(`  白手套放贷本金 ${p.gloveCapital}金`);
    if (p.takeover) {
      const gain = p.takeover.assets + p.takeover.debt - p.gloveCapital;
      console.log(`  吞并净得: 产业${p.takeover.assets} + 收息${p.takeover.debt} − 本金${p.gloveCapital} = ${pad(gain)}金`);
    }
  },
};

function main() {
  const [scenario, input] = process.argv.slice(2);
  if (!scenario || !input || !scenarios[scenario]) {
    console.log('用法: node econ.js <场景> <json文件或内联json>');
    console.log('场景: ' + Object.keys(scenarios).join(' / '));
    return;
  }
  try {
    const params = loadJSON(input);
    scenarios[scenario](params);
  } catch (e) {
    console.error('参数解析失败:', e.message);
  }
}

main();
