/* ==========================================
   ひかり — app.js (静寂・安心・並走型内省対応)
   ========================================== */

// 匿名ログイン代替用のUUID
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

// 記録に付けられる「気配」タグ（プリセット）。目標のタグもこれに合わせる
const ENTRY_TAG_PRESETS = ['心の声', '体の声', '自信', 'ネガティブ', '心地よさ', 'ご縁'];
const GOAL_TAG_PRESETS = [...ENTRY_TAG_PRESETS, '毎日書く'];
const ACHIEVEMENT_STAMPS = ['🏅','🎖️','🏆','💎','👑','🌈','🎉','🔮','🪄','🌠'];

// ===== STATE =====
let currentQuestion = '';
let dailyQuestion = '';
let visibility = 'private';
let entries = [];
let memos = [];
let goals = [];
let stampBoard = [];
let aiAnalysis = ''; 
let activeMemocat = '内省の方向性'; // 新カテゴリのデフォルト
let selectedGoalTag = GOAL_TAG_PRESETS[0];
let activeCat = 'からだ';
let activeImportantSub = 'memos';
let memoryPopupEnabled = true;
let selectedEntryTags = [];
let timelineTagFilter = null;

const TAB_SCREENS = ['home', 'timeline', 'important', 'community', 'settings'];

// ===== STORAGE (LOCAL) =====
function load() {
  try { entries   = JSON.parse(localStorage.getItem('hikari_entries')   || '[]'); } catch { entries = []; }
  try { memos     = JSON.parse(localStorage.getItem('hikari_memos')     || '[]'); } catch { memos = []; }
  try { goals     = JSON.parse(localStorage.getItem('hikari_goals')     || '[]'); } catch { goals = []; }
  try { stampBoard= JSON.parse(localStorage.getItem('hikari_stamps')    || '[]'); } catch { stampBoard = []; }
  try { aiAnalysis= localStorage.getItem('hikari_analysis')            || ''; } catch { aiAnalysis = ''; }
  memoryPopupEnabled = localStorage.getItem('hikari_memory_popup') !== '0';

  // 初めてアプリを使うユーザーに、迷わないための「内省の方向性（ガイド）」をプリセット
  if (memos.length === 0) {
    memos = [
      { id: 1, text: "今日、からだがホッとした瞬間はどこでしたか？（からだの声）", cat: "内省の方向性" },
      { id: 2, text: "最近、自分の心が『少し窮屈だな』と感じたのはどんな場面でしたか？（きもちの整理）", cat: "内省の方向性" },
      { id: 3, text: "嬉しかったことではなく、『ただ、ほっとしたこと』を1つ探してみる。（心地よさの探求）", cat: "内省の方向性" }
    ];
    save();
  }
}

function save() {
  localStorage.setItem('hikari_entries',  JSON.stringify(entries));
  localStorage.setItem('hikari_memos',    JSON.stringify(memos));
  localStorage.setItem('hikari_goals',    JSON.stringify(goals));
  localStorage.setItem('hikari_stamps',   JSON.stringify(stampBoard));
  localStorage.setItem('hikari_analysis',  aiAnalysis);
}

// ===== DATABASE SYNC =====
async function syncWithBackend() {
  try {
    const res = await fetch(`/api/sync?userId=${userId}`);
    if (!res.ok) return;
    const result = await res.json();
    
    if (result.data) {
      const d = result.data;
      entries = d.entries || [];
      memos = d.memos || [];
      goals = d.goals || [];
      stampBoard = d.stampBoard || [];
      aiAnalysis = d.aiAnalysis || '';
      save();
      updateStreak();
    } else {
      await pushToBackend();
    }
  } catch (e) {
    console.warn("同期がオフラインのためスキップされました:", e);
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
    console.warn("同期保存に失敗しました:", e);
  }
}

// ===== SCREENS =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  const tabBar = document.getElementById('tab-bar');
  const onTabScreen = TAB_SCREENS.includes(id);
  tabBar.classList.toggle('hidden', !onTabScreen);
  if (onTabScreen) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  }

  if (id === 'timeline')  renderTimeline();
  if (id === 'questions') renderQuestions();
  if (id === 'community') renderCommunity();
  if (id === 'important') renderImportant();
  if (id === 'settings')  renderSettings();
}

