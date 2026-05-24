/* ==========================================
   ひかり — app.js (バックエンド・Gemini同期対応版)
   ========================================== */

// 匿名ログイン代替用のUUID管理
let userId = localStorage.getItem('hikari_user_id');
if (!userId) {
  userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  localStorage.setItem('hikari_user_id', userId);
}

const QUESTIONS = {
  からだ: [
    'からだに、どんな力が残っていますか。',
    '最近、よく眠れていますか。',
    '今日の体は、どんな感じですか。',
    '疲れているとしたら、それはどこからきていますか。',
    '呼吸は、今どんなリズムですか。',
  ],
  きもち: [
    '今、胸の中にあるものを一言で表すなら。',
    '最近、何かが気になっていますか。',
    '今の自分に、一言かけるとしたら。',
    'ほっとする瞬間は、どんなときですか。',
    '今日、何かに感動しましたか。',
  ],
  過去: [
    '最近、忘れられないことはありますか。',
    '昔の自分に会えるとしたら、何を伝えますか。',
    'ずっと持ち続けているものは、何ですか。',
    '手放せたと感じることはありますか。',
    'あのとき、正しかったと思うことはありますか。',
  ],
  これから: [
    'これからの自分に、期待していることはありますか。',
    'もし何でも許されるなら、何をしたいですか。',
    '少し先の未来に、何を感じますか。',
    '今日の一歩は、どんなことですか。',
    '一年後の自分は、どんなところにいますか。',
  ],
};

const EMOJI_OPTS = ['🌟','🌙','☀️','🌿','💧','🔥','🕊️','🌸','⭐','🌊','🍃','✨','🪷','🫧','🌱'];

const MOCK_PUBLIC = [
  { text: '今日は少し、からだが重かった。でも、それでいいと思えた。', time: '3時間前' },
  { text: 'ずっと好きだったことを、またやってみた。思ったより楽しかった。', time: '5時間前' },
  { text: '答えを出さなくていいと知って、すこし楽になった気がする。', time: '9時間前' },
  { text: '誰かに話せないことを、ここに置いてきた。', time: '14時間前' },
  { text: 'なんとなく、空を見上げた。それだけで、少し変わった気がした。', time: '昨日' },
];

// ===== STATE =====
let currentQuestion = '';
let visibility = 'private';
let entries = [];
let memos = [];
let goals = [];
let stampBoard = [];
let aiAnalysis = ''; // AI分析結果のローカルキャッシュ
let activeMemocat = 'こころ';
let selectedEmoji = '🌟';
let activeCat = 'からだ';

// ===== STORAGE (LOCAL) =====
function load() {
  try { entries   = JSON.parse(localStorage.getItem('hikari_entries')   || '[]'); } catch { entries = []; }
  try { memos     = JSON.parse(localStorage.getItem('hikari_memos')     || '[]'); } catch { memos = []; }
  try { goals     = JSON.parse(localStorage.getItem('hikari_goals')     || '[]'); } catch { goals = []; }
  try { stampBoard= JSON.parse(localStorage.getItem('hikari_stamps')    || '[]'); } catch { stampBoard = []; }
  try { aiAnalysis= localStorage.getItem('hikari_analysis')            || ''; } catch { aiAnalysis = ''; }
}

function save() {
  localStorage.setItem('hikari_entries',  JSON.stringify(entries));
  localStorage.setItem('hikari_memos',    JSON.stringify(memos));
  localStorage.setItem('hikari_goals',    JSON.stringify(goals));
  localStorage.setItem('hikari_stamps',   JSON.stringify(stampBoard));
  localStorage.setItem('hikari_analysis',  aiAnalysis);
}

// ===== DATABASE SYNC (BACKEND) =====
async function syncWithBackend() {
  try {
    const res = await fetch(`/api/sync?userId=${userId}`);
    if (!res.ok) return;
    const result = await res.json();
    
    if (result.data) {
      // データベースにデータが存在する場合：ローカルにマージ
      const d = result.data;
      entries = d.entries || [];
      memos = d.memos || [];
      goals = d.goals || [];
      stampBoard = d.stampBoard || [];
      aiAnalysis = d.aiAnalysis || '';
      save();
      updateStreak();
    } else {
      // データベースにデータがない場合：ローカルデータをプッシュして同期
      await pushToBackend();
    }
  } catch (e) {
    console.warn("バックエンドとの同期がオフラインのためスキップされました:", e);
  }
}

async function pushToBackend() {
  try {
    const payload = { entries, memos, goals, stampBoard, aiAnalysis };
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, data: payload })
    });
  } catch (e) {
    console.warn("バックエンドへの保存に失敗しました:", e);
  }
}

