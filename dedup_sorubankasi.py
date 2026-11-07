import json
import re
from difflib import SequenceMatcher
from pathlib import Path

BASE = Path(__file__).parent
RAW = BASE / "data" / "raw"
RAW2 = BASE / "data" / "raw2"
EXTRA = BASE / "data" / "extra_questions.json"
OUT_DIR = BASE / "data" / "sorubankasi_out"
OUT = BASE / "data" / "sorubankasi_unique.json"

COURSES = {
    "havb1": {"raw_dir": RAW, "prefix": "", "count": 8},
    "psiko1": {"raw_dir": RAW2, "prefix": "psiko_", "count": 5},
    "saglik1": {"raw_dir": RAW2, "prefix": "saglik_", "count": 5},
    "yonetim1": {"raw_dir": RAW2, "prefix": "yonetim_", "count": 5},
    "ogrenme1": {"raw_dir": RAW2, "prefix": "ogrenme_", "count": 6},
}

UNIT_COUNTS = {"havb1": 8, "psiko1": 5, "saglik1": 5, "yonetim1": 5, "ogrenme1": 6}


def norm(s):
    s = s.lower()
    s = re.sub(r"[^\wçğıöşü]+", " ", s, flags=re.UNICODE)
    s = " ".join(s.split())
    return s


SIM_THRESHOLD = 0.85


def is_near_duplicate(candidate_norm, existing_norms_list):
    for en in existing_norms_list:
        if abs(len(candidate_norm) - len(en)) / max(len(candidate_norm), len(en), 1) > 0.3:
            continue
        ratio = SequenceMatcher(None, candidate_norm, en).ratio()
        if ratio >= SIM_THRESHOLD:
            return True
    return False


extra_questions = json.loads(EXTRA.read_text(encoding="utf-8")) if EXTRA.exists() else {}

summary = {}
unique_out = {}

for course_id, cfg in COURSES.items():
    existing_norms = []
    # existing hand-built unit questions
    for i in range(1, cfg["count"] + 1):
        fname = f"{cfg['prefix']}unit{i}.json"
        data = json.loads((cfg["raw_dir"] / fname).read_text(encoding="utf-8"))
        for q in data["questions"]:
            existing_norms.append(norm(q["question"]))
    # existing extra (web-sourced) questions already merged
    for q in extra_questions.get(course_id, []):
        existing_norms.append(norm(q["question"]))

    accepted_norms = []
    accepted = []
    raw_total = 0
    dup_existing = 0
    dup_within_bank = 0
    bad_shape = 0

    for unit_idx in range(1, UNIT_COUNTS[course_id] + 1):
        f = OUT_DIR / f"{course_id}_unit{unit_idx}.json"
        if not f.exists():
            print(f"MISSING OUTPUT: {f}")
            continue
        data = json.loads(f.read_text(encoding="utf-8"))
        qs = data["questions"]
        if len(qs) != 30:
            print(f"WARNING {f.name}: expected 30 questions, got {len(qs)}")
        for q in qs:
            raw_total += 1
            if len(q.get("options", [])) != 5 or not (0 <= q.get("correctIndex", -1) <= 4):
                bad_shape += 1
                print(f"  BAD SHAPE {f.name} testNum={q.get('testNum')} num={q.get('num')}: {q}")
                continue
            key = norm(q["question"])
            if is_near_duplicate(key, existing_norms):
                dup_existing += 1
                continue
            if is_near_duplicate(key, accepted_norms):
                dup_within_bank += 1
                continue
            accepted_norms.append(key)
            accepted.append(
                {
                    "question": q["question"],
                    "options": q["options"],
                    "correctIndex": q["correctIndex"],
                    "unit_index": data.get("unit_index", unit_idx),
                    "topic": data.get("topic", ""),
                    "source_test": q.get("testNum"),
                    "source_num": q.get("num"),
                }
            )

    unique_out[course_id] = accepted
    summary[course_id] = {
        "raw_total": raw_total,
        "bad_shape": bad_shape,
        "dup_existing": dup_existing,
        "dup_within_bank": dup_within_bank,
        "new_unique": len(accepted),
    }

OUT.write_text(json.dumps(unique_out, ensure_ascii=False, indent=2), encoding="utf-8")

print("\nSummary per course:")
for cid, s in summary.items():
    print(
        f"  {cid}: raw={s['raw_total']} bad_shape={s['bad_shape']} "
        f"dup_existing={s['dup_existing']} dup_within_bank={s['dup_within_bank']} -> NEW={s['new_unique']}"
    )
print(f"\nTotal new unique questions: {sum(s['new_unique'] for s in summary.values())}")
print(f"Written: {OUT}")
