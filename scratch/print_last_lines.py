# scratch/print_last_lines.py
log_path = r"C:\Users\ali59\.gemini\antigravity\brain\0f2ebdc4-84f6-4b88-ae72-acb3a2a15542\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
for idx in range(max(0, len(lines)-10), len(lines)):
    print(f"--- Line {idx} ---")
    print(lines[idx][:500])
