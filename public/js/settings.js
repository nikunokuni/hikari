/* ==========================================
   ひかり — settings.js
   設定画面（思い出の演出のオン・オフなど）
   ========================================== */

function renderSettings() {
  document.getElementById('memory-popup-toggle').checked = memoryPopupEnabled;
}
function toggleMemoryPopupSetting() {
  memoryPopupEnabled = document.getElementById('memory-popup-toggle').checked;
  localStorage.setItem('hikari_memory_popup', memoryPopupEnabled ? '1' : '0');
  showToast(memoryPopupEnabled ? '思い出の演出をオンにしました。' : '思い出の演出をオフにしました。');
}

// キャッシュを手動で削除して再読み込みする（書いた記録は消えない）
async function manualClearCache() {
  await clearOldCaches();
  showToast('キャッシュを削除しました。再読み込みします…');
  setTimeout(() => location.reload(), 600);
}
