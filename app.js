// ============================================================
// 1. Kademe Fitness Lisansı - Duolingo tarzı test uygulaması
// ============================================================

const root = document.getElementById('app');

/** Navigation stack. Each entry: {view, params} */
let stack = [{ view: 'home', params: {} }];

/** Active quiz session state */
let quizSession = null;

function nav(view, params = {}) {
  stack.push({ view, params });
  render();
  window.scrollTo(0, 0);
}
function navReplace(view, params = {}) {
  stack[stack.length - 1] = { view, params };
  render();
  window.scrollTo(0, 0);
}
function back() {
  if (stack.length > 1) stack.pop();
  render();
  window.scrollTo(0, 0);
}
function goHome() {
  stack = [{ view: 'home', params: {} }];
  render();
  window.scrollTo(0, 0);
}

function getCourse(courseId) {
  return (window.COURSES || []).find((c) => c.id === courseId);
}
function getUnit(courseId, unitId) {
  const course = getCourse(courseId);
  if (!course) return null;
  return course.units.find((u) => String(u.id) === String(unitId));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle a question's options while keeping correctIndex / optionNotes aligned */
function shuffleQuestionOptions(q) {
  const order = shuffle(q.options.map((_, i) => i));
  const options = order.map((i) => q.options[i]);
  const optionNotes = order.map((i) => (q.optionNotes ? q.optionNotes[i] : ''));
  const correctIndex = order.indexOf(q.correctIndex);
  return { ...q, options, optionNotes, correctIndex };
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape text then turn **term** markup into bold-red highlighted spans. */
function mdBold(str) {
  return esc(str).replace(/\*\*(.+?)\*\*/g, '<strong class="def-term">$1</strong>');
}

// ============================================================
// LOCAL STORAGE: saved notes & wrong answers
// ============================================================
const LS_NOTES_KEY = 'flfl_saved_notes_v1';
const LS_WRONG_KEY = 'flfl_wrong_answers_v1';

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore (storage full/disabled) */ }
}

function getSavedNotes() { return loadJSON(LS_NOTES_KEY, []); }
function addSavedNote(note) {
  const notes = getSavedNotes();
  notes.unshift(note);
  saveJSON(LS_NOTES_KEY, notes);
}
function removeSavedNote(id) {
  saveJSON(LS_NOTES_KEY, getSavedNotes().filter((n) => n.id !== id));
  render();
}

function getWrongAnswers() { return loadJSON(LS_WRONG_KEY, []); }
function addWrongAnswer(courseId, courseTitle, q) {
  if (!q || !q.id) return;
  const list = getWrongAnswers();
  const key = (courseId || '') + ':' + q.id;
  const entry = {
    key,
    courseId: courseId || null,
    courseTitle: courseTitle || '',
    id: q.id,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    optionNotes: q.optionNotes || [],
    explanation: q.explanation || '',
    missedAt: Date.now(),
  };
  const idx = list.findIndex((w) => w.key === key);
  if (idx >= 0) list[idx] = entry; else list.unshift(entry);
  saveJSON(LS_WRONG_KEY, list);
}
function removeWrongAnswer(key) {
  saveJSON(LS_WRONG_KEY, getWrongAnswers().filter((w) => w.key !== key));
  render();
}
function clearWrongAnswers() {
  if (!confirm('Tüm yanlışlar listeden kaldırılsın mı?')) return;
  saveJSON(LS_WRONG_KEY, []);
  render();
}

// ============================================================
// RENDER
// ============================================================

function render() {
  const { view, params } = stack[stack.length - 1];
  let html = '';
  switch (view) {
    case 'home': html = renderHome(); break;
    case 'courseHome': html = renderCourseHome(params); break;
    case 'testModeSelect': html = renderTestModeSelect(params); break;
    case 'unitPickForTest': html = renderUnitPickForTest(params); break;
    case 'generalTestSetup': html = renderGeneralTestSetup(params); break;
    case 'summaryUnitList': html = renderSummaryUnitList(params); break;
    case 'unitSummary': html = renderUnitSummary(params); break;
    case 'savedNotes': html = renderSavedNotes(params); break;
    case 'wrongAnswers': html = renderWrongAnswers(params); break;
    case 'quiz': html = renderQuiz(params); break;
    case 'results': html = renderResults(params); break;
    default: html = renderHome();
  }
  root.innerHTML = html;
}

