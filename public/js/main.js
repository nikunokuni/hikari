/* ==========================================
   ひかり — main.js
   起動シーケンス（すべての機能ファイルが揃ったあとに実行する）
   ========================================== */

load();
updateStreak();
updateActiveUsers();

syncWithBackend().then(() => {
  generateDailyQuestion();
  scheduleMemory();
});

setInterval(updateActiveUsers, 60000);
