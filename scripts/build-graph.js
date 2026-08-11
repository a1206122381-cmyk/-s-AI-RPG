#!/usr/bin/env node
// build-graph.js — 从 memory.json 生成自包含 HTML 关系图
//
// 用法:  node scripts/build-graph.js [输出文件]
//        默认输出 graph.html 到项目根目录。
// 退出码: 0 = 成功; 1 = memory.json 缺失或为空
//
// 只读 memory.json（JSONL 逐行解析，不做整文件 JSON.parse，遵 save-protocol §4），
// 生成一个自包含 HTML（内联 CSS/JS/SVG，无外部依赖、可离线打开）。
// 力导向布局在浏览器端运行；Node 端只做读取与拼接，不吃内存。
//
// 配合 edgeone-pages：生成后可用 deploy_html 部署为可访问网页（里程碑时，非每轮必做）。
// 与 check-memory.js 配套：check-memory 查健康，build-graph 出可视化。

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MEM_PATH = path.join(ROOT, 'memory.json');
const OUT_DEFAULT = path.join(ROOT, 'graph.html');
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : OUT_DEFAULT;

if (!fs.existsSync(MEM_PATH)) {
  console.error('✗ memory.json 不存在:', MEM_PATH);
  process.exit(1);
}

// 逐行解析 JSONL（禁止整文件 JSON.parse，见 save-protocol §4）
const raw = fs.readFileSync(MEM_PATH, 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim());
const entities = [], relations = [];
let bad = 0;
for (const [i, l] of lines.entries()) {
  let o;
  try { o = JSON.parse(l); } catch (e) { bad++; console.error('  ⚠ 第 ' + (i + 1) + ' 行解析失败，跳过: ' + e.message); continue; }
  if (o.type === 'entity') entities.push({ name: o.name, entityType: o.entityType || '其他', obs: (o.observations || []).length });
  else if (o.type === 'relation') relations.push({ from: o.from, to: o.to, label: o.relationType || '' });
}

if (entities.length === 0) { console.error('✗ memory.json 无实体，图谱为空'); process.exit(1); }

// 实体类型 → 颜色（未知类型回退灰）
const PALETTE = {
  '人物': '#e07a5f', '角色': '#e07a5f', 'NPC': '#e07a5f',
  '地点': '#81b29a', '位置': '#81b29a', '城镇': '#81b29a',
  '势力': '#f2cc8f', '组织': '#f2cc8f', '国家': '#f2cc8f',
  '物品': '#3d5a80', '道具': '#3d5a80',
  '委托': '#9d4edd', '任务': '#9d4edd',
  '调查线': '#c9184a', '线索': '#c9184a',
  '其他': '#888888',
};

// 嵌入 <script> 前转义 <，防 </script> 注入
const safe = (s) => s.replace(/</g, '\\u003c');
const data = safe(JSON.stringify({ entities, relations }));
const paletteJson = safe(JSON.stringify(PALETTE));