function topbar(title, showBack = true) {
  return `
    <div class="topbar">
      ${showBack ? `<button class="back-btn" onclick="back()">←</button>` : ''}
      <h1>${esc(title)}</h1>
    </div>`;
}

// ---------- HOME ----------
function renderHome() {
  const courses = window.COURSES || [];
  const cards = courses.map((c) => {
    const isActive = c.status === 'active';
    return `
      <div class="course-card ${isActive ? 'active' : 'locked'}" ${isActive ? `onclick="nav('courseHome',{courseId:'${c.id}'})"` : ''}>
        <div class="course-emoji">${c.emoji || '📘'}</div>
        <div class="course-info">
          <h3>${esc(c.title)}</h3>
          <p>${isActive ? (c.units.length + ' ünite · ' + totalQuestionCount(c) + ' soru') : 'Yakında eklenecek'}</p>
        </div>
        <div class="course-badge">${isActive ? 'Ders ' + c.order : 'Kilitli'}</div>
      </div>`;
  }).join('');

  const notesCount = getSavedNotes().length;
  const wrongCount = getWrongAnswers().length;

  return `
    <div class="app-title">
      <h1>1. Kademe Fitness Lisansı</h1>
      <p>Sınava hazırlık · ünite anlatımları ve çıkmış soru testleri</p>
    </div>
    <div class="screen" style="padding-top:8px;">
      <div class="home-shortcuts">
        <div class="shortcut-card" onclick="nav('savedNotes',{})">
          <span class="shortcut-emoji">📌</span>
          <div class="shortcut-info">
            <h4>Kaydettiklerim</h4>
            <span>${notesCount} not</span>
          </div>
        </div>
        <div class="shortcut-card" onclick="nav('wrongAnswers',{})">
          <span class="shortcut-emoji">❌</span>
          <div class="shortcut-info">
            <h4>Yanlışlarım</h4>
            <span>${wrongCount} soru</span>
          </div>
        </div>
      </div>
      ${cards || '<div class="empty-state">Ders bulunamadı.</div>'}
    </div>`;
}

// ---------- SAVED NOTES ----------
function renderSavedNotes() {
  const notes = getSavedNotes();
  const rows = notes.map((n) => `
    <div class="note-card">
      ${(n.courseTitle || n.unitTitle) ? `<div class="note-meta">${esc(n.courseTitle || '')}${n.unitTitle ? ' · ' + esc(n.unitTitle) : ''}</div>` : ''}
      <div class="note-text">${esc(n.text)}</div>
      <button class="note-remove" onclick="removeSavedNote('${n.id}')">🗑 Sil</button>
    </div>`).join('');
  return `
    ${topbar('📌 Kaydettiklerim')}
    <div class="screen">
      ${notes.length ? rows : '<div class="empty-state">Henüz bir şey kaydetmedin.<br><br>Konu anlatımında bir metni parmağınla (veya fareyle) seç, çıkan "Kaydet" düğmesine bas.</div>'}
    </div>`;
}

// ---------- WRONG ANSWERS ----------
function renderWrongAnswers() {
  const list = getWrongAnswers();
  const rows = list.map((w) => `
    <div class="wrong-card">
      ${w.courseTitle ? `<div class="note-meta">${esc(w.courseTitle)}</div>` : ''}
      <div class="wrong-question">${esc(w.question)}</div>
      <div class="wrong-correct">✅ Doğru cevap: ${String.fromCharCode(65 + w.correctIndex)}) ${esc((w.options || [])[w.correctIndex] || '')}</div>
      ${w.explanation ? `<div class="wrong-explain">${esc(w.explanation)}</div>` : ''}
      <button class="note-remove" onclick="removeWrongAnswer('${w.key}')">✓ Öğrendim, Kaldır</button>
    </div>`).join('');
  return `
    ${topbar('❌ Yanlışlarım')}
    <div class="screen">
      ${list.length ? `
        <button class="big-action green" style="width:100%; margin-bottom:10px;" onclick="retryAllWrong()">
          <span class="emoji">🔁</span> Bunlarla Test Ol (${list.length})
        </button>
        <button class="chip-btn" style="width:100%; margin-bottom:18px;" onclick="clearWrongAnswers()">Listeyi Temizle</button>` : ''}
      ${list.length ? rows : '<div class="empty-state">Henüz yanlış yaptığın bir soru yok. Böyle devam! 💪</div>'}
    </div>`;
}

