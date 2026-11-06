import json
import re
import time
import urllib.request
from pathlib import Path

OUT_DIR = Path(r"C:\Users\Emre\AppData\Local\Temp\claude\8c1af07e0dd4604f\ad11ff7d-0939-4d29-9fd8-f9a9682bb631\scratchpad\webtests")
OUT_DIR.mkdir(parents=True, exist_ok=True)

TESTS = [
    (51, "Sporda Psikososyal Alanlar", 5),
    (50, "Spor Yönetimi", 5),
    (49, "Sporda Öğrenme ve Öğretme", 5),
    (48, "Hareket ve Antrenman Bilimleri", 8),
    (42, "Spor ve Sağlık Bilimleri", 5),
    (39, "Spor ve Sağlık Bilimleri", 4),
    (38, "Sporda Öğrenme ve Öğretme", 4),
    (37, "Sporda Öğrenme ve Öğretme", 3),
    (36, "Spor Yönetimi", 4),
    (35, "Spor Yönetimi", 3),
    (34, "Hareket ve Antrenman Bilimleri", 7),
    (33, "Hareket ve Antrenman Bilimleri", 6),
    (29, "Hareket ve Antrenman Bilimleri", 5),
    (25, "Spor ve Sağlık Bilimleri", 3),
    (24, "Hareket ve Antrenman Bilimleri", 4),
    (22, "Hareket ve Antrenman Bilimleri", 3),
    (19, "Sporda Psikososyal Alanlar", 4),
    (18, "Sporda Psikososyal Alanlar", 3),
    (15, "Hareket ve Antrenman Bilimleri", 2),
    (14, "Spor Yönetimi", 2),
    (13, "Spor ve Sağlık Bilimleri", 2),
    (12, "Sporda Psikososyal Alanlar", 2),
    (11, "Sporda Öğrenme ve Öğretme", 2),
    (8, "Sporda Psikososyal Alanlar", 1),
    (7, "Spor Yönetimi", 1),
    (6, "Spor ve Sağlık Bilimleri", 1),
    (5, "Hareket ve Antrenman Bilimleri", 1),
    (4, "Sporda Öğrenme ve Öğretme", 1),
]

COURSE_SLUG = {
    "Hareket ve Antrenman Bilimleri": "havb1",
    "Sporda Psikososyal Alanlar": "psiko1",
    "Spor ve Sağlık Bilimleri": "saglik1",
    "Spor Yönetimi": "yonetim1",
    "Sporda Öğrenme ve Öğretme": "ogrenme1",
}

Q_RE = re.compile(r'Soru (\d+)\s*<span class="text-sm[^"]*">\s*\(\d+ puan\)\s*</span>\s*</h3>\s*<p class="text-gray-700">(.*?)</p>', re.S)
OPT_RE = re.compile(r'<span class="flex-1 text-gray-800">(.*?)</span>', re.S)

def clean(s):
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("&amp;", "&").replace("&quot;", '"').replace("&#39;", "'").replace("&ouml;", "ö")
    return " ".join(s.split()).strip()

total_questions = 0
for test_id, course_name, test_num in TESTS:
    url = f"https://www.temelegitimsinavlari.com/test_coz.php?id={test_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        html = resp.read().decode("utf-8", errors="replace")

    q_matches = Q_RE.findall(html)
    all_opts = OPT_RE.findall(html)

    questions = []
    for i, (num, qtext) in enumerate(q_matches):
        opts = all_opts[i * 5:(i + 1) * 5]
        if len(opts) != 5:
            print(f"  WARNING test {test_id} q{num}: {len(opts)} options found, expected 5")
            continue
        questions.append({
            "num": int(num),
            "question": clean(qtext),
            "options": [clean(o) for o in opts],
        })

    slug = COURSE_SLUG[course_name]
    outpath = OUT_DIR / f"{slug}_webtest{test_num}.json"
    outpath.write_text(json.dumps({
        "sourceTestId": test_id,
        "course": course_name,
        "testNum": test_num,
        "questions": questions,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"test_id={test_id} {course_name} test-{test_num}: {len(questions)} questions -> {outpath.name}")
    total_questions += len(questions)
    time.sleep(0.5)

print(f"\nTOTAL: {total_questions} questions scraped across {len(TESTS)} tests")
