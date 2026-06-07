/* ==========================================
   ひかり — timeline.js
   「振り返る」画面：活動グラフ・タグ集計・記録一覧・AIの気づき
   ========================================== */

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
    logError('updateAIAnalysis（パターンの気づきの取得）', error);
    el.textContent = '現在、気づきを紡ぐのが難しいようです。時間をおいて、また試してみてくださいね。';
  } finally {
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}