// 浏览器端力导向布局（纯 JS，无外部依赖；无反引号/无 ${}，便于内联进 Node 模板字面量）
const browserJS = [
'(function(){',
'  var entities = DATA.entities, relations = DATA.relations;',
'  var W = 1200, H = 800;',
'  var svg = document.getElementById("svg");',
'  var edgeLayer = document.getElementById("edges");',
'  var nodeLayer = document.getElementById("nodes");',
'  var NS = "http://www.w3.org/2000/svg";',
'  function el(t){ return document.createElementNS(NS, t); }',
'  function toSvg(cx, cy){ var p = svg.createSVGPoint(); p.x = cx; p.y = cy; return p.matrixTransform(svg.getScreenCTM().inverse()); }',
'  // 初始位置：圆环',
'  var nodes = entities.map(function(e, i){',
'    var ang = (i / entities.length) * Math.PI * 2;',
'    return { name: e.name, type: e.entityType, obs: e.obs,',
'      x: W/2 + Math.cos(ang)*260 + (Math.random()-0.5)*40,',
'      y: H/2 + Math.sin(ang)*260 + (Math.random()-0.5)*40, vx:0, vy:0 };',
'  });',
'  var idx = {}; nodes.forEach(function(n,i){ idx[n.name] = i; });',
'  var edges = relations.filter(function(r){ return idx[r.from]!=null && idx[r.to]!=null; })',
'    .map(function(r){ return { s: idx[r.from], t: idx[r.to], label: r.label }; });',
'  // 节点元素',
'  nodes.forEach(function(n){',
'    var g = el("g");',
'    var r = 8 + Math.min(18, n.obs * 1.5);',
'    var c = el("circle"); c.setAttribute("r", r);',
'    c.setAttribute("fill", PALETTE[n.type] || PALETTE["其他"]);',
'    c.setAttribute("stroke", "#222"); c.setAttribute("stroke-width", "1");',
'    var t = el("text"); t.textContent = n.name; t.setAttribute("font-size", "11");',
'    t.setAttribute("dx", "12"); t.setAttribute("dy", "4");',
'    g.appendChild(c); g.appendChild(t); nodeLayer.appendChild(g);',
'    var drag = false;',
'    g.addEventListener("mousedown", function(e){ drag = true; e.preventDefault(); });',
'    window.addEventListener("mousemove", function(e){ if(!drag) return; var p = toSvg(e.clientX, e.clientY); n.x = p.x; n.y = p.y; n.vx = 0; n.vy = 0; });',
'    window.addEventListener("mouseup", function(){ drag = false; });',
'    n._el = g; n._r = r;',
'  });',
'  var edgeEls = edges.map(function(){ var ln = el("line"); ln.setAttribute("stroke", "#7a7a9c"); ln.setAttribute("stroke-width", "1"); edgeLayer.appendChild(ln); return ln; });',
'  // 力导向',
'  var REP = 7000, SPRING = 0.02, L = 95, CENTER = 0.0006, DAMP = 0.86;',
'  function step(){',
'    for(var i=0;i<nodes.length;i++) for(var j=i+1;j<nodes.length;j++){',
'      var a=nodes[i], b=nodes[j]; var dx=b.x-a.x, dy=b.y-a.y; var d2=dx*dx+dy*dy+0.01; var d=Math.sqrt(d2);',
'      var f=REP/d2; var fx=dx/d*f, fy=dy/d*f; a.vx-=fx; a.vy-=fy; b.vx+=fx; b.vy+=fy;',
'    }',
'    for(var k=0;k<edges.length;k++){',
'      var a=nodes[edges[k].s], b=nodes[edges[k].t]; var dx=b.x-a.x, dy=b.y-a.y; var d=Math.sqrt(dx*dx+dy*dy)+0.01;',
'      var f=(d-L)*SPRING; var fx=dx/d*f, fy=dy/d*f; a.vx+=fx; a.vy+=fy; b.vx-=fx; b.vy-=fy;',
'    }',
'    for(var i=0;i<nodes.length;i++){ var n=nodes[i];',
'      n.vx += (W/2 - n.x)*CENTER; n.vy += (H/2 - n.y)*CENTER;',
'      n.vx*=DAMP; n.vy*=DAMP; n.x+=n.vx; n.y+=n.vy;',
'      if(n.x<n._r) n.x=n._r; if(n.x>W-n._r) n.x=W-n._r; if(n.y<n._r) n.y=n._r; if(n.y>H-n._r) n.y=H-n._r;',
'    }',
'    for(var i=0;i<nodes.length;i++){ nodes[i]._el.setAttribute("transform", "translate("+nodes[i].x.toFixed(1)+","+nodes[i].y.toFixed(1)+")"); }',
'    for(var k=0;k<edges.length;k++){ var a=nodes[edges[k].s], b=nodes[edges[k].t];',
'      edgeEls[k].setAttribute("x1",a.x.toFixed(1)); edgeEls[k].setAttribute("y1",a.y.toFixed(1));',
'      edgeEls[k].setAttribute("x2",b.x.toFixed(1)); edgeEls[k].setAttribute("y2",b.y.toFixed(1)); }',
'    requestAnimationFrame(step);',
'  }',
'  step();',
'})();'
].join('\n');

const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>memory 关系图</title>
<style>
  body { margin:0; background:#1a1a2e; color:#eee; font-family: system-ui, sans-serif; }
  svg { width:100vw; height:100vh; display:block; }
  .bar { position:fixed; top:8px; left:8px; background:rgba(0,0,0,.55); padding:6px 10px; border-radius:6px; font-size:12px; }
  .bar b { color:#f2cc8f; }
  text { fill:#e8e8f0; pointer-events:none; }
  line { pointer-events:none; }
  circle { cursor:grab; }
  circle:active { cursor:grabbing; }
</style>
</head>
<body>
<div class="bar">memory 关系图 · <b>${entities.length}</b> 实体 / <b>${relations.length}</b> 关系 · 拖拽节点重排</div>
<svg id="svg" viewBox="0 0 1200 800">
  <g id="edges"></g>
  <g id="nodes"></g>
</svg>
<script>
const DATA = ${data};
const PALETTE = ${paletteJson};
</script>
<script>
${browserJS}
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, html, 'utf8');

console.log('=== build-graph 完成 ===');
console.log('  实体 ' + entities.length + ' | 关系 ' + relations.length + ' | 坏行 ' + bad);
console.log('  ✓ 输出: ' + OUT);
console.log('  打开方式: 直接双击, 或 deploy_html 部署为网页。');
process.exit(0);
