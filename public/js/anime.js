var animeId = window.__ANIME_ID__;
var episodeList = [];

function statusLabel(s) {
  if (s === 'RELEASING') return '<span style="color:#22c55e"><i class="fas fa-circle" style="font-size:.5rem"></i> Airing</span>';
  if (s === 'FINISHED') return '<span style="color:var(--text3)">Completed</span>';
  if (s === 'NOT_YET_RELEASED') return '<span style="color:#eab308">Upcoming</span>';
  return s || '—';
}

function renderInfo(a) {
  document.title = animeTitle(a.title) + ' — ToxicWatch';
  var banner = a.bannerImage || (a.coverImage && a.coverImage.extraLarge) || '';
  if (banner) {
    var b = document.getElementById('detailBanner');
    if (b) b.style.backgroundImage = 'url(' + banner + ')';
  }
  var poster = document.getElementById('detailPoster');
  if (poster) poster.src = (a.coverImage && (a.coverImage.extraLarge || a.coverImage.large)) || '';
  var t = animeTitle(a.title);
  var tn = document.getElementById('detailTitle');
  if (tn) tn.textContent = t;
  var nat = document.getElementById('detailTitleNative');
  if (nat && a.title && a.title.native) nat.textContent = a.title.native;
  var bread = document.getElementById('breadAnime');
  if (bread) bread.textContent = t;
  var link = document.querySelector('#watchAnimeLink');
  if (link) { link.href = BASE + '/anime/' + a.id; link.textContent = t; }

  var scoreRow = document.getElementById('detailScoreRow');
  if (scoreRow) {
    var sr = '';
    if (a.averageScore) sr += '<div class="score-badge"><i class="fas fa-star"></i>' + (a.averageScore / 10).toFixed(1) + ' / 10</div>';
    if (a.popularity) sr += '<span style="font-size:.82rem;color:var(--text3)"><i class="fas fa-users" style="margin-right:4px"></i>' + formatNum(a.popularity) + ' users</span>';
    scoreRow.innerHTML = sr;
  }

  var genresEl = document.getElementById('detailGenres');
  if (genresEl && a.genres) {
    genresEl.innerHTML = a.genres.map(function (g) { return '<span class="genre-tag">' + g + '</span>'; }).join('');
  }

  var desc = document.getElementById('detailDesc');
  if (desc) desc.textContent = (a.description || 'No description available.').replace(/<[^>]*>/g, '');

  var stats = document.getElementById('detailStats');
  if (stats) {
    var rows = [
      { label: 'Status', value: statusLabel(a.status) },
      { label: 'Format', value: a.format || '—' },
      { label: 'Episodes', value: a.episodes || '—' },
      { label: 'Duration', value: a.duration ? a.duration + ' min' : '—' },
      { label: 'Season', value: a.season && a.seasonYear ? a.season + ' ' + a.seasonYear : '—' },
      { label: 'Studio', value: (a.studios && a.studios.nodes && a.studios.nodes[0] && a.studios.nodes[0].name) || '—' },
    ];
    stats.innerHTML = rows.map(function (r) {
      return '<div class="detail-stat"><span class="label">' + r.label + '</span><span class="value">' + r.value + '</span></div>';
    }).join('');
  }

  var btns = document.getElementById('detailBtns');
  if (btns) {
    btns.innerHTML = '<a href="' + BASE + '/watch/' + a.id + '/1" class="btn-primary"><i class="fas fa-play"></i>Watch Now</a>'
      + (a.trailer && a.trailer.id && a.trailer.site === 'youtube'
        ? '<a href="https://www.youtube.com/watch?v=' + a.trailer.id + '" target="_blank" class="btn-secondary"><i class="fas fa-video"></i>Trailer</a>'
        : '');
  }

  if (a.characters && a.characters.nodes && a.characters.nodes.length) {
    var charSec = document.getElementById('charSection');
    var charGrid = document.getElementById('charGrid');
    if (charSec) charSec.style.display = '';
    if (charGrid) {
      charGrid.innerHTML = a.characters.nodes.map(function (c) {
        return '<div class="char-card"><img class="char-img" src="' + (c.image && c.image.medium || '') + '" alt="' + (c.name && c.name.full || '') + '" onerror="this.style.display=\'none\'">'
          + '<div class="char-name">' + (c.name && c.name.full || '') + '</div></div>';
      }).join('');
    }
  }

  if (a.recommendations && a.recommendations.nodes && a.recommendations.nodes.length) {
    var recSec = document.getElementById('recSection');
    var recGrid = document.getElementById('recGrid');
    if (recSec) recSec.style.display = '';
    if (recGrid) {
      recGrid.innerHTML = a.recommendations.nodes
        .filter(function (n) { return n.mediaRecommendation; })
        .map(function (n) { return animeCardHTML(n.mediaRecommendation); }).join('');
    }
  }
}

function renderEpisodes(episodes, totalEpisodes) {
  var epGrid = document.getElementById('epGrid');
  var badge = document.getElementById('epCountBadge');
  if (badge) badge.textContent = (totalEpisodes || episodes.length) + ' Episodes';
  if (!episodes || !episodes.length) {
    if (epGrid) epGrid.innerHTML = '<div style="color:var(--text3);font-size:.82rem;padding:20px 0">No episodes available yet.</div>';
    return;
  }
  episodeList = episodes;
  if (epGrid) {
    epGrid.innerHTML = episodes.map(function (ep, i) {
      var num = ep.number || (i + 1);
      return '<a href="' + BASE + '/watch/' + animeId + '/' + num + '" class="ep-btn">Ep ' + num + '</a>';
    }).join('');
  }
}

fetch(BASE + '/api/info/' + animeId)
  .then(function (r) { return r.json(); })
  .then(renderInfo)
  .catch(function () {
    var t = document.getElementById('detailTitle');
    if (t) t.innerHTML = '<span style="color:var(--red)">Failed to load anime info.</span>';
  });

fetch(BASE + '/api/episodes/' + animeId)
  .then(function (r) { return r.json(); })
  .then(function (data) { renderEpisodes(data.episodes, data.totalEpisodes); })
  .catch(function () {
    var epGrid = document.getElementById('epGrid');
    var badge = document.getElementById('epCountBadge');
    if (badge) badge.textContent = 'Unavailable';
    if (epGrid) epGrid.innerHTML = '<div class="error-box"><i class="fas fa-exclamation-circle"></i><p>Could not load episodes.</p></div>';
  });