function goWrite(question) {
  showScreen('write');
  currentQuestion = question || '';
  document.getElementById('write-question').textContent = currentQuestion || '今、心にあることを、そのままに。';

  const input = document.getElementById('journal-input');
  input.value = '';
  input.style.height = 'auto';
  document.getElementById('char-count').textContent = '0';

  const cb = document.getElementById('vis-public-checkbox');
  cb.checked = false;
  visibility = 'private';

  selectedEntryTags = [];
  renderEntryTags();
}

// ===== ENTRY TAGS (今日の気配) =====
function entryTagOptions() {
  const customUsed = selectedEntryTags.filter(t => !ENTRY_TAG_PRESETS.includes(t));
  return ENTRY_TAG_PRESETS.concat(customUsed);
}

function renderEntryTags() {
  const row = document.getElementById('entry-tag-row');
  if (!row) return;
  row.innerHTML = entryTagOptions().map(t =>
    `<button class="etag-btn${selectedEntryTags.includes(t) ? ' active' : ''}" data-tag="${escHtml(t)}" onclick="toggleEntryTag(this.dataset.tag)">${escHtml(t)}</button>`
  ).join('');
}

function toggleEntryTag(tag) {
  const i = selectedEntryTags.indexOf(tag);
  if (i === -1) selectedEntryTags.push(tag);
  else selectedEntryTags.splice(i, 1);
  renderEntryTags();
}

function addCustomEntryTag() {
  const input = document.getElementById('entry-tag-custom');
  const tag = input.value.trim();
  if (!tag) return;
  if (!selectedEntryTags.includes(tag)) selectedEntryTags.push(tag);
  input.value = '';
  renderEntryTags();
}

function goWriteWithDailyQuestion() {
  goWrite(dailyQuestion);
}

function toggleVis() {
  const isChecked = document.getElementById('vis-public-checkbox').checked;
  visibility = isChecked ? 'public' : 'private';
}

// 入力欄の自動拡張
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
  
  // 心理的安全性：ダブル確認
  if (visibility === 'public') {
    const confirmPublish = confirm("この内容を「みんなのひかり」に灯しますか？\n（あなたの具体的な文章は誰にも見えません。『瞬く星』として気配だけが灯ります）");
    if (!confirmPublish) return;
  }
  
  const entry = {
    id: Date.now(),
    question: currentQuestion,
    text,
    tags: [...selectedEntryTags],
    visibility,
    date: new Date().toISOString(),
  };
  
  entries.unshift(entry);
  const achievedGoals = checkGoalAchievements();
  save();
  await pushToBackend();
  updateStreak();
  spawnParticles();

  if (achievedGoals.length) {
    const g = achievedGoals[0];
    setTimeout(() => {
      spawnParticlesFrom(null, g.stamp);
      showToast(`✦ 「${g.tag}」の目標を達成しました。${g.stamp} が灯りました。`);
    }, 800);
  } else {
    showToast('そっとしまいました。');
  }
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

// ===== ACTIVE USERS & MESSAGES (0〜2人のための温かい演出) =====
let simulatedActiveCount = 0;

function updateActiveUsers() {
  // 深夜帯のリアリティを出すために、0〜5人の間でゆらぎを持たせる
  // 意図的に0人〜2人が発生しやすい設定
  const rand = Math.random();
  if (rand < 0.25) {
    simulatedActiveCount = 0;
  } else if (rand < 0.45) {
    simulatedActiveCount = 1;
  } else if (rand < 0.65) {
    simulatedActiveCount = 2;
  } else {
    simulatedActiveCount = 3 + Math.floor(Math.random() * 4);
  }

  // ホーム画面のカウンター更新
  const counterEl = document.getElementById('active-count');
  if (simulatedActiveCount === 0) {
    counterEl.textContent = '0';
  } else {
    counterEl.textContent = simulatedActiveCount;
  }
}

