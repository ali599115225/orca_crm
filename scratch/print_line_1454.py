# scratch/print_line_1454.py
log_path = r"C:\Users\ali59\.gemini\antigravity\brain\0f2ebdc4-84f6-4b88-ae72-acb3a2a15542\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
line_1454 = lines[1454]
print("Length of line 1454:", len(line_1454))
print(line_1454[:2000])
print("...")
print(line_1454[-2000:])
