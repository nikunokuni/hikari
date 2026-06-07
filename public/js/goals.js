/* ==========================================
   ひかり — goals.js
   「大事なもの」＞ スタンプ（タグ目標の自動カウントと達成スタンプ）
   ========================================== */

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

function goalTagChip(tag, label) {
  const isActive = tag === selectedGoalTag;
  return `<button class="gtag-btn${isActive ? ' active' : ''}" data-tag="${escHtml(tag)}" onclick="selectGoalTag(this.dataset.tag)">${escHtml(label)}</button>`;
}

function renderGoalTagPicker() {
  const presetChips = GOAL_TAG_PRESETS.map(t => goalTagChip(t, t)).join('');
  const customChip = goalTagChip('__custom__', 'じぶんで書く');

  document.getElementById('goal-tag-row').innerHTML = presetChips + customChip;
  document.getElementById('goal-tag-custom').classList.toggle('hidden', selectedGoalTag !== '__custom__');
}

function renderGoalList() {
  const goalList = document.getElementById('goal-list');
  if (!goals.length) {
    goalList.innerHTML = '<div class="empty-state" style="padding:20px 0">目標をひとつ作ってみましょう。</div>';
    return;
  }
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

function renderStampBoard() {
  const board = document.getElementById('stamp-board');
  board.innerHTML = stampBoard.length
    ? stampBoard.map(s => `<div class="board-stamp">${s}</div>`).join('')
    : '<div class="stamp-board-empty">スタンプがここに積み重なります</div>';

  const latest = stampBoard.length ? stampBoard[stampBoard.length - 1] : '🌟';
  document.getElementById('stamp-preview').textContent = latest;
}

function renderStamps() {
  renderGoalTagPicker();
  renderGoalList();
  renderStampBoard();
}

async function addGoal() {
  const tag = selectedGoalTag === '__custom__'
    ? document.getElementById('goal-tag-custom').value.trim()
    : selectedGoalTag;
  if (!tag) { showToast('タグを選ぶか、ことばを添えてみましょう。'); return; }
  const target = parseInt(document.getElementById('goal-target-input').value, 10);
  if (!target || target < 1) { showToast('目標の回数を、決めてみましょう。'); return; }

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
    showToast('そっと目標を作りました。');
  }
}
