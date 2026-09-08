/* ==========================================
   ひかり — memos.js
   「大事なもの」＞ 気をつけること（内省メモ）
   ========================================== */

function renderMemos() {
  const list = document.getElementById('memo-list');
  if (!memos.length) {
    list.innerHTML = '<div class="empty-state">まだメモがありません。<br>大切にしたいことを書き留めましょう。</div>';
    return;
  }
  list.innerHTML = memos.map(m => `
    <div class="memo-item">
      <div class="memo-item-text">${escHtml(m.text)}</div>
      <button class="memo-delete" onclick="deleteMemo(${m.id})" aria-label="削除">×</button>
    </div>`).join('');
}

async function addMemo() {
  const text = document.getElementById('memo-input').value.trim();
  if (!text) { showToast('心に留めたいことを、ひとことだけでも書いてみましょう。'); return; }
  memos.unshift({ id: Date.now(), text });
  save();
  await pushToBackend();
  document.getElementById('memo-input').value = '';
  renderMemos();
  showToast('そっと書き留めました。');
}

async function deleteMemo(id) {
  memos = memos.filter(m => m.id !== id);
  save();
  await pushToBackend();
  renderMemos();
}
