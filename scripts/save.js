#!/usr/bin/env node
// save.js · 半自动存档助手（save-protocol 半自动化）
// 用法：
//   node scripts/save.js "简述"
//   node scripts/save.js "简述" --skip-verify   （跳过存档校验）
// 行为：
//   1. 先跑 save-verify.js 校验关键文件完整性（默认）
//   2. git add -A
//   3. git commit -m "简述"
//   4. 跑 git log --oneline -3，强制出真实哈希
//   5. 校验"确实产生新提交"（哈希与上次不同）
// 任一步失败即退出报错，绝不假装成功。
// 半自动：chronicle 摘要与 memory 更新仍由 GM 人工判断写入，本脚本只负责"存得牢+出哈希"。

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = process.cwd();
const msg = process.argv[2] || '存档';
const skipVerify = process.argv.includes('--skip-verify');
const scriptDir = __dirname;

function run(cmd, { ok = true } = {}) {
  try {
    return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    const out = (e.stdout || '') + (e.stderr || '');
    if (ok) throw new Error(out.trim() || e.message);
    return out;
  }
}

console.log('════ 半自动存档 ════');

// 0. 前置：必须是 git 仓库
try { run('git rev-parse --is-inside-work-tree'); }
catch { console.error('存档失败: 当前目录不是 git 仓库: ' + root); process.exit(1); }

// 记录存档前的最新提交
let beforeHash = '';
try { beforeHash = run('git rev-parse HEAD').trim(); } catch { beforeHash = ''; }

// 1. 存档完整性校验（可选）
if (!skipVerify) {
  console.log('\n[1] 存档完整性校验');
  const { spawnSync } = require('child_process');
  const verifyScript = path.join(scriptDir, 'save-verify.js');
  const res = spawnSync(process.execPath, [verifyScript, root], { encoding: 'utf8' });
  if (res.stdout) console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);
  if (res.status !== 0) {
    console.error('存档失败: save-verify 发现问题，见上方输出。');
    console.error('  若要强制存档跳过校验，加 --skip-verify');
    process.exit(1);
  }
}

// 2. git add
console.log('\n[2] git add -A');
run('git add -A');
console.log('  ✓ staged');

// 3. git commit（无改动时温和提示，不抛错）
console.log('\n[3] git commit');
let commitOut = '';
try {
  commitOut = run(`git commit -m ${JSON.stringify(msg)}`);
} catch (e) {
  const msg2 = e.message;
  if (/nothing to commit|no changes added/i.test(msg2)) {
    console.log('  [提示] 无改动可提交（工作区干净）。本轮无文件变更，存档完成（文件已一致）。');
    // 仍出哈希供确认
    console.log('\n[4] git log --oneline -3（真实输出）');
    const logOut = run('git log --oneline -3');
    console.log(logOut.trim().split('\n').map(l => '  ' + l).join('\n'));
    const hash = logOut.trim().split('\n')[0];
    console.log('\n=== 存档哈希 ===');
    console.log(hash);
    process.exit(0);
  } else {
    console.error('存档失败: git commit 出错：');
    console.error(msg2);
    process.exit(1);
  }
}
console.log(commitOut.trim().split('\n').map(l => '  ' + l).join('\n'));

// 4. 强制出哈希（git log -3）
console.log('\n[4] git log --oneline -3（真实输出）');
const logOut = run('git log --oneline -3');
console.log(logOut.trim().split('\n').map(l => '  ' + l).join('\n'));

// 5. 验证确实产生新提交
let afterHash = run('git rev-parse HEAD').trim();
if (beforeHash && afterHash === beforeHash) {
  console.log('\n[警告] 提交哈希未变化——可能无改动可提交（工作区干净）。');
  console.log('  若这是预期（本轮无文件改动），可忽略；否则检查 git status。');
} else {
  const newCommit = logOut.trim().split('\n')[0];
  console.log(`\n✓ 存档成功，新提交: ${newCommit.split(' ')[0]}`);
}

// 6. 回显哈希（铁律2：必须看见真实哈希）
const hashLine = logOut.trim().split('\n')[0];
if (!hashLine || !/^[0-9a-f]{7,}/.test(hashLine)) {
  console.error('\n存档失败: 无法从 git log 获得哈希。');
  process.exit(1);
}
console.log('\n=== 存档哈希 ===');
console.log(hashLine);
