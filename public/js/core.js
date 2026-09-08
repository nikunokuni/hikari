/* ==========================================
   ひかり — core.js
   定数・状態・保存まわりの土台（他のすべてのファイルが拠りどころにする部分）
   ========================================== */

// アプリのバージョン。デプロイのたびに上げると、
// 古いキャッシュを持つ利用者の画面が自動で整理・再読み込みされる
const APP_VERSION = '1.3.0';

// 匿名ログイン代替用のUUID
let userId = localStorage.getItem('hikari_user_id');
if (!userId) {
  userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  localStorage.setItem('hikari_user_id', userId);
}

const QUESTIONS = {
  からだ: [
    'からだに、どんな力が残っていますか。',
    '最近、よく眠れていますか。',
    '今日の体は、どんな感じですか。',
    '疲れているとしたら、それはどこからきていますか。',
    '呼吸は、今どんなリズムですか。',
  ],
  きもち: [
    '今、胸の中にあるものを一言で表すなら。',
    '最近、何かが気になっていますか。',
    '今の自分に、一言かけるとしたら。',
    'ほっとする瞬間は、どんなときですか。',
    '今日、何かに感動しましたか。',
  ],
  過去: [
    '最近、忘れられないことはありますか。',
    '昔の自分に会えるとしたら、何を伝えますか。',
    'ずっと持ち続けているものは、何ですか。',
    '手放せたと感じることはありますか。',
    'あのとき、正しかったと思うことはありますか。',
  ],
  これから: [
    'これからの自分に、期待していることはありますか。',
    'もし何でも許されるなら、何をしたいですか。',
    '少し先の未来に、何を感じますか。',
    '今日の一歩は、どんなことですか。',
    '一年後の自分は、どんなところにいますか。',
  ],
};

// 記録に付けられる「気配」タグ（プリセット）
const ENTRY_TAG_PRESETS = ['心の声', '体の声', '自信', 'ネガティブ', '心地よさ', 'ご縁'];

// 「今日の気配」タグごとの色。その日選んだ気配の色合いに「ひかり」のロゴが灯る
const ENTRY_TAG_COLORS = {
  '心の声':    '#b39ddb',
  '体の声':    '#8fcb9b',
  '自信':      '#f3b562',
  'ネガティブ': '#8aa6c9',
  '心地よさ':  '#f2a6c6',
  'ご縁':      '#7fd1c9',
};

// ===== STATE =====
let dailyQuestion = '';
let visibility = 'private';
let entries = [];
let memos = [];
let aiAnalysis = '';
let activeCat = 'からだ';
let memoryPopupEnabled = true;
let selectedEntryTags = [];
let timelineTagFilter = null;

const TAB_SCREENS = ['home', 'timeline', 'important', 'community', 'settings'];

// ===== ERROR LOGGING =====
// 通信や外部APIまわりで起きたことを、あとから静かに追えるように記録しておく
function logError(context, error) {
  console.error(`[ひかり] ${context} で問題が起きました:`, error);
}

// ===== STORAGE (LOCAL) =====
function load() {
  try { entries   = JSON.parse(localStorage.getItem('hikari_entries')   || '[]'); } catch { entries = []; }
  try { memos     = JSON.parse(localStorage.getItem('hikari_memos')     || '[]'); } catch { memos = []; }
  try { aiAnalysis= localStorage.getItem('hikari_analysis')            || ''; } catch { aiAnalysis = ''; }
  memoryPopupEnabled = localStorage.getItem('hikari_memory_popup') !== '0';

  // 初めてアプリを使うユーザーに、迷わないためのガイドをプリセット
  if (memos.length === 0) {
    memos = [
      { id: 1, text: "今日、からだがホッとした瞬間はどこでしたか？" },
      { id: 2, text: "最近、自分の心が『少し窮屈だな』と感じたのはどんな場面でしたか？" },
      { id: 3, text: "嬉しかったことではなく、『ただ、ほっとしたこと』を1つ探してみる。" }
    ];
    save();
  }
}

function save() {
  localStorage.setItem('hikari_entries',  JSON.stringify(entries));
  localStorage.setItem('hikari_memos',    JSON.stringify(memos));
  localStorage.setItem('hikari_analysis',  aiAnalysis);
}

// ===== UTILS =====
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
