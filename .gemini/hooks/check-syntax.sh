#!/usr/bin/env bash

LOG_FILE="/tmp/gemini-hooks.log"
echo "[$(date)] Hook started" >> "$LOG_FILE"

# Read stdin to a variable
input=$(cat)
# echo "Input: $input" >> "$LOG_FILE"

# Extract file_path using node
file_path=$(echo "$input" | node -e "
try {
    const input = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    console.log(input.tool_input.file_path || '');
} catch (e) {
    console.log('');
}
")

echo "[$(date)] File path extracted: $file_path" >> "$LOG_FILE"

if [ -z "$file_path" ]; then
    echo "[$(date)] No file path found, exiting" >> "$LOG_FILE"
    echo "{}"
    exit 0
fi

# Check for .ts or .vue extension
if [[ "$file_path" == *".ts" || "$file_path" == *".vue" ]]; then
    echo "[$(date)] Checking syntax for $file_path" >> "$LOG_FILE"
    # Run eslint
    output=$(npx eslint --no-ignore "$file_path" 2>&1)
    status=$?
    echo "[$(date)] Eslint status: $status" >> "$LOG_FILE"

    if [ $status -ne 0 ]; then
        echo "[$(date)] Eslint failed for $file_path" >> "$LOG_FILE"
        # Construct JSON response with systemMessage using node to handle escaping
        node -e "
            const output = process.argv[1];
            const filePath = process.argv[2];
            // Truncate output if too long to avoid huge messages
            let cleanOutput = output;
            if (cleanOutput.length > 2000) {
                cleanOutput = cleanOutput.substring(0, 2000) + '... (truncated)';
            }
            const message = '❌ Eslint errors found in ' + filePath + ':\n' + cleanOutput;
            console.log(JSON.stringify({ systemMessage: message }));
        " "$output" "$file_path"
    else
        echo "[$(date)] Eslint passed for $file_path" >> "$LOG_FILE"
        echo "{}"
    fi
else
    echo "[$(date)] Ignoring file type for $file_path" >> "$LOG_FILE"
    echo "{}"
fi
echo "[$(date)] Hook finished" >> "$LOG_FILE"
exit 0