// ===== SCREENS =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'timeline')  renderTimeline();
  if (id === 'questions') renderQuestions();
  if (id === 'community') renderCommunity();
  if (id === 'memos')     renderMemos();
  if (id === 'stamps')    renderStamps();
}

function goWrite() {
  showScreen('write');
  document.getElementById('write-question').textContent = currentQuestion || '今、心にあることを書いてみてください。';
  
  const input = document.getElementById('journal-input');
  input.value = '';
  input.style.height = 'auto'; // 縦幅初期化
  document.getElementById('char-count').textContent = '0';
  
  // 心理的安全性：公開チェックボックス初期化 (デフォルト非公開)
  const cb = document.getElementById('vis-public-checkbox');
  cb.checked = false;
  visibility = 'private';
}

function toggleVis() {
  const isChecked = document.getElementById('vis-public-checkbox').checked;
  visibility = isChecked ? 'public' : 'private';
}

// 入力欄の自動サイズ調整機能
const journalArea = document.getElementById('journal-input');
journalArea.addEventListener('input', function () {
  document.getElementById('char-count').textContent = this.value.length;
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';
});

// ===== SAVE ENTRY =====
async function saveEntry() {
  const text = document.getElementById('journal-input').value.trim();
  if (!text) { showToast('何か書いてみましょう。'); return; }
  
  // 心理的安全性：C案のダブル確認ダイアログ
  if (visibility === 'public') {
    const confirmPublish = confirm("この内容を「みんなの光」に公開しますか？\n（あなたのお名前や個人情報は一切公開されず、完全に匿名となります）");
    if (!confirmPublish) return;
  }
  
  const entry = {
    id: Date.now(),
    question: currentQuestion,
    text,
    visibility,
    date: new Date().toISOString(),
  };
  
  entries.unshift(entry);
  save();
  await pushToBackend(); // DBに同期保存
  updateStreak();
  spawnParticles();
  showToast('そっとしまいました。');
  setTimeout(() => showScreen('home'), 700);
}

// ===== STREAK =====
function updateStreak() {
  if (!entries.length) { document.getElementById('streak-num').textContent = '0'; return; }
  const dates = entries.map(e => {
    const d = new Date(e.date); d.setHours(0,0,0,0); return d.getTime();
  });
  const unique = [...new Set(dates)].sort((a,b) => b-a);
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i-1] - unique[i] === 86400000) streak++;
    else break;
  }
  document.getElementById('streak-num').textContent = streak;
}

// ===== ACTIVE USERS (simulated) =====
function updateActiveUsers() {
  const base = 12 + Math.floor(Math.random() * 18);
  document.getElementById('active-count').textContent = base;
  const el2 = document.getElementById('active-count2');
  if (el2) el2.textContent = base;
}

// ===== TIMELINE (APIを呼ばず、ストレージキャッシュを参照) =====
function renderTimeline() {
  const list = document.getElementById('entry-list');
  const patCard = document.getElementById('pattern-card');
  if (!entries.length) {
    list.innerHTML = '<div class="empty-state">まだ記録がありません。<br>書くことから始めましょう。</div>';
    patCard.classList.add('hidden');
    return;
  }
  list.innerHTML = entries.slice(0, 20).map(e => {
    const d = new Date(e.date);
    const ds = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
    const safe = escHtml(e.text);
    return `<div class="entry-item">
      <div class="entry-date">${ds}</div>
      <div class="entry-q">${escHtml(e.question)}</div>
      <div class="entry-body">${safe}</div>
      <span class="entry-vis">${e.visibility === 'public' ? '公開' : '自分だけ'}</span>
    </div>`;
  }).join('');

  if (entries.length >= 3) {
    patCard.classList.remove('hidden');
    const el = document.getElementById('pattern-text');
    // 初期表示はローカル/DBのキャッシュをそのまま読み出す
    el.textContent = aiAnalysis || '3回以上書くと、AIがあなたの思考パターンからやさしい気づきを紡ぎます。下のボタンから受け取ってください。';
  } else {
    patCard.classList.add('hidden');
  }
}

// ボタンが押されたときのみGemini APIを呼ぶ
async function updateAIAnalysis() {
  const el = document.getElementById('pattern-text');
  const btn = document.getElementById('pattern-update-btn');
  
  el.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
  btn.disabled = true;
  btn.style.opacity = '0.5';

  const texts = entries.slice(0, 10).map(e => e.text).join('\n---\n');
  try {
    const res = await callGemini('analyze', texts);
    if (res) {
      aiAnalysis = res;
      el.textContent = res;
      save();
      await pushToBackend(); // DBへ更新データを同期
      showToast('パターンの気づきを更新しました。');
    } else {
      el.textContent = 'うまく読み取れませんでした。もう一度お試しください。';
    }
  } catch (error) {
    console.error(error);
    el.textContent = '現在、気づきを紡ぐのが難しいようです。時間をおいて再度お試しください。';
  } finally {
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

// ===== QUESTIONS =====
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
    `<div class="q-item" onclick="selectQuestion(${JSON.stringify(q)})">${q}</div>`
  ).join('');
}
function selectQuestion(q) {
  currentQuestion = q;
  document.getElementById('home-question').textContent = q;
  showScreen('home');
  setTimeout(() => goWrite(), 150);
}

