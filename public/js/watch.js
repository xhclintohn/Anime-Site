var animeId = window.__ANIME_ID__;
var currentEp = window.__EP_NUM__ || 1;
var episodes = [];
var sources = [];
var currentSource = 0;
var hls = null;

function getEpisodeId(ep) {
  var found = episodes.find(function (e) { return e.number === ep || parseInt(e.number) === ep; });
  return found ? found.id : null;
}

function renderEpList() {
  var list = document.getElementById('watchEpList');
  if (!list || !episodes.length) return;
  list.innerHTML = episodes.map(function (ep) {
    var num = ep.number || ep.id;
    var isActive = parseInt(num) === currentEp;
    return '<div class="watch-ep-item' + (isActive ? ' active' : '') + '" onclick="changeEpisode(' + parseInt(num) + ')" data-ep="' + parseInt(num) + '">'
      + '<div class="watch-ep-num">' + num + '</div>'
      + '<div class="watch-ep-info"><div class="watch-ep-name">' + (ep.title || 'Episode ' + num) + '</div>'
      + '<div class="watch-ep-sub">Episode ' + num + '</div></div></div>';
  }).join('');
  var active = list.querySelector('.watch-ep-item.active');
  if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function setPlayerLoading(show) {
  var ld = document.getElementById('playerLoading');
  if (ld) ld.style.display = show ? 'flex' : 'none';
}

function loadStream(sourceIdx) {
  currentSource = sourceIdx || 0;
  var src = sources[currentSource];
  if (!src || !src.url) {
    setPlayerLoading(false);
    document.getElementById('playerTitle').textContent = 'Stream unavailable';
    document.getElementById('playerSub').textContent = 'Try a different server or episode.';
    return;
  }
  var video = document.getElementById('videoPlayer');
  setPlayerLoading(true);
  if (hls) { hls.destroy(); hls = null; }
  var url = src.url;
  if ((src.isM3U8 || url.includes('.m3u8')) && typeof Hls !== 'undefined' && Hls.isSupported()) {
    hls = new Hls({ enableWorker: true, lowLatencyMode: false });
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      setPlayerLoading(false);
      video.play().catch(function () {});
    });
    hls.on(Hls.Events.ERROR, function (e, data) {
      if (data.fatal) {
        setPlayerLoading(false);
        if (currentSource < sources.length - 1) loadStream(currentSource + 1);
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl') && url.includes('.m3u8')) {
    video.src = url;
    video.addEventListener('loadedmetadata', function () {
      setPlayerLoading(false);
      video.play().catch(function () {});
    }, { once: true });
  } else {
    video.src = url;
    video.addEventListener('loadeddata', function () { setPlayerLoading(false); }, { once: true });
    video.load();
    video.play().catch(function () {});
    setPlayerLoading(false);
  }
  document.getElementById('playerSub').textContent = 'Server: ' + (src.quality || 'Default') + (src.isM3U8 ? ' (HLS)' : '');
}

function renderServerTabs() {
  var tabs = document.getElementById('serverTabs');
  if (!tabs) return;
  tabs.innerHTML = sources.map(function (s, i) {
    return '<div class="server-tab' + (i === currentSource ? ' active' : '') + '" onclick="switchServer(' + i + ')">' + (s.quality || 'Server ' + (i + 1)) + '</div>';
  }).join('');
}

function switchServer(i) {
  document.querySelectorAll('.server-tab').forEach(function (t, j) { t.classList.toggle('active', j === i); });
  loadStream(i);
}

function loadEpisodeStream(epNum) {
  var epId = getEpisodeId(epNum);
  if (!epId) {
    setPlayerLoading(false);
    document.getElementById('playerTitle').textContent = 'Episode ' + epNum;
    document.getElementById('playerSub').textContent = 'Episode data not available yet.';
    document.getElementById('serverTabs').innerHTML = '';
    return;
  }
  setPlayerLoading(true);
  document.getElementById('playerTitle').textContent = 'Episode ' + epNum;
  document.getElementById('playerSub').textContent = 'Loading stream…';
  document.getElementById('serverTabs').innerHTML = '';
  fetch(BASE + '/api/stream?ep=' + encodeURIComponent(epId))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.sources || !data.sources.length) throw new Error('No sources');
      sources = data.sources;
      currentSource = 0;
      renderServerTabs();
      loadStream(0);
    })
    .catch(function () {
      setPlayerLoading(false);
      document.getElementById('playerSub').textContent = 'Stream unavailable for this episode.';
    });
}

function changeEpisode(epNum) {
  currentEp = epNum;
  var label = document.getElementById('watchEpLabel');
  if (label) label.textContent = 'Episode ' + epNum;
  var prevBtn = document.getElementById('prevEpBtn');
  var nextBtn = document.getElementById('nextEpBtn');
  if (prevBtn) prevBtn.disabled = epNum <= 1;
  if (nextBtn) nextBtn.disabled = epNum >= episodes.length;
  document.querySelectorAll('.watch-ep-item').forEach(function (el) {
    el.classList.toggle('active', parseInt(el.dataset.ep) === epNum);
    if (parseInt(el.dataset.ep) === epNum) {
      el.querySelector('.watch-ep-num').style.background = 'var(--purple2)';
      el.querySelector('.watch-ep-num').style.color = '#fff';
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      el.querySelector('.watch-ep-num').style.background = '';
      el.querySelector('.watch-ep-num').style.color = '';
    }
  });
  window.history.replaceState({}, '', BASE + '/watch/' + animeId + '/' + epNum);
  loadEpisodeStream(epNum);
}

document.getElementById('prevEpBtn').addEventListener('click', function () {
  if (currentEp > 1) changeEpisode(currentEp - 1);
});
document.getElementById('nextEpBtn').addEventListener('click', function () {
  if (currentEp < episodes.length) changeEpisode(currentEp + 1);
});

setPlayerLoading(true);
document.getElementById('playerTitle').textContent = 'Loading episode ' + currentEp + '…';

fetch(BASE + '/api/episodes/' + animeId)
  .then(function (r) { return r.json(); })
  .then(function (data) {
    episodes = data.episodes || [];
    renderEpList();
    var info = episodes.find(function (e) { return parseInt(e.number) === currentEp; });
    var title = (info && info.title) || ('Episode ' + currentEp);
    document.getElementById('playerTitle').textContent = title;
    var prevBtn = document.getElementById('prevEpBtn');
    var nextBtn = document.getElementById('nextEpBtn');
    if (prevBtn) prevBtn.disabled = currentEp <= 1;
    if (nextBtn) nextBtn.disabled = currentEp >= episodes.length;
    loadEpisodeStream(currentEp);
  })
  .catch(function () {
    document.getElementById('watchEpList').innerHTML = '<div class="error-box" style="margin:16px"><i class="fas fa-exclamation-circle"></i><p>Could not load episode list.</p></div>';
    loadEpisodeStream(currentEp);
  });

fetch(BASE + '/api/info/' + animeId)
  .then(function (r) { return r.json(); })
  .then(function (a) {
    var t = animeTitle(a.title);
    document.title = t + ' — Episode ' + currentEp + ' — ToxicWatch';
    var link = document.getElementById('watchAnimeLink');
    if (link) link.textContent = t;
  })
  .catch(function () {});
