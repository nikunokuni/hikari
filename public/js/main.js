/* ==========================================
   ひかり — main.js
   起動シーケンス（すべての機能ファイルが揃ったあとに実行する）
   ========================================== */

load();
renderEntryTags();
updateActiveUsers();

syncWithBackend().then(() => {
  generateDailyQuestion();
  scheduleMemory();
  updateStreak();
});

setInterval(updateActiveUsers, 60000);
