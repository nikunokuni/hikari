/* ==========================================
   ひかり — write.js
   「書く」画面：気配タグの選択・記録の保存・つづく日数
   ========================================== */

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

function goWriteWithDailyQuestion() {
  goWrite(dailyQuestion);
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
