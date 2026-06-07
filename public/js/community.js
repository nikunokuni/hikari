/* ==========================================
   ひかり — community.js
   「みんなのひかり」：言葉のない星空の演出（0〜2人の温かい表現を含む）
   ========================================== */

async function renderCommunity() {
  const container = document.getElementById('constellation');
  const msgEl = document.getElementById('constellation-msg');
  container.innerHTML = '';

  await updateActiveUsers(); // カウンターを最新化

  // メッセージと常夜灯(導き星)の制御
  if (activeCount === 0) {
    msgEl.innerHTML = "今はあなただけの、極めて静かな時間です。<br>中央で静かに瞬く<b>「導き星」</b>が、そっとあなたに並走しています。";

    // 導き星（常夜灯）を中央にレンダリング
    const guide = document.createElement('div');
    guide.className = 'guide-star';
    container.appendChild(guide);

    // 寂しくないよう、周囲にさらに4つの極めて優しい背景星
    renderSoftBackgroundStars(container, 4);

  } else if (activeCount === 1) {
    msgEl.innerHTML = "あなたを含めて <b>1 人</b>の静かな光が、いまここに灯っています。<br>この夜を、静かに分かち合いましょう。";

    const guide = document.createElement('div');
    guide.className = 'guide-star';
    container.appendChild(guide);
    renderSoftBackgroundStars(container, 6);

  } else if (activeCount === 2) {
    msgEl.innerHTML = "あなたを含めて <b>2 人</b>の温かい光が、いまここに灯っています。<br>お互いの言葉は見えなくても、同じ空の下にいます。";

    // 2人の気配として、中心付近に2つの緩やかに瞬く星を配置
    renderPairStars(container);
    renderSoftBackgroundStars(container, 8);

  } else {
    msgEl.innerHTML = `あなたを含めて <b>${activeCount} 人</b>の静かな光が、いまここに灯っています。<br>言葉のない星空で、ゆるやかに並走しています。`;

    // 3人以上のときは全体にバランスよく星を配置
    renderSoftBackgroundStars(container, activeCount + 10);
  }
}

// 背景用のやさしく瞬く星々をランダム配置
function renderSoftBackgroundStars(parent, count) {
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    const size = Math.random() < 0.3 ? 3 : 2;
    const op = 0.2 + Math.random() * 0.6;
    s.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: var(--gold);
      opacity: ${op};
      left: ${10 + Math.random() * 80}%;
      top: ${10 + Math.random() * 80}%;
      animation: dotPulse ${2 + Math.random() * 3}s ease-in-out infinite;
    `;
    parent.appendChild(s);
  }
}

// 2人用の特別ビジュアル：中心から少し離れた対の星
function renderPairStars(parent) {
  const coords = [
    { left: '40%', top: '45%' },
    { left: '60%', top: '55%' }
  ];
  coords.forEach((c, idx) => {
    const s = document.createElement('div');
    s.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: var(--gold2);
      border-radius: 50%;
      box-shadow: 0 0 16px var(--gold);
      left: ${c.left};
      top: ${c.top};
      animation: dotPulse ${2.5 + idx}s ease-in-out infinite;
    `;
    parent.appendChild(s);
  });
}
