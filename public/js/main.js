/* ==========================================
   ひかり — main.js
   起動シーケンス（すべての機能ファイルが揃ったあとに実行する）
   ========================================== */

(async () => {
  // バージョンが上がっていれば、古いキャッシュを片付けて再読み込みする
  if (await checkAppVersion()) return;

  load();
  renderEntryTags();
  updateActiveUsers();

  syncWithBackend().then(() => {
    generateDailyQuestion();
    scheduleMemory();
    updateWeeklyProgress();
    applyHikariColor();
  });

  setInterval(updateActiveUsers, 60000);
})();
