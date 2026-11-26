// Token Radar client-side logic: zero network, renders board, live tokens, comps, filters, sorting, and detail modal.

(function () {
  const radar = window.RADAR;
  if (!radar) {
    document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;">Error: data.js not loaded.</div>';
    return;
  }

  let rows = radar.rows;
  let currentSort = { key: 'rank', asc: true };
  let currentFilter = { search: '', category: '', chain: '', watchlistOnly: false };
  let activeTab = 'board';

  // Populate header meta
  const topMeta = document.getElementById('top-meta');
  topMeta.innerHTML = `
    <span>As of: <b>${radar.as_of}</b></span>
    <span>Watchlist: <b>${radar.watchlist_size}</b></span>
    <span>Board: <b>${radar.board_size} rows</b></span>
    <span>Model: <b>${radar.model_version}</b></span>
  `;

  // Populate facts
  const facts = document.getElementById('summary-facts');
  facts.innerHTML = `
    <div class="fact"><span>Watchlist Floor</span><b>$${(radar.floor_usd / 1e6).toFixed(0)}M TVL</b></div>
    <div class="fact"><span>Pre-Token Radar Rows</span><b>${radar.board_size} protocols</b></div>
    <div class="fact"><span>Below Floor Early Finds</span><b>${radar.early_size} protocols</b></div>
    <div class="fact"><span>Live Trading Feed</span><b>${radar.live_size} protocols</b></div>
  `;

  // Populate category filter
  const categorySelect = document.getElementById('category-select');
  const categories = [...new Set(rows.map(r => r.category).filter(Boolean))].sort();
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  // Populate chain filter
  const chainSelect = document.getElementById('chain-select');
  const chains = [...new Set(rows.flatMap(r => r.chains))].sort();
  chains.forEach(chain => {
    const opt = document.createElement('option');
    opt.value = chain;
    opt.textContent = chain;
    chainSelect.appendChild(opt);
  });

  // Populate live table
  document.getElementById('live-count').textContent = radar.live.length;
  const liveTbody = document.getElementById('live-tbody');
  radar.live.forEach(p => {
    const tr = document.createElement('tr');
    const fdvRatio = (p.mcap_usd && p.tvl_usd) ? (p.mcap_usd / p.tvl_usd).toFixed(2) + 'x' : 'N/A';
    tr.innerHTML = `
      <td><div class="name-cell"><b>${escapeHtml(p.name)}</b><span class="sub">${escapeHtml(p.slug)}</span></div></td>
      <td>${escapeHtml(p.category || 'Unclassified')}</td>
      <td>${escapeHtml(p.chains.join(', ') || 'N/A')}</td>
      <td class="num">${formatUsd(p.mcap_usd)}</td>
      <td class="num">${formatUsd(p.tvl_usd)}</td>
      <td class="num">${fdvRatio}</td>
      <td class="num ${formatChangeClass(p.change_7d)}">${formatChange(p.change_7d)}</td>
    `;
    liveTbody.appendChild(tr);
  });

  // Populate model category multiples
  const multiplesList = document.getElementById('category-multiples-list');
  const sortedComps = Object.entries(radar.model.category_multiples).sort((a, b) => b[1] - a[1]);
  sortedComps.forEach(([cat, mult]) => {
    const card = document.createElement('div');
    card.className = 'multiple-card';
    card.innerHTML = `<span>${escapeHtml(cat)}</span><b>${mult.toFixed(2)}x</b>`;
    multiplesList.appendChild(card);
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view-panel').forEach(v => v.hidden = true);
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-view');
      document.getElementById(`view-${activeTab}`).hidden = false;
    });
  });

  // Filter & Search listeners
  const searchInput = document.getElementById('search-input');
  const watchlistToggle = document.getElementById('watchlist-toggle');

  searchInput.addEventListener('input', e => {
    currentFilter.search = e.target.value.toLowerCase().trim();
    renderBoard();
  });
  categorySelect.addEventListener('change', e => {
    currentFilter.category = e.target.value;
    renderBoard();
  });
  chainSelect.addEventListener('change', e => {
    currentFilter.chain = e.target.value;
    renderBoard();
  });
  watchlistToggle.addEventListener('change', e => {
    currentFilter.watchlistOnly = e.target.checked;
    renderBoard();
  });

  // Sort listeners
  document.querySelectorAll('th button[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (currentSort.key === key) {
        currentSort.asc = !currentSort.asc;
      } else {
        currentSort.key = key;
        currentSort.asc = key === 'name' || key === 'rank';
      }
      renderBoard();
    });
  });

  function renderBoard() {
    let filtered = rows.filter(r => {
      if (currentFilter.category && r.category !== currentFilter.category) return false;
      if (currentFilter.chain && !r.chains.includes(currentFilter.chain)) return false;
      if (currentFilter.watchlistOnly && r.tvl_usd < radar.floor_usd) return false;
      if (currentFilter.search) {
        const q = currentFilter.search;
        const matchName = r.name.toLowerCase().includes(q);
        const matchSlug = r.slug.toLowerCase().includes(q);
        const matchCat = (r.category || '').toLowerCase().includes(q);
        const matchChain = r.chains.some(c => c.toLowerCase().includes(q));
        if (!matchName && !matchSlug && !matchCat && !matchChain) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      let valA, valB;
      switch (currentSort.key) {
        case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
        case 'tvl': valA = a.tvl_usd; valB = b.tvl_usd; break;
        case 'growth': valA = a.change_7d ?? -999; valB = b.change_7d ?? -999; break;
        case 'age': valA = a.age_days ?? 0; valB = b.age_days ?? 0; break;
        case 'implied': valA = a.implied_value_usd; valB = b.implied_value_usd; break;
        case 'rank': default: valA = a.rank; valB = b.rank; break;
      }
      if (valA < valB) return currentSort.asc ? -1 : 1;
      if (valA > valB) return currentSort.asc ? 1 : -1;
      return 0;
    });

    const tbody = document.getElementById('board-tbody');
    tbody.innerHTML = '';
    document.getElementById('row-count').textContent = `Showing ${filtered.length} of ${rows.length} rows`;

    filtered.forEach(r => {
      const tr = document.createElement('tr');
      tr.addEventListener('click', () => openDetail(r.slug));
      const ageStr = r.age_days !== null ? `${r.age_days}d` : 'Unknown';
      tr.innerHTML = `
        <td class="num"><b>#${r.rank}</b></td>
        <td><div class="name-cell"><b>${escapeHtml(r.name)}</b><span class="sub">${escapeHtml(r.slug)}</span></div></td>
        <td>${escapeHtml(r.category || 'Unclassified')}</td>
        <td>${escapeHtml(r.chains.join(', ') || 'N/A')}</td>
        <td class="num">${formatUsd(r.tvl_usd)}</td>
        <td class="num ${formatChangeClass(r.change_7d)}">${formatChange(r.change_7d)}</td>
        <td class="num">${ageStr}</td>
        <td class="num"><b>${formatUsd(r.implied_value_usd)}</b></td>
        <td><span class="badge badge-pre">Pre-Token</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Detail Modal / Drawer
  const modal = document.getElementById('detail-modal');
  const detailContent = document.getElementById('detail-content');

  function openDetail(slug) {
    const row = rows.find(r => r.slug === slug);
    if (!row) return;

    const steps = generateFarmSteps(row);

    detailContent.innerHTML = `
      <div class="detail-header">
        <div>
          <span class="badge badge-pre">Rank #${row.rank} Pre-Token</span>
          <h2>${escapeHtml(row.name)}</h2>
          <span class="sub">${escapeHtml(row.slug)} &bull; ${escapeHtml(row.category || 'Unclassified')} &bull; Chains: ${escapeHtml(row.chains.join(', ') || 'None')}</span>
        </div>
        <button class="close-btn" id="close-modal">&times;</button>
      </div>
      <div class="detail-body">
        <div class="detail-section">
          <h3>Valuation Breakdown (Implied Value: ${formatUsd(row.implied_value_usd)})</h3>
          <div class="breakdown-grid">
            <div><span>TVL</span><b>${formatUsd(row.tvl_usd)}</b></div>
            <div><span>Category Multiple</span><b>${row.category_multiple.toFixed(2)}x</b></div>
            <div><span>7d Growth Mult</span><b>${row.growth_multiplier.toFixed(2)}x</b></div>
            <div><span>Maturity Mult</span><b>${row.maturity_multiplier.toFixed(2)}x</b></div>
            <div><span>Track Record Age</span><b>${row.age_days !== null ? row.age_days + ' days' : 'Unknown'}</b></div>
            <div><span>Model Claim</span><b>Pre-Token Estimate</b></div>
          </div>
        </div>

        <div class="detail-section">
          <h3>Actionable Farm Plan</h3>
          <ol class="farm-steps-list">
            ${steps.map(s => `<li><b>${escapeHtml(s.action)}</b><span class="sub">Cost: ${escapeHtml(s.cost)} &bull; Time: ${escapeHtml(s.time)}</span></li>`).join('')}
          </ol>
        </div>
      </div>
    `;

    document.getElementById('close-modal').addEventListener('click', () => modal.close());
    modal.showModal();
    window.location.hash = `detail=${slug}`;
  }

  modal.addEventListener('close', () => {
    if (window.location.hash.startsWith('#detail=')) {
      history.pushState('', document.title, window.location.pathname);
    }
  });

  function generateFarmSteps(r) {
    const chain = r.chains[0] || 'Ethereum';
    const cap = r.tvl_usd >= 1e9 ? 200 : 100;
    const cat = (r.category || '').toLowerCase();
    let action = `Deposit $${cap} liquidity/collateral into ${r.name} on ${chain} and maintain position.`;
    if (cat.includes('lend')) action = `Supply $${cap} USDC into ${r.name} lending markets on ${chain} and borrow conservatively.`;
    if (cat.includes('dex')) action = `Add $${cap} liquidity to high-volume pools on ${r.name} on ${chain}.`;
    if (cat.includes('bridge')) action = `Bridge $${cap} through ${r.name} to active destination networks.`;

    return [
      { action: `Set up a secure, clean burner wallet for ${r.name} interaction on ${chain}.`, cost: '~$2 gas', time: '5m' },
      { action: action, cost: `$${cap} capital + ~$5 gas`, time: '15m' },
      { action: `Perform weekly engagement (compound yields, vote, or rebalance).`, cost: '~$2 / wk', time: '10m' },
      { action: `Maintain position for at least 45 days to capture multi-snapshot airdrop eligibility.`, cost: `$${cap} locked`, time: '45d' },
      { action: `Claim points/tokens strictly from ${r.name}'s official verified app URL; never pay to claim.`, cost: 'Free', time: '5m' }
    ];
  }

  renderBoard();

  // Handle URL hash on load (#detail=... or #filter=...)
  if (window.location.hash.startsWith('#detail=')) {
    const slug = window.location.hash.slice(8);
    setTimeout(() => openDetail(slug), 50);
  } else if (window.location.hash.startsWith('#filter=')) {
    const cat = decodeURIComponent(window.location.hash.slice(8));
    categorySelect.value = cat;
    currentFilter.category = cat;
    renderBoard();
  }

  function formatUsd(n) {
    if (n === null || n === undefined) return 'N/A';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + n.toLocaleString();
  }

  function formatChange(n) {
    if (n === null || n === undefined) return 'N/A';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }

  function formatChangeClass(n) {
    if (n === null || n === undefined) return '';
    return n > 0 ? 'pos' : n < 0 ? 'neg' : '';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
