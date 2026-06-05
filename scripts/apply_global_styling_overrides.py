import os
import re

target_dirs = [
    r"c:\Users\ali59\Desktop\REDC\app",
    r"c:\Users\ali59\Desktop\REDC\components"
]

extensions = (".ts", ".tsx", ".css")

# Detailed replacement mappings
replacements = {
    # 1. Old orange/terracotta colors and hexes
    "text-orange-500": "text-[#8EB1D1]",
    "text-red-400": "text-[#A7C7E7]",
    "bg-orange-500": "bg-[#8EB1D1]",
    "bg-orange-100": "bg-[#8EB1D1]/10",
    "bg-orange-50": "bg-[#8EB1D1]/5",
    "border-orange-500": "border-[#8EB1D1]",
    "focus:ring-orange-500": "focus:ring-[#8EB1D1]",
    "#df7b62": "#8EB1D1",
    "df7b62": "8EB1D1",
    "#c5654e": "#A7C7E7",
    "c5654e": "A7C7E7",
    
    # 2. Typography for Title and Large numbers: text-[#E8ECEF] font-bold
    "text-slate-900": "text-[#E8ECEF] font-bold",
    "text-slate-800": "text-[#E8ECEF] font-bold",
    "text-gray-900": "text-[#E8ECEF] font-bold",
    "text-gray-800": "text-[#E8ECEF] font-bold",
    
    # 3. Typography for Field Labels & Secondary Text: text-[#C4D8E5] font-medium
    "text-slate-400": "text-[#C4D8E5] font-medium",
    "text-slate-500": "text-[#C4D8E5] font-medium",
    "text-slate-600": "text-[#C4D8E5] font-medium",
    "text-slate-550": "text-[#C4D8E5] font-medium",
    "text-slate-650": "text-[#C4D8E5] font-medium",
    "text-slate-655": "text-[#C4D8E5] font-medium",
    "text-slate-350": "text-[#C4D8E5] font-medium",
    "text-gray-400": "text-[#C4D8E5] font-medium",
    "text-gray-550": "text-[#C4D8E5] font-medium",
    "text-gray-500": "text-[#C4D8E5] font-medium",
    
    # 4. Inputs & Cards backgrounds bg-[#1C2B48] and borders border-[#A7C7E7]/20
    "bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800": "bg-[#1C2B48] border border-[#A7C7E7]/20",
    "bg-white dark:bg-[#151f32] border border-slate-200 dark:border-slate-800/80": "bg-[#1C2B48] border border-[#A7C7E7]/20",
    "bg-white dark:bg-[#151f32] border border-slate-250 dark:border-slate-800": "bg-[#1C2B48] border border-[#A7C7E7]/20",
    "bg-slate-50 dark:bg-[#0b1120]/50 border border-slate-200/60 dark:border-slate-850": "bg-[#1C2B48] border border-[#A7C7E7]/20",
}

for target_dir in target_dirs:
    print(f"Scanning directory: {target_dir}")
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            if file.endswith(extensions):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    new_content = content
                    for old, new in replacements.items():
                        new_content = new_content.replace(old, new)
                    
                    if content != new_content:
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                        print(f"Updated styling overrides in: {file_path}")
                except Exception as e:
                    print(f"Failed to process {file_path}: {e}")

print("Style override scan complete.")
