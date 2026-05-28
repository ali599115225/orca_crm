# scratch/read_log_and_decode.py
import json
import base64
import zlib
import re

log_path = r"C:\Users\ali59\.gemini\antigravity\brain\0f2ebdc4-84f6-4b88-ae72-acb3a2a15542\.system_generated\logs\transcript.jsonl"

print("Reading log file...")
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines in log: {len(lines)}")

pako_pattern = re.compile(r'https://mermaid\.live\./view#pako:([a-zA-Z0-9_\-]+)')

matches = []
for idx, line in enumerate(lines):
    try:
        data = json.loads(line)
        content = data.get("content", "")
        if not content and "tool_calls" in data:
            content = json.dumps(data["tool_calls"])
        
        found = pako_pattern.findall(content)
        if found:
            for f_match in found:
                matches.append((idx, data.get("step_index", "?"), f_match))
    except Exception as e:
        found = pako_pattern.findall(line)
        if found:
            for f_match in found:
                matches.append((idx, "raw", f_match))

print(f"Found {len(matches)} matching pako strings in log:")
for i, (idx, step_idx, match) in enumerate(matches):
    print(f"\n--- Match {i} (Line {idx}, Step {step_idx}, length {len(match)}) ---")
    print(f"Starts with: {match[:30]}... ends with: ...{match[-30:]}")
    
    clean_str = match.replace("-", "+").replace("_", "/")
    while len(clean_str) % 4 != 0:
        clean_str += "="
        
    try:
        decoded = base64.b64decode(clean_str)
        print("Decoded bytes length:", len(decoded))
        
        try:
            decompressed = zlib.decompress(decoded, -zlib.MAX_WBITS)
            print("SUCCESS with raw inflate!")
            print(decompressed.decode('utf-8'))
        except Exception as e_raw:
            try:
                decompressed = zlib.decompress(decoded)
                print("SUCCESS with zlib inflate!")
                print(decompressed.decode('utf-8'))
            except Exception as e_zlib:
                print(f"FAILED. Raw error: {e_raw}, Zlib error: {e_zlib}")
    except Exception as e:
        print("Base64 decoding failed:", e)
