#!/usr/bin/env node
'use strict';
// scripts/geo.js — 地图结构化数据查询与可视化
// 数据源：项目根目录 map.json（可用 --map <path> 覆盖）
//
// 命令：
//   summary                        地图概况（地点/路线/领地/地形计数与范围）
//   path <A> <B> [pace]            最短路径 + 路程时间
//   neighbors <A>                  A 的邻接（地点或领地）
//   reach <A> <N天> [pace]         N 天内可达的地点
//   claims                         领地 → 辖地 + 接壤
//   render [ascii|html]            可视化（ascii 打印到终端；html 写 map.html）
//   help                           帮助
//
// pace 可选：foot（步行，默认）| horse（骑马）| wagon（马车）
//
// 行程时间权威来源是 routes 边：
//   - 若边带 traversalTime{count,unit}，直接用；
//   - 否则用 lengthKm × terrainCost(group/terrain) × terrainMod ÷ 速度。

const fs = require('fs');
const path = require('path');

const DEFAULT_MAP = path.join(__dirname, '..', 'map.json');

function parseArgs(argv) {
  const args = argv.slice(2);
  let mapPath = DEFAULT_MAP;
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--map') { mapPath = args[++i]; }
    else rest.push(args[i]);
  }
  return { mapPath, cmd: rest[0], args: rest.slice(1) };
}

function loadMap(mapPath) {
  if (!fs.existsSync(mapPath)) {
    return { meta: {}, locations: [], routes: [], territories: [], terrain: [] };
  }
  return JSON.parse(fs.readFileSync(mapPath, 'utf8'));
}

const hpd = m => (m.meta && m.meta.hoursPerDay) || 8;
const kmh = (m, pace) => {
  const pacings = (m.meta && m.meta.pacings) || {};
  const p = pacings[pace] || pacings.foot || { kmPerHour: 4 };
  return p.kmPerHour || 4;
};
const tcost = (m, k) => (m.meta && m.meta.terrainCost && m.meta.terrainCost[k]) || 1.0;

function edgeHours(m, r, pace) {
  if (!r) return 0;
  if (r.traversalTime && typeof r.traversalTime.count === 'number') {
    const unit = (r.traversalTime.unit || 'hour').toLowerCase();
    return r.traversalTime.count * (unit.startsWith('day') ? hpd(m) : 1);
  }
  const len = r.lengthKm || 0;
  const key = r.group || r.terrain || 'plain';
  const cost = tcost(m, key) * ((r.terrainMod != null) ? r.terrainMod : 1);
  return (len * cost) / kmh(m, pace);
}

function edgeKm(r) {
  return (r && r.lengthKm) || 0;
}

function build(m) {
  const loc = {}, terr = {}, adj = {};
  for (const l of (m.locations || [])) loc[l.id] = l;
  for (const t of (m.territories || [])) terr[t.id] = t;
  const add = (a, b, r) => {
    (adj[a] = adj[a] || []).push({ to: b, route: r });
    (adj[b] = adj[b] || []).push({ to: a, route: r });
  };
  for (const r of (m.routes || [])) add(r.from, r.to, r);
  return { loc, terr, adj };
}

function dijkstra(m, start, pace, maxHours) {
  const { adj } = build(m);
  const dist = {}, prev = {};
  dist[start] = 0;
  const pq = [[0, start]];
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift();
    if (dist[u] != null && d > dist[u]) continue;
    for (const e of (adj[u] || [])) {
      const nd = d + edgeHours(m, e.route, pace);
      if (maxHours != null && nd > maxHours) continue;
      if (dist[e.to] == null || nd < dist[e.to]) {
        dist[e.to] = nd; prev[e.to] = u; pq.push([nd, e.to]);
      }
    }
  }
  return { dist, prev };
}

function fmtDur(m, h) {
  const d = h / hpd(m);
  if (d >= 0.95) return `${d.toFixed(1)} 天（${h.toFixed(1)} 小时，每天 ${hpd(m)} 小时）`;
  return `${h.toFixed(1)} 小时`;
}

