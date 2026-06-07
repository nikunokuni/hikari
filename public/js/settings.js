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
