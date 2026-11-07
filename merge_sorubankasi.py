import json
from pathlib import Path

BASE = Path(__file__).parent
UNIQUE = BASE / "data" / "sorubankasi_unique.json"
EXPLAIN_OUT = BASE / "data" / "sorubankasi_explain_out"
EXPLAIN_IN = BASE / "data" / "sorubankasi_explain_in"
EXTRA = BASE / "data" / "extra_questions.json"

unique = json.loads(UNIQUE.read_text(encoding="utf-8"))
existing = json.loads(EXTRA.read_text(encoding="utf-8")) if EXTRA.exists() else {}

# group unique questions by (course, unit_index) preserving order, matching how
# sorubankasi_explain_in/out files were split
by_unit = {}
for course_id, qs in unique.items():
    for q in qs:
        by_unit.setdefault((course_id, q["unit_index"]), []).append(q)

added_counts = {}
problems = []

for (course_id, unit_idx), qs in sorted(by_unit.items()):
    in_file = EXPLAIN_IN / f"{course_id}_unit{unit_idx}.json"
    out_file = EXPLAIN_OUT / f"{course_id}_unit{unit_idx}.json"
    in_data = json.loads(in_file.read_text(encoding="utf-8"))
    out_data = json.loads(out_file.read_text(encoding="utf-8"))
    in_qs = in_data["questions"]
    out_qs = out_data["questions"]
    if len(in_qs) != len(qs) or len(out_qs) != len(qs):
        problems.append(
            f"{course_id} unit{unit_idx}: count mismatch unique={len(qs)} in={len(in_qs)} out={len(out_qs)}"
        )
        continue

    existing.setdefault(course_id, [])
    start_id = len(existing[course_id])
    for i, (uq, oq) in enumerate(zip(qs, out_qs)):
        if uq["question"] != oq["question"]:
            print(f"NOTE (minor text diff, using explain_out version): {course_id} unit{unit_idx} q{i}")
        new_q = {
            "id": f"extra{start_id + i + 1}",
            "question": oq["question"],
            "options": oq["options"],
            "correctIndex": oq["correctIndex"],
            "explanation": oq["explanation"],
            "optionNotes": oq["optionNotes"],
        }
        assert len(new_q["options"]) == 5
        assert len(new_q["optionNotes"]) == 5
        assert 0 <= new_q["correctIndex"] <= 4
        existing[course_id].append(new_q)
    added_counts[course_id] = added_counts.get(course_id, 0) + len(qs)

if problems:
    print("PROBLEMS:")
    for p in problems:
        print(" -", p)
    raise SystemExit(1)

EXTRA.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")

print("Added per course:")
total_added = 0
for cid, n in added_counts.items():
    print(f"  {cid}: +{n} (total now {len(existing[cid])})")
    total_added += n
print(f"\nTotal added: {total_added}")
print(f"Grand total extra questions now: {sum(len(v) for v in existing.values())}")
print(f"Written: {EXTRA}")