function retryAllWrong() {
  const list = getWrongAnswers();
  if (!list.length) return;
  const questions = list.map((w) => shuffleQuestionOptions({
    id: w.id,
    question: w.question,
    options: w.options,
    correctIndex: w.correctIndex,
    optionNotes: w.optionNotes,
    explanation: w.explanation,
    courseId: w.courseId,
    courseTitle: w.courseTitle,
  }));
  quizSession = {
    courseId: null, title: 'Yanlışlarım Testi', questions, index: 0, score: 0,
    answered: false, selected: null, wrong: [],
  };
  nav('quiz', {});
}

function totalQuestionCount(course) {
  const unitTotal = course.units.reduce((sum, u) => sum + (u.questions ? u.questions.length : 0), 0);
  const extraTotal = course.extraQuestions ? course.extraQuestions.length : 0;
  return unitTotal + extraTotal;
}

// ---------- COURSE HOME ----------
function renderCourseHome(params) {
  const course = getCourse(params.courseId);
  if (!course) return renderHome();
  const unitRows = course.units.map((u, i) => `
    <div class="unit-row">
      <div class="unit-num">${i + 1}</div>
      <div class="unit-meta">
        <h4>${esc(u.title)}</h4>
        <span>${(u.questions ? u.questions.length : 0)} soru</span>
      </div>
      <div class="unit-actions">
        <button class="chip-btn" onclick="nav('unitSummary',{courseId:'${course.id}', unitId:'${u.id}'})">Özet</button>
        <button class="chip-btn primary" onclick="startUnitQuiz('${course.id}','${u.id}')">Test</button>
      </div>
    </div>`).join('');

  return `
    ${topbar(course.title)}
    <div class="screen">
      <div class="action-grid">
        <button class="big-action green" onclick="nav('testModeSelect',{courseId:'${course.id}'})">
          <span class="emoji">📝</span> Teste Başla
        </button>
        <button class="big-action blue" onclick="nav('summaryUnitList',{courseId:'${course.id}'})">
          <span class="emoji">📚</span> Konu Anlatımı
        </button>
      </div>
      <div class="section-title">Üniteler</div>
      ${unitRows}
    </div>`;
}

// ---------- TEST MODE SELECT ----------
function renderTestModeSelect(params) {
  const course = getCourse(params.courseId);
  if (!course) return renderHome();
  return `
    ${topbar('Teste Başla')}
    <div class="screen">
      <div class="mode-card" onclick="nav('unitPickForTest',{courseId:'${course.id}'})">
        <div class="emoji">📖</div>
        <div>
          <h3>Üniteye Göre Test</h3>
          <p>Bir ünite seç, sadece o ünitenin sorularıyla çalış.</p>
        </div>
      </div>
      <div class="mode-card" onclick="nav('generalTestSetup',{courseId:'${course.id}'})">
        <div class="emoji">🎯</div>
        <div>
          <h3>Genel Test</h3>
          <p>Tüm ünitelerin çıkmış sorularından karışık, rastgele bir test oluştur.</p>
        </div>
      </div>
    </div>`;
}

