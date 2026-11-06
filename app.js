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

  return `
    <div class="app-title">
      <h1>1. Kademe Fitness Lisansı</h1>
      <p>Sınava hazırlık · ünite anlatımları ve çıkmış soru testleri</p>
    </div>
    <div class="screen" style="padding-top:8px;">
      ${cards || '<div class="empty-state">Ders bulunamadı.</div>'}
    </div>`;
}

function totalQuestionCount(course) {
  return course.units.reduce((sum, u) => sum + (u.questions ? u.questions.length : 0), 0);
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
  const blocks = (unit.summary || []).map((b) => `
    <div class="summary-block">
      <h3>${esc(b.heading)}</h3>
      ${(b.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('')}
    </div>`).join('');

  return `
    ${topbar(unit.title)}
    <div class="screen">
      ${outcomes ? `<div class="learning-outcomes"><h4>Öğrenme Çıktıları</h4><ul>${outcomes}</ul></div>` : ''}
      ${blocks}
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
render();
