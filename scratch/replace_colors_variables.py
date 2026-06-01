import os
import re

ROOT_DIR = r"c:\Users\ali59\Desktop\REDC"
TARGET_DIRS = [
    os.path.join(ROOT_DIR, "components", "views"),
    os.path.join(ROOT_DIR, "app")
]

REPLACEMENTS = [
    # Active text colors
    (re.compile(r"isDark\s*\?\s*['\"]text-\[#E6C687\]['\"]\s*:\s*['\"]text-\[#735334\]['\"]"), " 'text-[var(--status-active)]' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]text-\[#E6C687\]['\"]\s*:\s*['\"]text-\[#735334\]['\"]"), " 'text-[var(--status-active)]' "),
    (re.compile(r"isDark\s*\?\s*['\"]text-\[#E6C687\]\s*border-slate-800['\"]\s*:\s*['\"]text-\[#735334\]\s*border-\[var\(--border-color\)\]['\"]"), " 'text-[var(--status-active)] border-[var(--border-color)]' "),
    (re.compile(r"isDark\s*\?\s*['\"]text-\[#E6C687\]\s*border-slate-850['\"]\s*:\s*['\"]text-\[#735334\]\s*border-\[var\(--border-color\)\]['\"]"), " 'text-[var(--status-active)] border-[var(--border-color)]' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]text-\[#E6C687\]\s*border-white/5['\"]\s*:\s*['\"]text-\[#735334\]\s*border-\[var\(--border-color\)\]['\"]"), " 'text-[var(--status-active)] border-[var(--border-color)]' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]text-\[#E6C687\]['\"]\s*:\s*['\"]text-\[#735334\]['\"]"), " 'text-[var(--status-active)]' "),
    
    # Active background colors & status badges
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-\[#E6C687\]/20\s*text-\[#E6C687\]['\"]\s*:\s*['\"]bg-\[#735334\]/20\s*text-\[#735334\]['\"]"), " 'bg-[var(--status-active)]/15 text-[var(--status-active)]' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-\[#E6C687\]\s*text-slate-950\s*hover:bg-\[#E6C687\]/90['\"]\s*:\s*['\"]bg-\[#735334\]\s*text-white\s*hover:bg-\[#735334\]/90['\"]"), " theme === 'dark' ? 'bg-[var(--status-active)] text-slate-950 hover:opacity-90' : 'bg-[var(--status-active)] text-white hover:opacity-90' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-\[#E6C687\]\s*text-slate-950['\"]\s*:\s*['\"]bg-\[#735334\]\s*text-white['\"]"), " theme === 'dark' ? 'bg-[var(--status-active)] text-slate-950' : 'bg-[var(--status-active)] text-white' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-gradient-to-r\s*from-\[#cd7f32\]\s*to-\[#E6C687\]['\"]\s*:\s*['\"]bg-\[#735334\]['\"]"), " 'bg-[var(--status-active)]' "),
    
    # Card / Inner Backgrounds replacements (#111726 is the old dark card/table background)
    # E.g. theme === 'dark' ? 'bg-[#111726]/60 border-[#cd7f32]/25 shadow-2xl' : 'bg-[var(--bg-card)] border-[#735334]/20 shadow-[0_8px_30px_rgba(0,0,0,0.035)]'
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-\[#111726\]/60\s*border-\[#cd7f32\]/25\s*shadow-2xl['\"]\s*:\s*['\"]bg-\[var\(--bg-card\)\]\s*border-\[#735334\]/20\s*shadow-\[0_8px_30px_rgba\(0,0,0,0.035\)\]['\"]"), " 'bg-[var(--bg-inner)] border-[var(--border-color)] shadow-sm' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-\[#111726\]/60\s*border-\[#cd7f32\]/20\s*hover:border-\[#cd7f32\]/40\s*shadow-\[0_0_20px_rgba\(205,127,50,0.02\)\]\s*text-white['\"]\s*:\s*['\"]bg-\[var\(--bg-card\)\]\s*border-transparent\s*shadow-\[0_8px_30px_rgba\(0,0,0,0.035\)\]\s*text-\[#735334\]['\"]"), " 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] shadow-sm' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-\[#111726\]/60\s*border-\[#cd7f32\]/35\s*hover:border-\[#cd7f32\]/50\s*shadow-\[0_0_25px_rgba\(205,127,50,0.06\)\]\s*text-white['\"]\s*:\s*['\"]bg-\[var\(--bg-card\)\]\s*border-transparent\s*shadow-\[0_8px_30px_rgba\(0,0,0,0.035\)\]\s*text-\[#735334\]['\"]"), " 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] shadow-sm' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-\[#111726\]/60\s*border-\[#cd7f32\]/25\s*shadow-2xl\s*hover:border-\[#cd7f32\]/50\s*text-white['\"]\s*:\s*['\"]bg-\[var\(--bg-card\)\]\s*border-\[var\(--border-color\)\]\s*hover:border-\[#735334\]/50\s*shadow-\[0_8px_30px_rgba\(0,0,0,0.02\)\]\s*text-\[var\(--text-primary\)\]['\"]"), " 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--status-active)]/50 text-[var(--text-primary)] shadow-sm' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-\[#111726\]/95\s*border-\[#cd7f32\]/25\s*text-white['\"]\s*:\s*['\"]bg-\[var\(--bg-card\)\]\s*border-\[#735334\]/20\s*text-\[#735334\]['\"]"), " 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] shadow-lg' "),
    
    # Generic #111726 backgrounds
    (re.compile(r"bg-\[#111726\]/40\s*border-white/5\s*shadow-inner"), "bg-[var(--bg-inner)] border-[var(--border-color)]/60 shadow-inner"),
    (re.compile(r"bg-\[#111726\]/40\s*border-white/5"), "bg-[var(--bg-inner)] border-[var(--border-color)]/60"),
    (re.compile(r"bg-\[#111726\]/60\s*border-\[#cd7f32\]/25"), "bg-[var(--bg-inner)] border-[var(--border-color)]"),
    (re.compile(r"bg-\[#111726\]/60\s*border-white/5\s*hover:border-\[#cd7f32\]/40"), "bg-[var(--bg-inner)] border-[var(--border-color)] hover:border-[var(--status-active)]/40"),
    (re.compile(r"bg-\[#111726\]/80\s*border-white/5"), "bg-[var(--bg-inner)] border-[var(--border-color)]"),
    
    # Active navigation highlights
    # isDark ? 'bg-[#735334]/20 text-[#E6C687] border-[#735334]/40 shadow-[0_0_15px_rgba(115,83,52,0.2)]' : 'bg-[#735334]/10 text-[#735334] border-[#735334]/20 shadow-sm'
    (re.compile(r"isDark\s*\?\s*['\"]bg-\[#735334\]/20\s*text-\[#E6C687\]\s*border-\[#735334\]/40\s*shadow-.*?['\"]\s*:\s*['\"]bg-\[#735334\]/10\s*text-\[#735334\]\s*border-\[#735334\]/20\s*shadow-.*?['\"]"), " 'bg-[var(--status-active)]/15 text-[var(--status-active)] border border-[var(--status-active)]/30 shadow-sm' "),
    
    # General border corrections
    (re.compile(r"border-white/5"), "border-[var(--border-color)]"),
    (re.compile(r"border-white/10"), "border-[var(--border-color)]"),
    (re.compile(r"border-slate-800"), "border-[var(--border-color)]"),
    (re.compile(r"border-slate-850"), "border-[var(--border-color)]"),
    
    # Inputs/Selects backgrounds
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-slate-900\s*border-white/10\s*text-white['\"]\s*:\s*['\"]bg-\[var\(--bg-card\)\]\s*border-\[var\(--border-color\)\]\s*text-\[var\(--text-primary\)\]['\"]"), " 'bg-[var(--bg-inner)] border-[var(--border-color)] text-[var(--text-primary)]' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-slate-900\s*border-white/10\s*text-white\s*text-end['\"]\s*:\s*['\"]bg-\[var\(--bg-card\)\]\s*border-\[var\(--border-color\)\]\s*text-\[var\(--text-primary\)\]\s*text-end['\"]"), " 'bg-[var(--bg-inner)] border-[var(--border-color)] text-[var(--text-primary)] text-end' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-slate-900\s*border-white/10\s*text-slate-850['\"]\s*:\s*['\"]bg-\[var\(--bg-card\)\]\s*border-\[var\(--border-color\)\]\s*text-slate-850['\"]"), " 'bg-[var(--bg-inner)] border-[var(--border-color)] text-[var(--text-primary)]' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-slate-900\s*border-white/10\s*text-white['\"]\s*:\s*['\"]bg-\[var\(--bg-card\)\]\s*border-\[var\(--border-color\)\]\s*text-slate-850['\"]"), " 'bg-[var(--bg-inner)] border-[var(--border-color)] text-[var(--text-primary)]' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-slate-900\s*border-white/10\s*text-\[#E6C687\]['\"]\s*:\s*['\"]bg-\[var\(--bg-card\)\]\s*border-\[var\(--border-color\)\]\s*text-\[#735334\]['\"]"), " 'bg-[var(--bg-inner)] border-[var(--border-color)] text-[var(--status-active)]' "),
    
    # Table headers
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-slate-955?/40\s*text-slate-300['\"]\s*:\s*['\"]bg-\[var\(--bg-sidebar\)\]\s*text-slate-650['\"]"), " 'bg-[var(--bg-sidebar)] text-[var(--text-primary)]' "),
    (re.compile(r"theme\s*===\s*['\"]dark['\"]\s*\?\s*['\"]bg-slate-950/40\s*text-slate-300['\"]\s*:\s*['\"]bg-\[var\(--bg-sidebar\)\]\s*text-slate-650['\"]"), " 'bg-[var(--bg-sidebar)] text-[var(--text-primary)]' "),
    
    # Simple colors
    (re.compile(r"#E6C687"), "var(--status-active)"),
    (re.compile(r"#735334"), "var(--status-active)"),
]

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    
    # Apply standard patterns
    for pattern, replacement in REPLACEMENTS:
        content = pattern.sub(replacement, content)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated style in: {filepath}")

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
    print("Color replacement finished.")