// ===== TIMELINE =====
function renderActivityChart() {
  const msgEl = document.getElementById('activity-msg');
  const chart = document.getElementById('activity-chart');
  if (!msgEl || !chart) return;

  const days = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    days.push(d);
  }
  const counts = days.map(d => entries.filter(e => {
    const ed = new Date(e.date); ed.setHours(0,0,0,0);
    return ed.getTime() === d.getTime();
  }).length);
  const max = Math.max(1, ...counts);
  const activeDays = counts.filter(c => c > 0).length;

  if (activeDays >= 6) msgEl.textContent = `この一週間、ほとんど毎日。よく自分と向き合いましたね。`;
  else if (activeDays >= 3) msgEl.textContent = `この一週間で${activeDays}日、自分の声に耳を傾けました。`;
  else if (activeDays >= 1) msgEl.textContent = `この一週間で${activeDays}日、そっと記録を残しました。`;
  else msgEl.textContent = '今週の記録は、まだありません。気が向いたときに、ひとことから。';

  const weekday = ['日','月','火','水','木','金','土'];
  chart.innerHTML = days.map((d, i) => {
    const h = counts[i] ? Math.max(10, Math.round((counts[i] / max) * 100)) : 0;
    return `<div class="chart-col">
      <div class="chart-count">${counts[i] || ''}</div>
      <div class="chart-bar-track"><div class="chart-bar" style="height:${h}%"></div></div>
      <div class="chart-label">${weekday[d.getDay()]}</div>
    </div>`;
  }).join('');
}

function renderTagFilterChips() {
  const row = document.getElementById('timeline-tag-row');
  if (!row) return;
  const tagCounts = {};
  entries.forEach(e => (e.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
  const tags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);

  if (!tags.length) {
    row.innerHTML = '';
    row.classList.add('hidden');
    return;
  }
  row.classList.remove('hidden');
  row.innerHTML = `<button class="ttag-btn${!timelineTagFilter ? ' active' : ''}" onclick="selectTimelineTag(null)">すべて</button>` +
    tags.map(t =>
      `<button class="ttag-btn${timelineTagFilter === t ? ' active' : ''}" data-tag="${escHtml(t)}" onclick="selectTimelineTag(this.dataset.tag)">#${escHtml(t)} (${tagCounts[t]})</button>`
    ).join('');
}

function selectTimelineTag(tag) {
  timelineTagFilter = tag || null;
  renderTimeline();
}

function renderTimeline() {
  renderActivityChart();
  renderTagFilterChips();

  const list = document.getElementById('entry-list');
  const patCard = document.getElementById('pattern-card');
  if (!entries.length) {
    list.innerHTML = '<div class="empty-state">まだ記録がありません。<br>書くことから始めましょう。</div>';
    patCard.classList.add('hidden');
    return;
  }

  const shown = timelineTagFilter ? entries.filter(e => (e.tags || []).includes(timelineTagFilter)) : entries;
  if (!shown.length) {
    list.innerHTML = `<div class="empty-state">「#${escHtml(timelineTagFilter)}」の記録は、まだありません。</div>`;
  } else {
    list.innerHTML = shown.slice(0, 20).map(e => {
      const d = new Date(e.date);
      const ds = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
      const tagsHtml = (e.tags && e.tags.length)
        ? `<div class="entry-tags">${e.tags.map(t => `<span class="entry-tag-chip">#${escHtml(t)}</span>`).join('')}</div>`
        : '';
      return `<div class="entry-item">
        <div class="entry-date">${ds}</div>
        ${e.question ? `<div class="entry-q">${escHtml(e.question)}</div>` : ''}
        <div class="entry-body">${escHtml(e.text)}</div>
        ${tagsHtml}
        <span class="entry-vis">${e.visibility === 'public' ? '星空に灯した' : '自分だけ'}</span>
      </div>`;
    }).join('');
  }

  if (entries.length >= 3) {
    patCard.classList.remove('hidden');
    const el = document.getElementById('pattern-text');
    el.textContent = aiAnalysis || '3回以上書くと、AIがあなたの思考パターンからやさしい気づきを紡ぎます。下のボタンから受け取ってください。';
  } else {
    patCard.classList.add('hidden');
  }
}

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
      await pushToBackend();
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
    `<div class="q-item" onclick='selectQuestion(${JSON.stringify(q)})'>${escHtml(q)}</div>`
  ).join('');
}
function selectQuestion(q) {
  dailyQuestion = q;
  document.getElementById('home-question').textContent = q;
  showScreen('home');
  setTimeout(() => goWrite(q), 150);
}

// ===== IMPORTANT (気をつけること + スタンプ) =====
function renderImportant() {
  selectImportantSub(activeImportantSub);
  renderMemos();
  renderStamps();
}
function selectImportantSub(sub) {
  activeImportantSub = sub;
  document.querySelectorAll('.isub-btn').forEach(b => b.classList.toggle('active', b.dataset.sub === sub));
  document.getElementById('important-memos').classList.toggle('hidden', sub !== 'memos');
  document.getElementById('important-stamps').classList.toggle('hidden', sub !== 'stamps');
}