// ---------- UNIT PICK FOR TEST ----------
function renderUnitPickForTest(params) {
  const course = getCourse(params.courseId);
  if (!course) return renderHome();
  const rows = course.units.map((u, i) => `
    <div class="unit-row" style="cursor:pointer;" onclick="startUnitQuiz('${course.id}','${u.id}')">
      <div class="unit-num">${i + 1}</div>
      <div class="unit-meta">
        <h4>${esc(u.title)}</h4>
        <span>${(u.questions ? u.questions.length : 0)} soru</span>
      </div>
      <div class="unit-actions"><button class="chip-btn primary">Başla</button></div>
    </div>`).join('');
  return `
    ${topbar('Ünite Seç')}
    <div class="screen">${rows}</div>`;
}

// ---------- GENERAL TEST SETUP ----------
function renderGeneralTestSetup(params) {
  const course = getCourse(params.courseId);
  if (!course) return renderHome();
  const total = totalQuestionCount(course);
  const options = [10, 20, 30, total].filter((n, i, arr) => n > 0 && arr.indexOf(n) === i && n <= total);
  const btns = options.map((n) => `
    <div class="mode-card" onclick="startGeneralQuiz('${course.id}', ${n})">
      <div class="emoji">${n === total ? '🏆' : '🔢'}</div>
      <div>
        <h3>${n === total ? 'Tüm Sorular' : n + ' Soru'}</h3>
        <p>${n === total ? 'Mevcut tüm ' + total + ' çıkmış soru, karışık sırayla.' : n + ' soruluk rastgele karışık test.'}</p>
      </div>
    </div>`).join('');
  return `
    ${topbar('Genel Test')}
    <div class="screen">
      <p style="color:var(--text-dim); font-size:13.5px; margin-bottom:16px;">Toplam ${total} soru arasından kaç soruluk bir test istersin?</p>
      ${btns}
    </div>`;
}

// ---------- SUMMARY UNIT LIST ----------
function renderSummaryUnitList(params) {
  const course = getCourse(params.courseId);
  if (!course) return renderHome();
  const rows = course.units.map((u, i) => `
    <div class="unit-row" style="cursor:pointer;" onclick="nav('unitSummary',{courseId:'${course.id}', unitId:'${u.id}'})">
      <div class="unit-num">${i + 1}</div>
      <div class="unit-meta">
        <h4>${esc(u.title)}</h4>
        <span>Konu özeti</span>
      </div>
      <div class="unit-actions"><button class="chip-btn">Oku →</button></div>
    </div>`).join('');
  return `
    ${topbar('Konu Anlatımı')}
    <div class="screen">${rows}</div>`;
}

// ---------- UNIT SUMMARY ----------
function renderUnitSummary(params) {
  const course = getCourse(params.courseId);
  const unit = getUnit(params.courseId, params.unitId);
  if (!course || !unit) return renderHome();

  const outcomes = (unit.learningOutcomes || []).map((o) => `<li>${esc(o)}</li>`).join('');
  const keywords = (unit.keywords || []).map((k) => `<span class="keyword-chip">${esc(k)}</span>`).join('');
  const blocks = (unit.summary || []).map((b) => {
    const items = b.bullets && b.bullets.length
      ? b.bullets.map((item) => `<li>${mdBold(item)}</li>`).join('')
      : (b.paragraphs || []).map((p) => `<li>${mdBold(p)}</li>`).join('');
    return `
    <div class="summary-block">
      <h3>${b.emoji ? esc(b.emoji) + ' ' : ''}${esc(b.heading)}</h3>
      <ul class="fun-bullets">${items}</ul>
    </div>`;
  }).join('');

  return `
    ${topbar(unit.title)}
    <div class="screen">
      ${outcomes ? `<div class="learning-outcomes"><h4>Öğrenme Çıktıları</h4><ul>${outcomes}</ul></div>` : ''}
      <div class="summary-selectable">${blocks}</div>
      ${keywords ? `<div class="keywords">${keywords}</div>` : ''}
      <button class="big-action green sticky-cta" style="width:100%;" onclick="startUnitQuiz('${course.id}','${unit.id}')">
        <span class="emoji">📝</span> Bu Üniteyi Test Et
      </button>
    </div>`;
}

// ============================================================
// QUIZ ENGINE
// ============================================================

