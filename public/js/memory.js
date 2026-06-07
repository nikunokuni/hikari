/* ==========================================
   ひかり — memory.js
   過去のひかり（思い出ポップアップ）：「今」と響き合う記録をそっと選ぶ
   ========================================== */

// 「今」に近い時間帯を、ゆるくいくつかの帯に分ける（深夜・朝・昼過ぎ・夕方・夜）
function timeOfDayBucket(date) {
  const h = date.getHours();
  if (h < 5) return 'midnight';
  if (h < 11) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

// 「今」と響き合う過去のひかりを選ぶ：同じ曜日・同じ時間帯・同じ気配（タグ）の
// どれか1つでも重なるものを優先し、なければ過去全体からそっと選ぶ
function pickResonantMemory(past) {
  const now = new Date();
  const nowWeekday = now.getDay();
  const nowBucket = timeOfDayBucket(now);
  const latestTags = entries[0].tags || [];

  const resonant = past.filter(e => {
    const d = new Date(e.date);
    const sameWeekday = d.getDay() === nowWeekday;
    const sameTimeOfDay = timeOfDayBucket(d) === nowBucket;
    const sharedTag = latestTags.length && (e.tags || []).some(t => latestTags.includes(t));
    return sameWeekday || sameTimeOfDay || sharedTag;
  });

  const pool = resonant.length ? resonant : past;
  return pool[Math.floor(Math.random() * pool.length)];
}

function showMemory() {
  if (entries.length < 2) return;
  // 直近の記録（entries[0]）以外から、「今」と響き合うひとつをそっと思い出す
  const past = entries.slice(1);
  const e = pickResonantMemory(past);
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