function cmdSummary(m) {
  const L = (m.locations || []).length;
  const R = (m.routes || []).length;
  const T = (m.territories || []).length;
  const C = (m.terrain || []).length;
  const out = [];
  out.push(`地点 ${L} | 路线 ${R} | 领地 ${T} | 地形格 ${C}`);
  if (L) {
    const xs = m.locations.map(l => l.x), ys = m.locations.map(l => l.y);
    out.push(`范围 x[${Math.min(...xs)},${Math.max(...xs)}] y[${Math.min(...ys)},${Math.max(...ys)}]`);
  }
  out.push(`比例：1 格 = ${(m.meta && m.meta.scaleKmPerCell) || '?'} km`);
  return out.join('\n');
}

function cmdPath(m, a, b, pace) {
  const { loc, adj } = build(m);
  if (!loc[a] || !loc[b]) return `未知地点：${!loc[a] ? a : b}`;
  const { dist, prev } = dijkstra(m, a, pace);
  if (dist[b] == null) return `${a} 与 ${b} 之间没有连通路线。`;
  const seq = []; let cur = b;
  while (cur != null) { seq.unshift(cur); cur = prev[cur]; }
  const names = seq.map(id => (loc[id].name || id));
  let totalKm = 0;
  const legs = [];
  for (let i = 0; i < seq.length - 1; i++) {
    const r = (adj[seq[i]] || []).find(e => e.to === seq[i + 1]).route;
    const km = edgeKm(r), h = edgeHours(m, r, pace);
    totalKm += km;
    legs.push(`${names[i]} → ${names[i + 1]}: ${km} km, ${r.group || r.terrain || '路'}, ${h.toFixed(1)} 小时`);
  }
  const out = [];
  out.push(`${names[0]} → ${names[names.length - 1]}`);
  out.push(`路径：${names.join(' → ')}`);
  out.push(`总路程：${totalKm.toFixed(0)} km`);
  out.push(`行程时间：${fmtDur(m, dist[b])}`);
  out.push('路段：');
  for (const s of legs) out.push('  ' + s);
  return out.join('\n');
}

function territoryNeighbors(m, t) {
  const { loc, terr } = build(m);
  const locSet = new Set(t.locations || []);
  const seen = new Set(t.neighbors || []);
  const derived = new Set();
  for (const r of (m.routes || [])) {
    const aIn = locSet.has(r.from), bIn = locSet.has(r.to);
    if (aIn && !bIn) {
      const t2 = loc[r.to] && loc[r.to].controllerId ? terrOf(loc[r.to], m) : null;
      if (t2 && t2 !== t.id) derived.add(t2);
    } else if (bIn && !aIn) {
      const t2 = loc[r.from] && loc[r.from].controllerId ? terrOf(loc[r.from], m) : null;
      if (t2 && t2 !== t.id) derived.add(t2);
    }
  }
  for (const d of derived) seen.add(d);
  return { explicit: t.neighbors || [], derived: [...derived], all: [...seen] };
}

function terrOf(loc, m) {
  // 地点 → 领地：优先地点自带的 territoryId，其次按 controllerId 反查
  if (loc.territoryId) return loc.territoryId;
  for (const t of (m.territories || [])) {
    if ((t.locations || []).includes(loc.id)) return t.id;
    if (t.controllerId && loc.controllerId === t.controllerId) return t.id;
  }
  return null;
}

function cmdNeighbors(m, a, pace) {
  const { loc, terr } = build(m);
  if (terr[a]) {
    const t = terr[a];
    const nb = territoryNeighbors(m, t);
    const names = nb.all.map(id => (terr[id] && (terr[id].name || id)) || id);
    const out = [`领地 ${t.name || t.id} 接壤：`];
    if (nb.all.length) out.push('  ' + names.join(', '));
    else out.push('  （无接壤）');
    return out.join('\n');
  }
  if (loc[a]) {
    const edges = (build(m).adj[a] || []).map(e => {
      const h = edgeHours(m, e.route, pace);
      return `${loc[e.to].name || e.to}（${edgeKm(e.route)} km, ${h.toFixed(1)} 小时）`;
    });
    return `地点 ${loc[a].name || a} 邻接：\n  ${edges.length ? edges.join('\n  ') : '（无）'}`;
  }
  return `未知地点/领地：${a}`;
}

