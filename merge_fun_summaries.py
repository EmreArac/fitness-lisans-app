import json
from pathlib import Path

BASE = Path(__file__).parent
OUT_DIR = BASE / "data" / "summary_fun_out"

FILES = [BASE / "data" / "raw" / f"unit{i}.json" for i in range(1, 9)]
for prefix, n in [("psiko_", 5), ("saglik_", 5), ("yonetim_", 5), ("ogrenme_", 6)]:
    FILES += [BASE / "data" / "raw2" / f"{prefix}unit{i}.json" for i in range(1, n + 1)]

problems = []
updated = 0

for f in FILES:
    out_f = OUT_DIR / f.name
    if not out_f.exists():
        problems.append(f"MISSING OUTPUT: {out_f.name}")
        continue
    try:
        orig = json.loads(f.read_text(encoding="utf-8"))
        fun = json.loads(out_f.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        problems.append(f"INVALID JSON {out_f.name}: {e}")
        continue

    new_summary = fun.get("summary")
    if not new_summary or not isinstance(new_summary, list):
        problems.append(f"BAD summary shape in {out_f.name}")
        continue

    bad = False
    for block in new_summary:
        if "heading" not in block or not block["heading"].strip():
            problems.append(f"{out_f.name}: block missing heading")
            bad = True
        bullets = block.get("bullets")
        if not bullets or not isinstance(bullets, list) or len(bullets) < 2:
            problems.append(f"{out_f.name}: block '{block.get('heading')}' has too few bullets")
            bad = True
    if bad:
        continue

    orig_headings = len(orig.get("summary", []))
    new_headings = len(new_summary)
    if new_headings < orig_headings:
        problems.append(
            f"NOTE {f.name}: heading count dropped {orig_headings} -> {new_headings} (not necessarily wrong, just flagging)"
        )

    orig["summary"] = new_summary
    f.write_text(json.dumps(orig, ensure_ascii=False, indent=2), encoding="utf-8")
    updated += 1

print(f"Updated {updated}/{len(FILES)} files")
print(f"Problems: {len(problems)}")
for p in problems:
    print(" -", p)
