/* ==========================================
   ひかり — questions.js
   問いの一覧画面 と 「今日の問いかけ」の生成
   ========================================== */

function renderQuestions() {
  const cats = Object.keys(QUESTIONS);
  document.getElementById('cat-row').innerHTML = cats.map(c =>
    `<button class="cat-btn${c === activeCat ? ' active':''}" onclick="selectCat('${c}')">${c}</button>`
  ).join('');
  renderQList();
}
function selectCat(c) {
  activeCat = c;
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === c);
  });
  renderQList();
}
function renderQList() {
  document.getElementById('question-list').innerHTML = QUESTIONS[activeCat].map(q =>
    `<div class="q-item" onclick='selectQuestion(${JSON.stringify(q)})'>${escHtml(q)}</div>`
  ).join('');
}
function selectQuestion(q) {
  dailyQuestion = q;
  document.getElementById('home-question').textContent = q;
  showScreen('home');
}

// ===== DAILY QUESTION =====
async function generateDailyQuestion() {
  const el = document.getElementById('home-question');
  const today = new Date().toDateString();
  const cached = localStorage.getItem('hikari_q_date');
  if (cached === today) {
    const q = localStorage.getItem('hikari_q_text') || '';
    if (q) { dailyQuestion = q; el.textContent = q; return; }
  }
  try {
    const q = await callGemini('question');
    if (q) {
      dailyQuestion = q;
      el.textContent = q;
      localStorage.setItem('hikari_q_date', today);
      localStorage.setItem('hikari_q_text', q);
    } else {
      throw new Error("Empty question response");
    }
  } catch (e) {
    logError('generateDailyQuestion（今日の問いの生成）', e);
    const cats = Object.keys(QUESTIONS);
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const qs = QUESTIONS[cat];
    dailyQuestion = qs[Math.floor(Math.random() * qs.length)];
    el.textContent = dailyQuestion;
  }
}
