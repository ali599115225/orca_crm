import os
import re

ROOT_DIR = r"c:\Users\ali59\Desktop\REDC"
TARGET_DIRS = [
    os.path.join(ROOT_DIR, "app"),
    os.path.join(ROOT_DIR, "components")
]

# Patterns for font-family replacement
FONT_REPLACEMENTS = [
    # Style tag string formats
    (re.compile(r"font-family:\s*['\"]Cairo['\"],\s*['\"]Inter['\"],\s*sans-serif\s*!important\s*;"), "font-family: 'Calibri', 'Segoe UI', sans-serif !important;"),
    (re.compile(r"font-family:\s*['\"]Cairo['\"],\s*['\"]Inter['\"],\s*sans-serif\s*;"), "font-family: 'Calibri', 'Segoe UI', sans-serif;"),
    (re.compile(r"font-family:\s*['\"]Cairo['\"],\s*sans-serif\s*;"), "font-family: 'Calibri', 'Segoe UI', sans-serif;"),
    
    # Inline style formats
    (re.compile(r"fontFamily:\s*['\"]'Cairo',\s*'Inter',\s*sans-serif['\"]"), "fontFamily: \"'Calibri', 'Segoe UI', sans-serif\""),
    (re.compile(r"fontFamily:\s*['\"]'Cairo',\s*'Inter',\s*system-ui,\s*sans-serif['\"]"), "fontFamily: \"'Calibri', 'Segoe UI', sans-serif\""),
    (re.compile(r"fontFamily:\s*['\"]Calibri,\s*'Cairo',\s*sans-serif['\"]"), "fontFamily: \"'Calibri', 'Segoe UI', sans-serif\""),
    (re.compile(r"fontFamily:\s*['\"]'Cairo',\s*'Inter',\s*Arial,\s*sans-serif['\"]"), "fontFamily: \"'Calibri', 'Segoe UI', sans-serif\""),
    (re.compile(r"fontFamily:\s*['\"]'Cairo','Inter',sans-serif['\"]"), "fontFamily: \"'Calibri', 'Segoe UI', sans-serif\""),
]

# Google fonts url import from Cairo
GOOGLE_FONT_IMPORT = re.compile(r"@import url\(['\"].*?family=Cairo.*?['\"]\);")

# Inline borderRadius changes (capping values > 8 to 6 or 8, except percentages/circle badges)
# We want to replace borderRadius: 12/14/16/18/20/24 with borderRadius: 8 (or 6)
BORDER_RADIUS_REPLACEMENTS = [
    (re.compile(r"\bborderRadius:\s*(10|12|14|16|18|20|24)\b"), "borderRadius: 8"),
    (re.compile(r"\bborderRadius:\s*['\"](10|12|14|16|18|20|24)px['\"]"), "borderRadius: '8px'"),
]

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    
    # Apply font family replacements
    for pattern, replacement in FONT_REPLACEMENTS:
        content = pattern.sub(replacement, content)
        
    # Remove google fonts Cairo/Inter import
    content = GOOGLE_FONT_IMPORT.sub("", content)
    
    # Apply inline border radius adjustments
    for pattern, replacement in BORDER_RADIUS_REPLACEMENTS:
        content = pattern.sub(replacement, content)
        
    # Replace any text style to make sure Calibri fallback to Segoe UI is clean
    content = content.replace("Calibri, 'Cairo', sans-serif", "'Calibri', 'Segoe UI', sans-serif")
    content = content.replace("'Cairo', 'Inter', sans-serif", "'Calibri', 'Segoe UI', sans-serif")
    content = content.replace("'Cairo', 'Inter', system-ui, sans-serif", "'Calibri', 'Segoe UI', sans-serif")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")
    else:
        # print(f"No changes: {filepath}")
        pass

def walk_and_clean():
    for target_dir in TARGET_DIRS:
        if not os.path.exists(target_dir):
            continue
        for root, dirs, files in os.walk(target_dir):
            for file in files:
                if file.endswith(('.tsx', '.ts', '.css', '.js')):
                    clean_file(os.path.join(root, file))

if __name__ == "__main__":
    walk_and_clean()
    print("Clean process finished.")
