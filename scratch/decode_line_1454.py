# scratch/decode_line_1454.py
import json
import base64
import zlib
import re

log_path = r"C:\Users\ali59\.gemini\antigravity\brain\0f2ebdc4-84f6-4b88-ae72-acb3a2a15542\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

line_1454 = lines[1454]
data = json.loads(line_1454)
content = data.get("content", "")

# Search for the pako URL hash inside content
# Let's extract the hash starting after 'pako:' up to the end of the URL
pako_match = re.search(r'pako:([a-zA-Z0-9_\-\s]+)', content)
if pako_match:
    pako_hash = pako_match.group(1)
    # Remove any whitespaces and newlines
    clean_hash = pako_hash.strip().replace("\n", "").replace("\r", "").replace(" ", "")
    print("Clean hash length:", len(clean_hash))
    print("Clean hash starts with:", clean_hash[:30])
    print("Clean hash ends with:", clean_hash[-30:])
    
    # URL safe base64 decode
    base64_str = clean_hash.replace("-", "+").replace("_", "/")
    while len(base64_str) % 4 != 0:
        base64_str += "="
        
    try:
        decoded = base64.b64decode(base64_str)
        print("Decoded length:", len(decoded))
        
        # Try normal zlib
        try:
            decompressed = zlib.decompress(decoded)
            print("\nSUCCESS with zlib inflate!\n")
            print(decompressed.decode('utf-8'))
        except Exception as e_zlib:
            print("Zlib inflate failed:", e_zlib)
            try:
                decompressed = zlib.decompress(decoded, -zlib.MAX_WBITS)
                print("\nSUCCESS with raw inflate!\n")
                print(decompressed.decode('utf-8'))
            except Exception as e_raw:
                print("Raw inflate failed:", e_raw)
    except Exception as e:
        print("Base64 decode failed:", e)
else:
    print("Could not find pako hash in content!")
