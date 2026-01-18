#!/usr/bin/env bash

LOG_FILE="/tmp/gemini-tools.log"
input=$(cat)

# Extract tool_name using node
tool_info=$(echo "$input" | node -e "
try {
    const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    console.log(input.tool_name);
} catch (e) {
    console.log('unknown');
}
")

echo "[$(date)] Tool executed: $tool_info" >> "$LOG_FILE"
echo "{}"
exit 0