// ===== MEMOS (5大カテゴリ構造) =====
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
      <div class="memo-group-label">✦ ${cat}</div>
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
// タグに応じて、これまでの記録から達成回数を自動で数える（記録に付けたタグと一致したものをカウント）
function countForTag(tag) {
  if (tag === '毎日書く') return entries.length;
  return entries.filter(e => (e.tags || []).includes(tag)).length;
}

function pickAchievementStamp() {
  const unused = ACHIEVEMENT_STAMPS.filter(s => !stampBoard.includes(s));
  const pool = unused.length ? unused : ACHIEVEMENT_STAMPS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 記録が増えるたびに目標の進捗を集計し、達成していたらスタンプを贈る
function checkGoalAchievements() {
  const achieved = [];
  goals.forEach(g => {
    g.count = countForTag(g.tag);
    if (!g.achieved && g.count >= g.target) {
      g.achieved = true;
      g.stamp = pickAchievementStamp();
      stampBoard.push(g.stamp);
      achieved.push(g);
    }
  });
  return achieved;
}

function selectGoalTag(tag) {
  selectedGoalTag = tag;
  document.querySelectorAll('.gtag-btn').forEach(el => {
    el.classList.toggle('active', el.dataset.tag === tag);
  });
  document.getElementById('goal-tag-custom').classList.toggle('hidden', tag !== '__custom__');
}

function renderStamps() {
  const tagRow = document.getElementById('goal-tag-row');
  tagRow.innerHTML = GOAL_TAG_PRESETS.map(t =>
    `<button class="gtag-btn${t === selectedGoalTag ? ' active' : ''}" data-tag="${t}" onclick="selectGoalTag('${t}')">${t}</button>`
  ).join('') +
    `<button class="gtag-btn${selectedGoalTag === '__custom__' ? ' active' : ''}" data-tag="__custom__" onclick="selectGoalTag('__custom__')">じぶんで書く</button>`;
  document.getElementById('goal-tag-custom').classList.toggle('hidden', selectedGoalTag !== '__custom__');

  const goalList = document.getElementById('goal-list');
  if (!goals.length) {
    goalList.innerHTML = '<div class="empty-state" style="padding:20px 0">目標をひとつ作ってみましょう。</div>';
  } else {
    goalList.innerHTML = goals.map(g => {
      const pct = Math.min(100, Math.round((g.count / g.target) * 100));
      return `<div class="goal-item${g.achieved ? ' achieved' : ''}">
        <div class="goal-info">
          <div class="goal-tag-name">#${escHtml(g.tag)}</div>
          <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
          <div class="goal-count">${g.count} / ${g.target} 回${g.achieved ? `　${g.stamp} 達成` : ''}</div>
        </div>
      </div>`;
    }).join('');
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

async function addGoal() {
  const tag = selectedGoalTag === '__custom__'
    ? document.getElementById('goal-tag-custom').value.trim()
    : selectedGoalTag;
  if (!tag) { showToast('タグを選ぶか、書いてください。'); return; }
  const target = parseInt(document.getElementById('goal-target-input').value, 10);
  if (!target || target < 1) { showToast('目標の回数を入力してください。'); return; }

  const goal = { id: Date.now(), tag, target, count: countForTag(tag), achieved: false, stamp: '' };
  goals.push(goal);

  // すでにこれまでの記録だけで目標に届いている場合は、その場でスタンプを贈る
  if (goal.count >= goal.target) {
    goal.achieved = true;
    goal.stamp = pickAchievementStamp();
    stampBoard.push(goal.stamp);
  }

  save();
  await pushToBackend();
  document.getElementById('goal-tag-custom').value = '';
  document.getElementById('goal-target-input').value = '';
  renderStamps();

  if (goal.achieved) {
    spawnParticlesFrom(null, goal.stamp);
    showToast(`✦ すでに${goal.target}回、達成しています。${goal.stamp} が灯りました。`);
  } else {
    showToast('目標を作りました。');
  }
}

// ===== COMMUNITY (0〜2人の常夜灯・星の瞬き演出) =====
function renderCommunity() {
  const container = document.getElementById('constellation');
  const msgEl = document.getElementById('constellation-msg');
  container.innerHTML = '';

  updateActiveUsers(); // カウンターを最新化

  // メッセージと常夜灯(導き星)の制御
  if (simulatedActiveCount === 0) {
    msgEl.innerHTML = "今はあなただけの、極めて静かな時間です。<br>中央で静かに瞬く<b>「導き星」</b>が、そっとあなたに並走しています。";
    
    // 導き星（常夜灯）を中央にレンダリング
    const guide = document.createElement('div');
    guide.className = 'guide-star';
    container.appendChild(guide);

    // 寂しくないよう、周囲にさらに4つの極めて優しい背景星
    renderSoftBackgroundStars(container, 4);

  } else if (simulatedActiveCount === 1) {
    msgEl.innerHTML = "あなたを含めて <b>1 人</b>の静かな光が、いまここに灯っています。<br>この夜を、静かに分かち合いましょう。";
    
    const guide = document.createElement('div');
    guide.className = 'guide-star';
    container.appendChild(guide);
    renderSoftBackgroundStars(container, 6);

  } else if (simulatedActiveCount === 2) {
    msgEl.innerHTML = "あなたを含めて <b>2 人</b>の温かい光が、いまここに灯っています。<br>お互いの言葉は見えなくても、同じ空の下にいます。";
    
    // 2人の気配として、中心付近に2つの緩やかに瞬く星を配置
    renderPairStars(container);
    renderSoftBackgroundStars(container, 8);

  } else {
    msgEl.innerHTML = `あなたを含めて <b>${simulatedActiveCount} 人</b>の静かな光が、いまここに灯っています。<br>言葉のない星空で、ゆるやかに並走しています。`;
    
    // 3人以上のときは全体にバランスよく星を配置
    renderSoftBackgroundStars(container, simulatedActiveCount + 10);
  }
}

// 背景用のやさしく瞬く星々をランダム配置
function renderSoftBackgroundStars(parent, count) {
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    const size = Math.random() < 0.3 ? 3 : 2;
    const op = 0.2 + Math.random() * 0.6;
    s.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: var(--gold);
      opacity: ${op};
      left: ${10 + Math.random() * 80}%;
      top: ${10 + Math.random() * 80}%;
      animation: dotPulse ${2 + Math.random() * 3}s ease-in-out infinite;
    `;
    parent.appendChild(s);
  }
}

// 2人用の特別ビジュアル：中心から少し離れた対の星
function renderPairStars(parent) {
  const coords = [
    { left: '40%', top: '45%' },
    { left: '60%', top: '55%' }
  ];
  coords.forEach((c, idx) => {
    const s = document.createElement('div');
    s.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--gold2);
      border-radius: 50%;
      box-shadow: 0 0 16px var(--gold);
      left: ${c.left};
      top: ${c.top};
      animation: dotPulse ${2.5 + idx}s ease-in-out infinite;
    `;
    parent.appendChild(s);
  });
}

// ===== MEMORY POPUP =====
function showMemory() {
  if (entries.length < 2) return;
  const old = entries.filter((_, i) => i >= 1);
  const e = old[Math.floor(Math.random() * old.length)];
  const d = new Date(e.date);
  const memQ = document.getElementById('memory-q');
  memQ.textContent = e.question || '';
  memQ.style.display = e.question ? '' : 'none';
  document.getElementById('memory-text').textContent = e.text;
  document.getElementById('memory-date').textContent =
    `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日のひかり`;
  document.getElementById('memory-popup').classList.remove('hidden');
}
function closeMemory() {
  document.getElementById('memory-popup').classList.add('hidden');
}
function scheduleMemory() {
  if (!memoryPopupEnabled) return;
  if (entries.length < 2) return;
  setTimeout(() => {
    if (memoryPopupEnabled) showMemory();
    setInterval(() => { if (memoryPopupEnabled) showMemory(); }, 90000);
  }, 20000);
}

// ===== SETTINGS =====
function renderSettings() {
  document.getElementById('memory-popup-toggle').checked = memoryPopupEnabled;
}
function toggleMemoryPopupSetting() {
  memoryPopupEnabled = document.getElementById('memory-popup-toggle').checked;
  localStorage.setItem('hikari_memory_popup', memoryPopupEnabled ? '1' : '0');
  showToast(memoryPopupEnabled ? '思い出の演出をオンにしました。' : '思い出の演出をオフにしました。');
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
  } catch {
    const cats = Object.keys(QUESTIONS);
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const qs = QUESTIONS[cat];
    dailyQuestion = qs[Math.floor(Math.random() * qs.length)];
    el.textContent = dailyQuestion;
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

// ===== STAR CANVAS (背景粒子) =====
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

syncWithBackend().then(() => {
  generateDailyQuestion();
  scheduleMemory();
});

setInterval(updateActiveUsers, 60000);