// ===== MEMOS =====
function renderMemos() {
  const catBtns = document.querySelectorAll('.mcat-btn');
  catBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.cat === activeMemocat);
    b.onclick = () => { activeMemocat = b.dataset.cat; renderMemos(); };
  });
  const grouped = {};
  memos.forEach(m => { (grouped[m.cat] = grouped[m.cat] || []).push(m); });
  const list = document.getElementById('memo-list');
  if (!memos.length) {
    list.innerHTML = '<div class="empty-state">まだメモがありません。<br>大切にしたいことを書き留めましょう。</div>';
    return;
  }
  list.innerHTML = Object.entries(grouped).map(([cat, items]) =>
    `<div class="memo-group">
      <div class="memo-group-label">${cat}</div>
      ${items.map(m => `
        <div class="memo-item">
          <div class="memo-item-text">${escHtml(m.text)}</div>
          <button class="memo-delete" onclick="deleteMemo(${m.id})" aria-label="削除">×</button>
        </div>`).join('')}
    </div>`
  ).join('');
}

async function addMemo() {
  const text = document.getElementById('memo-input').value.trim();
  if (!text) { showToast('メモを書いてください。'); return; }
  memos.unshift({ id: Date.now(), text, cat: activeMemocat });
  save();
  await pushToBackend();
  document.getElementById('memo-input').value = '';
  renderMemos();
  showToast('追加しました。');
}

async function deleteMemo(id) {
  memos = memos.filter(m => m.id !== id);
  save();
  await pushToBackend();
  renderMemos();
}

// ===== STAMPS & GOALS =====
function renderStamps() {
  const picker = document.getElementById('emoji-picker');
  picker.innerHTML = EMOJI_OPTS.map(e =>
    `<div class="emoji-opt${e === selectedEmoji ? ' selected':''}" onclick="selectEmoji('${e}')">${e}</div>`
  ).join('');

  const goalList = document.getElementById('goal-list');
  if (!goals.length) {
    goalList.innerHTML = '<div class="empty-state" style="padding:20px 0">目標をひとつ作ってみましょう。</div>';
  } else {
    goalList.innerHTML = goals.map(g =>
      `<div class="goal-item">
        <div class="goal-emoji">${g.emoji}</div>
        <div class="goal-info">
          <div class="goal-name">${escHtml(g.name)}</div>
          <div class="goal-count">${g.count} スタンプ</div>
        </div>
        <button class="goal-stamp-btn" onclick="stampGoal(${g.id})">スタンプ</button>
      </div>`
    ).join('');
  }

  const board = document.getElementById('stamp-board');
  if (!stampBoard.length) {
    board.innerHTML = '<div style="color:var(--text3);font-size:12px;letter-spacing:0.15em;padding:8px;text-align:center">スタンプがここに積み重なります</div>';
  } else {
    board.innerHTML = stampBoard.map(s => `<div class="board-stamp">${s}</div>`).join('');
  }

  const latest = stampBoard.length ? stampBoard[stampBoard.length-1] : '🌟';
  document.getElementById('stamp-preview').textContent = latest;
}

function selectEmoji(e) {
  selectedEmoji = e;
  document.querySelectorAll('.emoji-opt').forEach(el => {
    el.classList.toggle('selected', el.textContent === e);
  });
}

async function addGoal() {
  const name = document.getElementById('goal-input').value.trim();
  if (!name) { showToast('目標を書いてください。'); return; }
  goals.push({ id: Date.now(), name, emoji: selectedEmoji, count: 0 });
  save();
  await pushToBackend();
  document.getElementById('goal-input').value = '';
  renderStamps();
  showToast('目標を作りました。');
}

async function stampGoal(id) {
  const g = goals.find(g => g.id === id);
  if (!g) return;
  g.count++;
  stampBoard.push(g.emoji);
  save();
  await pushToBackend();
  spawnParticlesFrom(null, g.emoji);
  renderStamps();
  showToast(`${g.emoji} スタンプを押しました。`);
}

