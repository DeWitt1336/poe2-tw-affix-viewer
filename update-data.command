#!/bin/sh
cd "$(dirname "$0")" || exit 1
python3 tools/update_data.py
status=$?
if [ "$status" -eq 0 ]; then
  echo ""
  echo "資料更新完成，可以重新開啟 index.html。"
fi
echo ""
printf "按 Enter 關閉…"
read -r _
exit "$status"
