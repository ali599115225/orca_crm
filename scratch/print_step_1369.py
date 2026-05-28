# scratch/print_step_1369.py
import json

log_path = r"C:\Users\ali59\.gemini\antigravity\brain\0f2ebdc4-84f6-4b88-ae72-acb3a2a15542\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    try:
        data = json.loads(line)
        if data.get("step_index") == 1369:
            print(f"=== Step 1369 (Line {idx}) ===")
            print("Source:", data.get("source"))
            print("Type:", data.get("type"))
            print("Content (first 500):", data.get("content", "")[:500])
            print("Content (last 500):", data.get("content", "")[-500:])
    except Exception as e:
         pass
