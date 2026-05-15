var currentPage = 1;
var currentQuery = '';
var isLoading = false;

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function setStatus(msg) {
  var el = document.getElementById('searchStatus');
  if (el) el.textContent = msg;
}

function renderGrid(results) {
  var grid = document.getElementById('resultsGrid');
  if (!grid) return;
  if (!results || !results.length) {
    grid.innerHTML = '<div class="error-box" style="grid-column:1/-1"><i class="fas fa-search"></i><p>No anime found. Try a different search term.</p></div>';
    return;
  }
  grid.innerHTML = results.map(animeCardHTML).join('');
}

function showGridSkeletons() {
  var grid = document.getElementById('resultsGrid');
  if (!grid) return;
  var s = '';
  for (var i = 0; i < 12; i++) s += '<div class="card-skeleton"><div class="skel skel-img"></div><div class="skel skel-line"></div><div class="skel skel-line s"></div></div>';
  grid.innerHTML = s;
}

function renderPagination(pageInfo) {
  var wrap = document.getElementById('paginationWrap');
  if (!wrap || !pageInfo) return;
  if (!pageInfo.hasNextPage && pageInfo.currentPage <= 1) { wrap.innerHTML = ''; return; }
  var btns = '';
  if (pageInfo.currentPage > 1) btns += '<button class="btn-secondary" onclick="doSearch(' + (pageInfo.currentPage - 1) + ')" style="font-size:.82rem;padding:9px 20px;margin:6px"><i class="fas fa-chevron-left"></i> Prev</button>';
  btns += '<span style="padding:9px 16px;font-size:.82rem;color:var(--text3)">Page ' + pageInfo.currentPage + (pageInfo.lastPage ? ' of ' + pageInfo.lastPage : '') + '</span>';
  if (pageInfo.hasNextPage) btns += '<button class="btn-primary" onclick="doSearch(' + (pageInfo.currentPage + 1) + ')" style="font-size:.82rem;padding:9px 20px;margin:6px">Next <i class="fas fa-chevron-right"></i></button>';
  wrap.innerHTML = btns;
}

function doSearch(page) {
  if (isLoading) return;
  currentPage = page || 1;
  var q = document.getElementById('searchInp').value.trim();
  currentQuery = q;
  if (!q) {
    setStatus('Enter an anime title to search.');
    document.getElementById('resultsGrid').innerHTML = '';
    document.getElementById('paginationWrap').innerHTML = '';
    return;
  }
  var url = new URL(window.location.href);
  url.searchParams.set('q', q);
  if (page > 1) url.searchParams.set('page', page); else url.searchParams.delete('page');
  window.history.replaceState({}, '', url.toString());
  isLoading = true;
  showGridSkeletons();
  setStatus('Searching for "' + q + '"…');
  fetch(BASE + '/api/search?q=' + encodeURIComponent(q) + '&page=' + currentPage)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      isLoading = false;
      var total = (data.pageInfo && data.pageInfo.total) || (data.results && data.results.length) || 0;
      setStatus('Found ' + total + ' results for "' + q + '"');
      renderGrid(data.results);
      renderPagination(data.pageInfo);
    })
    .catch(function () {
      isLoading = false;
      setStatus('Search failed. Please try again.');
      document.getElementById('resultsGrid').innerHTML = '<div class="error-box" style="grid-column:1/-1"><i class="fas fa-exclamation-circle"></i><p>Could not complete search.</p><button onclick="doSearch(currentPage)">Retry</button></div>';
    });
}

var inp = document.getElementById('searchInp');
var btn = document.getElementById('searchBtn');
if (btn) btn.addEventListener('click', function () { doSearch(1); });
if (inp) {
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(1); });
}

var initQ = getQueryParam('q');
var initPage = parseInt(getQueryParam('page')) || 1;
if (initQ) {
  currentPage = initPage;
  doSearch(initPage);
} else {
  showGridSkeletons();
  setStatus('Showing popular anime');
  fetch(BASE + '/api/home')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var all = (data.trending || []).concat(data.popular || []);
      var seen = {};
      var unique = all.filter(function (a) { if (seen[a.id]) return false; seen[a.id] = true; return true; });
      setStatus('Showing ' + unique.length + ' popular anime');
      renderGrid(unique);
    })
    .catch(function () {
      document.getElementById('resultsGrid').innerHTML = '';
      setStatus('Search for any anime title above.');
    });
}