function cmdReach(m, a, days, pace) {
  const { loc } = build(m);
  if (!loc[a]) return `未知地点：${a}`;
  const maxHours = days * hpd(m);
  const { dist } = dijkstra(m, a, pace, maxHours);
  const rows = Object.entries(dist)
    .filter(([id]) => id !== a)
    .map(([id, h]) => ({ id, h }))
    .sort((x, y) => x.h - y.h);
  const out = [`从 ${loc[a].name || a} 出发，${days} 天内可达（${hpd(m)} 小时/天，${pace}）：`];
  if (!rows.length) out.push('  （无）');
  for (const r of rows) out.push(`  ${loc[r.id].name || r.id}: ${(r.h / hpd(m)).toFixed(1)} 天（${r.h.toFixed(1)} 小时）`);
  return out.join('\n');
}

function cmdClaims(m) {
  const { terr } = build(m);
  const out = [];
  for (const t of (m.territories || [])) {
    const nb = territoryNeighbors(m, t);
    const locNames = (t.locations || []).map(id => {
      const l = (m.locations || []).find(x => x.id === id);
      return l ? (l.name || id) : id;
    });
    const nbNames = nb.all.map(id => (terr[id] && (terr[id].name || id)) || id);
    out.push(`${t.name || t.id}（${t.type || '领地'}）`);
    out.push(`  辖地: ${locNames.length ? locNames.join(', ') : '（未填）'}`);
    out.push(`  接壤: ${nbNames.length ? nbNames.join(', ') : '（未填）'}`);
  }
  return out.length ? out.join('\n') : '（尚无领地数据）';
}

// ---- 可视化 ----

const TCHAR = { plain: '.', road: '=', trail: '·', ford: '=', forest: 'T', hill: '^', mountain: 'A', swamp: '~', river: '~', sea: '~', coast: '~' };
const TCOLOR = {
  plain: '#d7e0d7', road: '#d7d7d7', trail: '#cfd8cf', ford: '#c8bdb0',
  forest: '#7cb342', hill: '#bcaaa4', mountain: '#8d6e63',
  swamp: '#6d4c41', river: '#64b5f6', sea: '#42a5f5', coast: '#90caf9'
};
const RCOLOR = { road: '#616161', trail: '#9e9e9e', sea: '#1e88e5', river: '#42a5f5', mountain: '#795548' };

function bounds(m) {
  const xs = [], ys = [];
  for (const c of (m.terrain || [])) { xs.push(c.x); ys.push(c.y); }
  for (const l of (m.locations || [])) { xs.push(l.x); ys.push(l.y); }
  if (!xs.length) return { minX: 0, maxX: 0, minY: 0, maxY: 0, W: 1, H: 1, empty: true };
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, W: maxX - minX + 1, H: maxY - minY + 1, empty: false };
}

