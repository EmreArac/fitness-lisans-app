import json
import sys
from pathlib import Path

BASE = Path(__file__).parent
RAW = BASE / "data" / "raw"
RAW2 = BASE / "data" / "raw2"
OUT = BASE / "data" / "courses.js"


def load_units(folder, prefix, count):
    units = []
    for i in range(1, count + 1):
        f = folder / f"{prefix}unit{i}.json" if prefix else folder / f"unit{i}.json"
        if not f.exists():
            print(f"MISSING: {f}")
            sys.exit(1)
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"INVALID JSON in {f}: {e}")
            sys.exit(1)
        assert "title" in data and data["title"], f"{f.name}: missing title"
        assert "questions" in data and len(data["questions"]) > 0, f"{f.name}: no questions"
        for q in data["questions"]:
            assert len(q["options"]) == 5, f"{f.name} q{q.get('id')}: options != 5"
            assert 0 <= q["correctIndex"] <= 4, f"{f.name} q{q.get('id')}: bad correctIndex"
            assert len(q.get("optionNotes", [])) == 5, f"{f.name} q{q.get('id')}: optionNotes != 5"
        units.append(data)
        print(f"{f.name}: OK - {len(data['questions'])} questions, title='{data['title'][:50]}'")
    return units


havb1_units = load_units(RAW, "", 8)
psiko_units = load_units(RAW2, "psiko_", 5)
saglik_units = load_units(RAW2, "saglik_", 5)
yonetim_units = load_units(RAW2, "yonetim_", 5)
ogrenme_units = load_units(RAW2, "ogrenme_", 6)

all_units = havb1_units + psiko_units + saglik_units + yonetim_units + ogrenme_units
total_q = sum(len(u["questions"]) for u in all_units)
print(f"TOTAL questions across all courses: {total_q}")

courses = [
    {
        "id": "havb1",
        "order": 1,
        "title": "Hareket ve Antrenman Bilimleri I",
        "emoji": "\U0001F3CB️",
        "status": "active",
        "units": havb1_units,
    },
    {
        "id": "psiko1",
        "order": 2,
        "title": "Sporda Psikososyal Alanlar I",
        "emoji": "\U0001F9E0",
        "status": "active",
        "units": psiko_units,
    },
    {
        "id": "saglik1",
        "order": 3,
        "title": "Spor ve Sağlık Bilimleri I",
        "emoji": "\U0001FA7A",
        "status": "active",
        "units": saglik_units,
    },
    {
        "id": "yonetim1",
        "order": 4,
        "title": "Spor Yönetimi I",
        "emoji": "\U0001F4BC",
        "status": "active",
        "units": yonetim_units,
    },
    {
        "id": "ogrenme1",
        "order": 5,
        "title": "Sporda Öğrenme ve Öğretme I",
        "emoji": "\U0001F4D8",
        "status": "active",
        "units": ogrenme_units,
    },
]

js = "window.COURSES = " + json.dumps(courses, ensure_ascii=False, indent=2) + ";\n"
OUT.write_text(js, encoding="utf-8")
print(f"Written: {OUT}")
