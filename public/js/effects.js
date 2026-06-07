/* ==========================================
   ひかり — effects.js
   演出まわり：星のパーティクル・トースト通知・背景の星空キャンバス
   ========================================== */

// ===== PARTICLES =====
function spawnParticles() {
  spawnParticlesFrom({ x: window.innerWidth/2, y: window.innerHeight*0.65 }, '✦');
}
function spawnParticlesFrom(pos, icon) {
  const x = pos ? pos.x : window.innerWidth/2;
  const y = pos ? pos.y : window.innerHeight/2;
  const glyphs = ['✦','·','✧','•', icon || '✦'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = glyphs[i % glyphs.length];
    const angle = (i/12)*Math.PI*2;
    const dist = 50 + Math.random()*90;
    p.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(angle)*dist}px;--dy:${Math.sin(angle)*dist}px;animation-delay:${i*0.04}s`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ===== STAR CANVAS (背景粒子) =====
(function () {
  const canvas = document.getElementById('starCanvas');
  const ctx = canvas.getContext('2d');
  let stars = [];
  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  function init() {
    stars = Array.from({length:70}, () => ({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      r: Math.random()*0.9+0.2,
      o: Math.random()*0.35+0.08,
      speed: Math.random()*0.004+0.001,
      phase: Math.random()*Math.PI*2,
    }));
  }
  let t = 0;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    t += 0.01;
    stars.forEach(s => {
      const a = s.o*(0.4+0.6*Math.sin(t*s.speed*100+s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(201,168,76,${a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', () => { resize(); init(); });
  resize(); init(); draw();
})();