function startUnitQuiz(courseId, unitId) {
  const unit = getUnit(courseId, unitId);
  if (!unit || !unit.questions || !unit.questions.length) return;
  const questions = shuffle(unit.questions).map(shuffleQuestionOptions);
  quizSession = {
    courseId, title: unit.title, questions, index: 0, score: 0,
    answered: false, selected: null, wrong: [],
  };
  nav('quiz', {});
}

function startGeneralQuiz(courseId, count) {
  const course = getCourse(courseId);
  if (!course) return;
  let all = [];
  course.units.forEach((u) => { all = all.concat(u.questions || []); });
  all = all.concat(course.extraQuestions || []);
  const picked = shuffle(all).slice(0, count).map(shuffleQuestionOptions);
  quizSession = {
    courseId, title: 'Genel Test', questions: picked, index: 0, score: 0,
    answered: false, selected: null, wrong: [],
  };
  nav('quiz', {});
}

function retryWrong() {
  if (!quizSession || !quizSession.wrong.length) return;
  const questions = quizSession.wrong.map(shuffleQuestionOptions);
  const courseId = quizSession.courseId;
  quizSession = {
    courseId, title: 'Yanlışları Tekrar Çöz', questions, index: 0, score: 0,
    answered: false, selected: null, wrong: [],
  };
  navReplace('quiz', {});
}

function renderQuiz() {
  if (!quizSession) return renderHome();
  const s = quizSession;
  const q = s.questions[s.index];
  const total = s.questions.length;
  const pct = Math.round((s.index / total) * 100);

  const optionsHtml = q.options.map((opt, i) => {
    let cls = 'option-btn';
    if (s.answered) {
      cls += ' disabled';
      if (i === q.correctIndex) cls += ' correct';
      else if (i === s.selected) cls += ' incorrect';
    } else if (s.selected === i) {
      cls += ' selected';
    }
    return `
      <button class="${cls}" ${s.answered ? '' : `onclick="selectOption(${i})"`}>
        <span class="option-letter">${String.fromCharCode(65 + i)}</span>
        <span>${esc(opt)}</span>
      </button>`;
  }).join('');

  let bottomHtml;
  if (!s.answered) {
    const ready = s.selected !== null;
    bottomHtml = `
      <div class="bottom-bar"><div class="bottom-bar-inner">
        <button class="check-btn ${ready ? 'ready' : ''}" ${ready ? 'onclick="checkAnswer()"' : 'disabled'}>KONTROL ET</button>
      </div></div>`;
  } else {
    const isCorrect = s.selected === q.correctIndex;
    const note = !isCorrect && q.optionNotes ? q.optionNotes[s.selected] : '';
    const mainExplanation = q.explanation || '';
    bottomHtml = `
      <div class="bottom-bar"><div class="feedback-bar ${isCorrect ? 'correct' : 'incorrect'}">
        <div class="feedback-title">${isCorrect ? '✅ Doğru!' : '❌ Yanlış!'}</div>
        ${!isCorrect ? `<div class="feedback-correct-answer">Doğru cevap: ${String.fromCharCode(65 + q.correctIndex)}) ${esc(q.options[q.correctIndex])}</div>` : ''}
        <div class="feedback-text">
          ${!isCorrect && note ? `${esc(note)}<br><br>` : ''}${esc(mainExplanation)}
        </div>
        <button class="continue-btn" onclick="nextQuestion()">${s.index + 1 < total ? 'DEVAM ET' : 'SONUÇLARI GÖR'}</button>
      </div></div>`;
  }

  return `
    <div class="quiz-header">
      <button class="quiz-close" onclick="exitQuiz()">✕</button>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="quiz-counter">${s.index + 1}/${total}</div>
    </div>
    <div class="question-wrap">
      <div class="question-text">${esc(q.question)}</div>
      <div class="options">${optionsHtml}</div>
    </div>
    ${bottomHtml}`;
}

function selectOption(i) {
  if (!quizSession || quizSession.answered) return;
  quizSession.selected = i;
  render();
}

