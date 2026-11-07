import json
import re
from pathlib import Path

BASE = Path(__file__).parent
RAW_TXT = BASE / "scratchpad_sorubankasi_raw.txt"
OUT = BASE / "data" / "sorubankasi_parsed.json"

COURSE_HEADERS = {
    "SPOR VE SAĞLIK": "saglik1",
    "SPOR YÖNETIMI": "yonetim1",
    "HAREKET VE ANTRENMAN BILIMLERI": "havb1",
    "SPORDA PSIKOSOSYAL ALANLAR": "psiko1",
    "SPORDA ÖĞRENME VE ÖĞRETME": "ogrenme1",
}

NOISE_EXACT = {
    "1. KADEME TEMEL EĞİTİM SINAVI",
    "PDF SORU BANKASI – 870 SORU",
    "TÜM HAKLARI SAKLIDIR.",
}

BOLUM_RE = re.compile(r"^Bölüm \d+$", re.IGNORECASE)
TEST_HEADER_RE = re.compile(r"^(.*?)\s*[Tt]est\s*[-–]\s*(\d+)$")
PAGE_NUM_RE = re.compile(r"^\d+$")
QUESTION_START_RE = re.compile(r"^(\d{1,2})\.\s+(.*)$")

raw_lines = RAW_TXT.read_text(encoding="utf-8").splitlines()

# Step A: filter noise
cleaned = []
for line in raw_lines:
    t = line.strip()
    if not t:
        continue
    if t.upper() in NOISE_EXACT:
        continue
    if PAGE_NUM_RE.match(t):
        continue
    cleaned.append(t)

# Step B+C: classify and group
courses_topics = {}  # course_id -> list of topic names in order seen
tests = []  # list of dicts: course_id, unit_index, topic, test_num, body_lines, answer_line
key_lines = []  # list of raw key-line strings, in document order
current_course = None
current_test = None

for t in cleaned:
    up = t.upper()
    if up in COURSE_HEADERS:
        current_course = COURSE_HEADERS[up]
        courses_topics.setdefault(current_course, [])
        continue
    if BOLUM_RE.match(t):
        continue
    m = TEST_HEADER_RE.match(t)
    if m and not QUESTION_START_RE.match(t) and not re.match(r"^[A-E]\.\s", t):
        topic_name = m.group(1).strip().rstrip(":").strip()
        test_num = int(m.group(2))
        assert current_course is not None, f"Test header before course header: {t}"
        topics = courses_topics[current_course]
        if topic_name not in topics:
            topics.append(topic_name)
        unit_index = topics.index(topic_name) + 1
        current_test = {
            "course": current_course,
            "unit_index": unit_index,
            "topic": topic_name,
            "test_num": test_num,
            "body": [],
            "answer_line": None,
        }
        tests.append(current_test)
        continue
    if t.startswith("1. 2."):
        # Answer-key lines can appear out of their own test's window due to
        # 2-column PDF extraction glitches. Collect them globally and pair
        # them positionally with tests afterwards (58 headers <-> 58 keys).
        key_lines.append(t)
        continue
    # otherwise: question-start or context/option content -> belongs to current test body
    assert current_test is not None, f"Stray content line with no current test: {t}"
    current_test["body"].append(t)

assert len(key_lines) == len(tests), (
    f"{len(key_lines)} answer-key lines but {len(tests)} tests - cannot pair positionally"
)
for test, key_line in zip(tests, key_lines):
    test["answer_line"] = key_line

print(f"Total tests found: {len(tests)}")
for cid, topics in courses_topics.items():
    print(f"  {cid}: {len(topics)} units -> {topics}")


def decode_answer_key(line):
    letters = re.sub(r"\d+\.\s*", "", line)
    letters = re.sub(r"\s+", "", letters)
    return list(letters)


out_tests = []
grand_total = 0
problems = []

for test in tests:
    if test["answer_line"] is None:
        problems.append(f"NO ANSWER KEY: {test['course']} / {test['topic']} test {test['test_num']}")
        continue
    answers = decode_answer_key(test["answer_line"])
    n_q_guess = len(re.findall(r"(?:^|\s)\d{1,2}\.\s", " ".join(test["body"])))
    if len(answers) != n_q_guess:
        problems.append(
            f"MISMATCH: {test['course']} / {test['topic']} test {test['test_num']}: "
            f"answer_key_len={len(answers)} question_markers={n_q_guess}"
        )
    grand_total += len(answers)
    out_tests.append(
        {
            "course": test["course"],
            "unit_index": test["unit_index"],
            "topic": test["topic"],
            "test_num": test["test_num"],
            "n_questions": len(answers),
            "answers": answers,
            "body": test["body"],
        }
    )

print(f"\nGRAND TOTAL questions (from answer keys): {grand_total}")
print(f"\nProblems: {len(problems)}")
for p in problems:
    print("  -", p)

OUT.write_text(json.dumps(out_tests, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\nWritten: {OUT} ({len(out_tests)} tests)")
