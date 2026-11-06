import json
import re
from difflib import SequenceMatcher
from pathlib import Path

BASE = Path(__file__).parent
RAW = BASE / "data" / "raw"
RAW2 = BASE / "data" / "raw2"
WEBRAW = BASE / "data" / "webraw"
OUT = BASE / "data" / "extra_questions.json"


def norm(s):
    s = s.lower()
    s = re.sub(r"[^\wçğıöşü]+", " ", s, flags=re.UNICODE)
    s = " ".join(s.split())
    return s


SIM_THRESHOLD = 0.85


def is_near_duplicate(candidate_norm, existing_norms_list):
    for en in existing_norms_list:
        if abs(len(candidate_norm) - len(en)) / max(len(candidate_norm), len(en), 1) > 0.3:
            continue  # quick length-based skip
        ratio = SequenceMatcher(None, candidate_norm, en).ratio()
        if ratio >= SIM_THRESHOLD:
            return True
    return False


COURSES = {
    "havb1": {"raw_dir": RAW, "prefix": "", "count": 8},
    "psiko1": {"raw_dir": RAW2, "prefix": "psiko_", "count": 5},
    "saglik1": {"raw_dir": RAW2, "prefix": "saglik_", "count": 5},
    "yonetim1": {"raw_dir": RAW2, "prefix": "yonetim_", "count": 5},
    "ogrenme1": {"raw_dir": RAW2, "prefix": "ogrenme_", "count": 6},
}

WEB_TEST_COUNTS = {"havb1": 8, "psiko1": 5, "saglik1": 5, "yonetim1": 5, "ogrenme1": 5}

summary = {}
all_extra = {}

for course_id, cfg in COURSES.items():
    existing_norms = []
    for i in range(1, cfg["count"] + 1):
        fname = f"{cfg['prefix']}unit{i}.json"
        data = json.loads((cfg["raw_dir"] / fname).read_text(encoding="utf-8"))
        for q in data["questions"]:
            existing_norms.append(norm(q["question"]))

    extra_list = []
    accepted_norms = []
    raw_total = 0
    dup_existing = 0
    dup_within_web = 0

    for t in range(1, WEB_TEST_COUNTS[course_id] + 1):
        fpath = WEBRAW / f"{course_id}_webtest{t}.json"
        data = json.loads(fpath.read_text(encoding="utf-8"))
        for q in data["questions"]:
            raw_total += 1
            key = norm(q["question"])
            if is_near_duplicate(key, existing_norms):
                dup_existing += 1
                continue
            if is_near_duplicate(key, accepted_norms):
                dup_within_web += 1
                continue
            accepted_norms.append(key)
            extra_list.append(q)

    # assign final unique ids
    for idx, q in enumerate(extra_list, start=1):
        q["id"] = f"extra{idx}"

    all_extra[course_id] = extra_list
    summary[course_id] = {
        "raw_total": raw_total,
        "dup_existing": dup_existing,
        "dup_within_web": dup_within_web,
        "new_unique": len(extra_list),
    }

OUT.write_text(json.dumps(all_extra, ensure_ascii=False, indent=2), encoding="utf-8")

print("Summary per course:")
for cid, s in summary.items():
    print(f"  {cid}: raw={s['raw_total']} dup_existing={s['dup_existing']} dup_within_web={s['dup_within_web']} -> NEW={s['new_unique']}")
print(f"\nTotal new unique questions: {sum(s['new_unique'] for s in summary.values())}")
print(f"Written: {OUT}")
