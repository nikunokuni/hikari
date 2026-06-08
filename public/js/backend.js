/* ==========================================
   ひかり — backend.js
   サーバーとの通信（同期・AI・利用者数）をまとめた窓口
   ========================================== */

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
    } else {
      await pushToBackend();
    }
  } catch (e) {
    logError('syncWithBackend（データの読み込み）', e);
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
    logError('pushToBackend（データの保存）', e);
  }
}

// ===== GEMINI API CALL =====
async function callGemini(action, texts = '') {
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, texts }),
    });
    if (!res.ok) throw new Error('Gemini API request failed');
    const data = await res.json();
    return data.result;
  } catch (e) {
    logError(`callGemini（${action}）`, e);
    throw e;
  }
}

// ===== ACTIVE USERS（実際の直近24時間の利用者数を、そっと取得） =====
let activeCount = 0;

async function updateActiveUsers() {
  try {
    const res = await fetch('/api/active-users');
    if (!res.ok) throw new Error('Active users request failed');
    const data = await res.json();
    activeCount = typeof data.count === 'number' ? data.count : 0;
  } catch (e) {
    logError('updateActiveUsers（人数の取得）', e);
    // 取得できないときは、無理に数字を作らず「あなただけ」の静けさとして扱う
    activeCount = 0;
  }

  // ホーム画面のカウンター更新
  const el = document.getElementById('active-count');
  if (el) el.textContent = activeCount;
}
