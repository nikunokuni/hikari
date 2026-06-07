/* ==========================================
   ひかり — important.js
   「大事なもの」画面の土台（メモ／スタンプの切り替え）
   ========================================== */

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
