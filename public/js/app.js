var BASE = window.__BASE__ || '';

(function initPreloader() {
  window.addEventListener('load', function () {
    setTimeout(function () {
      var p = document.getElementById('preloader');
      if (p) p.classList.add('hidden');
    }, 1800);
  });
})();

(function initCanvas() {
  var c = document.getElementById('techCanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  var W, H, dots = [];
  function resize() {
    W = c.width = window.innerWidth;
    H = c.height = window.innerHeight;
    dots = [];
    var n = Math.min(Math.floor(W * H / 8000), 110);
    for (var i = 0; i < n; i++) {
      dots.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .38, vy: (Math.random() - .5) * .38, r: 1.2 + Math.random() * 2.2, pulse: Math.random() * 6.28, glw: Math.random() < .28 });
    }
  }
  resize();
  window.addEventListener('resize', resize);
  function draw() {
    ctx.clearRect(0, 0, W, H);
    var len = dots.length;
    for (var i = 0; i < len; i++) {
      var d = dots[i];
      d.pulse += .018;
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0) d.x = W; else if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; else if (d.y > H) d.y = 0;
      var pr = d.r * (1 + .28 * Math.sin(d.pulse));
      if (d.glw) {
        var grd = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, pr * 9);
        grd.addColorStop(0, 'rgba(167,139,250,.55)'); grd.addColorStop(1, 'rgba(124,58,237,0)');
        ctx.beginPath(); ctx.arc(d.x, d.y, pr * 9, 0, 6.28); ctx.fillStyle = grd; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(d.x, d.y, pr, 0, 6.28); ctx.fillStyle = 'rgba(167,139,250,' + (d.glw ? .85 : .55) + ')'; ctx.fill();
      for (var j = i + 1; j < len; j++) {
        var d2 = dots[j]; var dx = d.x - d2.x, dy = d.y - d2.y, dist = dx * dx + dy * dy;
        if (dist < 30000) { ctx.beginPath(); ctx.strokeStyle = 'rgba(139,92,246,' + (1 - dist / 30000) * .22 + ')'; ctx.lineWidth = 1; ctx.moveTo(d.x, d.y); ctx.lineTo(d2.x, d2.y); ctx.stroke(); }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

(function initNav() {
  var header = document.getElementById('mainNav');
  if (!header) return;
  window.addEventListener('scroll', function () {
    header.classList.toggle('sticky', window.scrollY > 40);
  });
  var mobBtn = document.getElementById('mobBtn');
  var drawer = document.getElementById('sideDrawer');
  var overlay = document.getElementById('drawerOverlay');
  var closeBtn = document.getElementById('drawerClose');
  if (!mobBtn) return;
  function openDrawer() { drawer.classList.add('open'); overlay.classList.add('show'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { drawer.classList.remove('open'); overlay.classList.remove('show'); document.body.style.overflow = ''; }
  mobBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
})();

(function initAnim() {
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.06 });
  document.querySelectorAll('.anim-el').forEach(function (el) { obs.observe(el); });
})();

(function initNavSearch() {
  var inp = document.getElementById('navSearchInp');
  if (!inp) return;
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && this.value.trim()) {
      window.location.href = BASE + '/search?q=' + encodeURIComponent(this.value.trim());
    }
  });
})();

function animeTitle(a) {
  return (a && (a.english || a.romaji)) || 'Unknown';
}

function scoreColor(s) {
  if (!s) return 'var(--text3)';
  if (s >= 80) return '#22c55e';
  if (s >= 60) return '#eab308';
  return '#ef4444';
}

function formatStatus(s) {
  if (!s) return '';
  if (s === 'RELEASING') return '<span class="status-live"><i class="fas fa-circle" style="font-size:.5rem"></i> Airing</span>';
  if (s === 'FINISHED') return '<span class="status-done">Completed</span>';
  return '<span class="status-air">' + s.charAt(0) + s.slice(1).toLowerCase() + '</span>';
}

function formatNum(n) {
  if (!n) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
}

function animeCardHTML(a) {
  var title = animeTitle(a.title);
  var score = a.averageScore ? '<span class="anime-card-score"><i class="fas fa-star"></i>' + (a.averageScore / 10).toFixed(1) + '</span>' : '';
  var eps = a.episodes ? a.episodes + ' ep' : (a.status === 'RELEASING' ? 'Airing' : '—');
  return '<a href="' + BASE + '/anime/' + a.id + '" class="anime-card">'
    + '<span class="anime-card-shimmer"></span>'
    + (a.format ? '<span class="anime-card-badge">' + a.format + '</span>' : '')
    + '<img class="anime-card-img" src="' + (a.coverImage && (a.coverImage.large || a.coverImage.extraLarge)) + '" alt="' + title + '" loading="lazy" onerror="this.src=\'https://via.placeholder.com/160x240/13161f/a78bfa?text=No+Image\'">'
    + '<div class="anime-card-body">'
    + '<div class="anime-card-title">' + title + '</div>'
    + '<div class="anime-card-meta">' + score + '<span>' + eps + '</span></div>'
    + '</div></a>';
}

function skeletonCards(n) {
  var h = '';
  for (var i = 0; i < n; i++) {
    h += '<div class="card-skeleton"><div class="skel skel-img"></div><div class="skel skel-line"></div><div class="skel skel-line s"></div></div>';
  }
  return h;
}

function showToast(msg) {
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.classList.add('show'); }, 10);
  setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, 3200);
}