function bresenham(x0, y0, x1, y1, fn) {
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    fn(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function renderAscii(m) {
  const b = bounds(m);
  if (b.empty) return '（地图为空）';
  const grid = Array.from({ length: b.H }, () => Array(b.W).fill(' '));
  for (const c of (m.terrain || [])) {
    const x = c.x - b.minX, y = c.y - b.minY;
    if (x >= 0 && x < b.W && y >= 0 && y < b.H) grid[y][x] = TCHAR[c.terrain] || '?';
  }
  const { loc } = build(m);
  for (const r of (m.routes || [])) {
    const a = loc[r.from], c = loc[r.to];
    if (!a || !c) continue;
    bresenham(a.x - b.minX, a.y - b.minY, c.x - b.minX, c.y - b.minY, (x, y) => {
      if (x >= 0 && x < b.W && y >= 0 && y < b.H) grid[y][x] = '·';
    });
  }
  for (const l of (m.locations || [])) {
    const x = l.x - b.minX, y = l.y - b.minY;
    if (x >= 0 && x < b.W && y >= 0 && y < b.H) grid[y][x] = (l.name || l.id).charAt(0).toUpperCase() || '@';
  }
  const legend = '图例：大写字母=地点 ·=路线/道路，地形=' + Object.entries(TCHAR).map(([k, v]) => `${v}:${k}`).join(' ');
  return grid.map(row => row.join('')).join('\n') + '\n\n' + legend;
}

function renderHtml(m, outPath) {
  const b = bounds(m);
  if (b.empty) return '（地图为空，未生成）';
  const pad = 1;
  const vb = `${b.minX - pad} ${b.minY - pad} ${b.W + pad * 2} ${b.H + pad * 2}`;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="auto" font-family="sans-serif">`);
  // terrain cells
  for (const c of (m.terrain || [])) {
    const fill = TCOLOR[c.terrain] || '#eeeeee';
    parts.push(`<rect x="${c.x - 0.5}" y="${c.y - 0.5}" width="1" height="1" fill="${fill}" stroke="none"/>`);
  }
  const { loc } = build(m);
  // routes
  for (const r of (m.routes || [])) {
    const a = loc[r.from], c = loc[r.to];
    if (!a || !c) continue;
    const stroke = RCOLOR[r.group] || '#9e9e9e';
    parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${c.x}" y2="${c.y}" stroke="${stroke}" stroke-width="0.12"/>`);
  }
  // locations
  for (const l of (m.locations || [])) {
    parts.push(`<circle cx="${l.x}" cy="${l.y}" r="0.3" fill="#37474f"/>`);
    parts.push(`<text x="${l.x}" y="${l.y - 0.45}" font-size="0.55" fill="#1a1a1a">${l.name || l.id}</text>`);
  }
  parts.push('</svg>');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${m.meta && m.meta.title || '地图'}</title></head><body style="background:#fafafa;margin:12px">${parts.join('\n')}</body></html>`;
  fs.writeFileSync(outPath, html, 'utf8');
  return `已生成 ${outPath}`;
}

// ---- main ----

function main() {
  const { mapPath, cmd, args } = parseArgs(process.argv);
  const m = loadMap(mapPath);
  if (!cmd || cmd === 'help') {
    console.log(`scripts/geo.js — 地图查询与可视化（数据源：${mapPath}）\n\n命令：\n  summary\n  path <A> <B> [pace]\n  neighbors <A>\n  reach <A> <N天> [pace]\n  claims\n  render [ascii|html]\n  help\n\npace: foot(默认) | horse | wagon`);
    return;
  }
  if (cmd === 'summary') return console.log(cmdSummary(m));
  if (cmd === 'path') {
    const pace = args[2] || 'foot';
    return console.log(cmdPath(m, args[0], args[1], pace));
  }
  if (cmd === 'neighbors') return console.log(cmdNeighbors(m, args[0], args[1] || 'foot'));
  if (cmd === 'reach') {
    const days = parseFloat(args[1]);
    if (!Number.isFinite(days)) return console.log('用法：reach <A> <N天> [pace]');
    return console.log(cmdReach(m, args[0], days, args[2] || 'foot'));
  }
  if (cmd === 'claims') return console.log(cmdClaims(m));
  if (cmd === 'render') {
    const fmt = args[0] || 'ascii';
    if (fmt === 'html') {
      const outPath = path.join(path.dirname(mapPath), 'map.html');
      return console.log(renderHtml(m, outPath));
    }
    return console.log(renderAscii(m));
  }
  console.log(`未知命令：${cmd}（node scripts/geo.js help 查看帮助）`);
}

main();