// ===== COMMUNITY =====
function renderCommunity() {
  const pub = entries.filter(e => e.visibility === 'public');
  const combined = [
    ...pub.slice(0,3).map(e => ({ text: e.text, time: 'あなたの光' })),
    ...MOCK_PUBLIC
  ];
  renderConstellation(combined.length + 10);
  const list = document.getElementById('pub-list');
  if (!combined.length) {
    list.innerHTML = '<div class="empty-state">まだ公開されている光がありません。</div>';
    return;
  }
  list.innerHTML = combined.map(e =>
    `<div class="pub-item">
      <div class="pub-star">✦</div>
      <div class="pub-body">${escHtml(e.text)}</div>
      <div class="pub-time">${e.time}</div>
    </div>`
  ).join('');
  updateActiveUsers();
}

function renderConstellation(n) {
  const c = document.getElementById('constellation');
  c.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    const size = Math.random() < 0.25 ? 3 : 2;
    const op = 0.25 + Math.random() * 0.75;
    s.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:var(--gold);opacity:${op};left:${4+Math.random()*92}%;top:${8+Math.random()*84}%;${Math.random()>.65?'animation:dotPulse '+(1.5+Math.random()*2)+'s ease-in-out infinite':''}`;
    c.appendChild(s);
  }
}

// ===== MEMORY POPUP =====
function showMemory() {
  if (entries.length < 2) return;
  const old = entries.filter((_, i) => i >= 1);
  const e = old[Math.floor(Math.random() * old.length)];
  const d = new Date(e.date);
  document.getElementById('memory-q').textContent = e.question;
  document.getElementById('memory-text').textContent = e.text;
  document.getElementById('memory-date').textContent =
    `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日のひかり`;
  document.getElementById('memory-popup').classList.remove('hidden');
}
function closeMemory() {
  document.getElementById('memory-popup').classList.add('hidden');
}
function scheduleMemory() {
  if (entries.length < 2) return;
  setTimeout(() => {
    showMemory();
    setInterval(showMemory, 90000);
  }, 20000);
}

// ===== DAILY QUESTION =====
async function generateDailyQuestion() {
  const el = document.getElementById('home-question');
  const today = new Date().toDateString();
  const cached = localStorage.getItem('hikari_q_date');
  if (cached === today) {
    const q = localStorage.getItem('hikari_q_text') || '';
    if (q) { currentQuestion = q; el.textContent = q; return; }
  }
  try {
    const q = await callGemini('question');
    if (q) {
      currentQuestion = q;
      el.textContent = q;
      localStorage.setItem('hikari_q_date', today);
      localStorage.setItem('hikari_q_text', q);
    } else {
      throw new Error("Empty question response");
    }
  } catch {
    const cats = Object.keys(QUESTIONS);
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const qs = QUESTIONS[cat];
    currentQuestion = qs[Math.floor(Math.random() * qs.length)];
    el.textContent = currentQuestion;
  }
}

// ===== GEMINI API CALL =====
async function callGemini(action, texts = '') {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, texts }),
  });
  if (!res.ok) throw new Error('Gemini API request failed');
  const data = await res.json();
  return data.result;
}

// ===== PARTICLES =====
function spawnParticles() {
  spawnParticlesFrom({ x: window.innerWidth/2, y: window.innerHeight*0.65 }, '✦');
}
function spawnParticlesFrom(pos, icon) {
  const x = pos ? pos.x : window.innerWidth/2;
  const y = pos ? pos.y : window.innerHeight/2;
  const glyphs = ['✦','·','✧','•', icon || '✦'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = glyphs[i % glyphs.length];
    const angle = (i/12)*Math.PI*2;
    const dist = 50 + Math.random()*90;
    p.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(angle)*dist}px;--dy:${Math.sin(angle)*dist}px;animation-delay:${i*0.04}s`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ===== STAR CANVAS =====
(function () {
  const canvas = document.getElementById('starCanvas');
  const ctx = canvas.getContext('2d');
  let stars = [];
  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  function init() {
    stars = Array.from({length:70}, () => ({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      r: Math.random()*0.9+0.2,
      o: Math.random()*0.35+0.08,
      speed: Math.random()*0.004+0.001,
      phase: Math.random()*Math.PI*2,
    }));
  }
  let t = 0;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    t += 0.01;
    stars.forEach(s => {
      const a = s.o*(0.4+0.6*Math.sin(t*s.speed*100+s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(201,168,76,${a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', () => { resize(); init(); });
  resize(); init(); draw();
})();

// ===== UTILS =====
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== INIT =====
load();
updateStreak();
updateActiveUsers();

// バックエンドデータベースから最新状況をフェッチしたのちに起動
syncWithBackend().then(() => {
  generateDailyQuestion();
  scheduleMemory();
});

setInterval(updateActiveUsers, 60000);