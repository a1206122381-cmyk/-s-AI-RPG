#!/usr/bin/env bash
# save.sh — 存档三合一助手（save-protocol 第 3 步）
# 用法: bash scripts/save.sh "提交消息"
# 行为: git add -A → git commit -m "消息" → git log --oneline -3
# 输出原样回显，满足铁律 2「必须看见真实 git 哈希」；任一步失败立即退出并报错。
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MSG="${1:-存档}"
cd "$ROOT" || { echo "存档失败: 无法进入仓库目录 $ROOT"; exit 1; }

echo "=== git add -A ==="
git add -A || { echo "存档失败: git add 出错，见上方输出"; exit 1; }

echo "=== git commit ==="
git commit -m "$MSG" || { echo "存档失败: git commit 出错（若为 no changes 说明无改动可存）"; exit 1; }

echo "=== git log --oneline -3 ==="
git log --oneline -3 || { echo "存档失败: git log 出错"; exit 1; }
