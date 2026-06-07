/* ==========================================
   ひかり — screens.js
   画面切り替え（タブ・各画面の表示制御）
   ========================================== */

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