function checkAnswer() {
  if (!quizSession || quizSession.selected === null) return;
  const s = quizSession;
  const q = s.questions[s.index];
  s.answered = true;
  if (s.selected === q.correctIndex) {
    s.score++;
  } else {
    s.wrong.push(q);
    const courseId = q.courseId || s.courseId;
    const course = getCourse(courseId);
    addWrongAnswer(courseId, q.courseTitle || (course ? course.title : ''), q);
  }
  render();
}

function nextQuestion() {
  const s = quizSession;
  if (s.index + 1 < s.questions.length) {
    s.index++;
    s.answered = false;
    s.selected = null;
    render();
  } else {
    navReplace('results', {});
  }
}

function exitQuiz() {
  if (confirm('Testten çıkmak istediğine emin misin? İlerlemen kaydedilmeyecek.')) {
    quizSession = null;
    goHome();
  }
}

// ---------- RESULTS ----------
function renderResults() {
  if (!quizSession) return renderHome();
  const s = quizSession;
  const total = s.questions.length;
  const pct = total ? Math.round((s.score / total) * 100) : 0;
  const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📚';
  const msg = pct >= 80 ? 'Harika iş çıkardın!' : pct >= 50 ? 'İyi gidiyorsun, devam et!' : 'Tekrar çalışmaya değer.';

  return `
    <div class="screen results-wrap">
      <div class="results-emoji">${emoji}</div>
      <h2>${msg}</h2>
      <div class="score">${s.score}/${total}</div>
      <div class="score-sub">%${pct} doğru · ${s.title}</div>
      <div class="results-actions">
        ${s.wrong.length ? `<button class="btn-primary" onclick="retryWrong()">Yanlışları Tekrar Çöz (${s.wrong.length})</button>` : ''}
        <button class="btn-secondary" onclick="goHome()">Ana Sayfaya Dön</button>
      </div>
    </div>`;
}

// ============================================================
// TEXT SELECTION -> SAVE NOTE
// ============================================================
let selectionPopupEl = null;
let toastEl = null;
let toastTimer = null;

function ensureSelectionPopup() {
  if (selectionPopupEl) return selectionPopupEl;
  const el = document.createElement('button');
  el.id = 'selection-save-popup';
  el.className = 'selection-save-popup';
  el.textContent = '📌 Kaydet';
  el.style.display = 'none';
  el.addEventListener('mousedown', (e) => e.preventDefault());
  el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  el.addEventListener('click', saveCurrentSelection);
  document.body.appendChild(el);
  selectionPopupEl = el;
  return el;
}

function hideSelectionPopup() {
  if (selectionPopupEl) selectionPopupEl.style.display = 'none';
}

function handleSelectionChange() {
  const sel = window.getSelection();
  const text = sel && sel.rangeCount ? sel.toString().trim() : '';
  if (!text || text.length < 2) {
    hideSelectionPopup();
    return;
  }
  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  const el = node.nodeType === 1 ? node : node.parentElement;
  if (!el || !el.closest || !el.closest('.summary-selectable')) {
    hideSelectionPopup();
    return;
  }
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    hideSelectionPopup();
    return;
  }
  const popup = ensureSelectionPopup();
  popup.style.display = 'flex';
  const top = Math.max(8, rect.top - 46) + window.scrollY;
  const left = rect.left + rect.width / 2 + window.scrollX;
  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
}

function saveCurrentSelection() {
  const sel = window.getSelection();
  const text = sel && sel.toString().trim();
  if (!text) return;
  const top = stack[stack.length - 1];
  let courseTitle = '', unitTitle = '';
  if (top.view === 'unitSummary') {
    const course = getCourse(top.params.courseId);
    const unit = getUnit(top.params.courseId, top.params.unitId);
    courseTitle = course ? course.title : '';
    unitTitle = unit ? unit.title : '';
  }
  addSavedNote({
    id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    text, courseTitle, unitTitle, savedAt: Date.now(),
  });
  sel.removeAllRanges();
  hideSelectionPopup();
  showToast('Kaydedildi 📌');
}

function showToast(msg) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'app-toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

document.addEventListener('selectionchange', handleSelectionChange);

// ============================================================
render();
