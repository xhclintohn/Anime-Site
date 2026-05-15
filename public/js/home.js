var heroAnime = [];
var heroIdx = 0;
var heroTimer = null;

function renderHero(a) {
  var title = animeTitle(a.title);
  var bg = a.bannerImage || (a.coverImage && a.coverImage.extraLarge) || '';
  document.getElementById('heroBg').style.backgroundImage = bg ? 'url(' + bg + ')' : '';
  document.getElementById('heroTitle').innerHTML = title;
  var meta = '';
  if (a.averageScore) meta += '<span class="hero-score"><i class="fas fa-star"></i>' + (a.averageScore / 10).toFixed(1) + '</span>';
  if (a.season && a.seasonYear) meta += '<span><i class="fas fa-calendar"></i>' + a.season + ' ' + a.seasonYear + '</span>';
  if (a.episodes) meta += '<span><i class="fas fa-film"></i>' + a.episodes + ' Episodes</span>';
  if (a.status) meta += '<span>' + formatStatus(a.status) + '</span>';
  document.getElementById('heroMeta').innerHTML = meta;
  var desc = (a.description || '').replace(/<[^>]*>/g, '').slice(0, 220);
  if (desc.length === 220) desc += '…';
  document.getElementById('heroDesc').textContent = desc;
  document.getElementById('heroWatch').href = BASE + '/anime/' + a.id;
  document.getElementById('heroInfo').href = BASE + '/anime/' + a.id;
}

function setHeroSlide(i) {
  heroIdx = i;
  renderHero(heroAnime[i]);
  document.querySelectorAll('.hero-dot').forEach(function (d, j) {
    d.classList.toggle('active', j === i);
  });
}

function startHeroTimer() {
  if (heroTimer) clearInterval(heroTimer);
  heroTimer = setInterval(function () {
    setHeroSlide((heroIdx + 1) % heroAnime.length);
  }, 7000);
}

function buildHeroDots() {
  var dots = '';
  heroAnime.forEach(function (_, i) {
    dots += '<div class="hero-dot' + (i === 0 ? ' active' : '') + '" onclick="setHeroSlide(' + i + ');startHeroTimer()"></div>';
  });
  document.getElementById('heroDots').innerHTML = dots;
}

function renderScrollRow(containerId, list) {
  var el = document.getElementById(containerId);
  if (!el) return;
  if (!list || !list.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:.82rem;padding:20px">No results found.</div>';
    return;
  }
  el.innerHTML = list.map(animeCardHTML).join('');
}

function showSkeletons() {
  var s = '';
  for (var i = 0; i < 8; i++) s += '<div class="card-skeleton anime-card" style="flex:0 0 160px"><div class="skel skel-img"></div><div class="skel skel-line" style="margin:10px"></div><div class="skel skel-line s" style="margin:10px"></div></div>';
  ['trendingRow', 'popularRow', 'seasonalRow'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = s;
  });
}

showSkeletons();

fetch(BASE + '/api/home')
  .then(function (r) { return r.json(); })
  .then(function (data) {
    if (data.trending && data.trending.length) {
      heroAnime = data.trending.slice(0, 6);
      renderHero(heroAnime[0]);
      buildHeroDots();
      startHeroTimer();
    }
    renderScrollRow('trendingRow', data.trending);
    renderScrollRow('popularRow', data.popular);
    renderScrollRow('seasonalRow', data.seasonal);
    var sl = document.getElementById('seasonLabel');
    if (sl && data.currentSeason) sl.textContent = data.currentSeason;
  })
  .catch(function () {
    document.getElementById('heroTitle').textContent = 'ToxicWatch';
    document.getElementById('heroDesc').textContent = 'Your free anime streaming destination. Browse and watch anime now!';
  });
