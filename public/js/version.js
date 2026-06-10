/* ==========================================
   ひかり — version.js
   バージョン更新時のキャッシュ整理・自動リロード
   ========================================== */

// 過去バージョンのキャッシュを片付ける（日々の問いキャッシュ・Cache Storage など）
async function clearOldCaches() {
  localStorage.removeItem('hikari_q_date');
  localStorage.removeItem('hikari_q_text');

  if (window.caches) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
}

// アプリのバージョンが上がっていたら、古いキャッシュを片付けて再読み込みする
async function checkAppVersion() {
  const stored = localStorage.getItem('hikari_app_version');
  if (stored === APP_VERSION) return false;

  await clearOldCaches();
  localStorage.setItem('hikari_app_version', APP_VERSION);

  if (stored !== null) {
    location.reload();
    return true;
  }
  return false;
}
