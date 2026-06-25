// ─── State ────────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { id: 'housing',    emoji: '🏠', name: 'Housing',              planned: 1200, real: 0 },
  { id: 'groceries',  emoji: '🛒', name: 'Groceries & food',     planned: 400,  real: 0 },
  { id: 'transport',  emoji: '🚗', name: 'Transport',            planned: 200,  real: 0 },
  { id: 'utilities',  emoji: '⚡', name: 'Utilities & bills',    planned: 150,  real: 0 },
  { id: 'savings',    emoji: '💰', name: 'Savings',              planned: 300,  real: 0 },
  { id: 'kids',       emoji: '👶', name: 'Kids & family',        planned: 250,  real: 0 },
];

const ICONS = ['🏠','🛒','🚗','⚡','💰','👶','🍽️','🎬','🏥','📱','🐾','🧴','🎓','✈️','🏋️','🎁','🧾','🔧','🌿','💻'];

let state = {
  months: {},       // { "2026-06": { henry, lauri, categories } }
  activeMonth: null,
};

// ─── Persistence ──────────────────────────────────────────────────────────────

function saveState() {
  localStorage.setItem('hl-budget', JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem('hl-budget');
  if (raw) {
    try { state = JSON.parse(raw); } catch {}
  }
}

function getMonthData(key) {
  if (!state.months[key]) {
    state.months[key] = {
      henry: { planned: 2200, real: 0 },
      lauri: { planned: 2200, real: 0 },
      categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
    };
    saveState();
  }
  return state.months[key];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return '€' + Math.round(n).toLocaleString('de-DE');
}

function monthLabel(key) {
  const [y, m] = key.split('-');
  return new Date(+y, +m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

// ─── Month picker ─────────────────────────────────────────────────────────────

function refreshMonthPicker() {
  const sel = document.getElementById('month-select');
  const keys = Object.keys(state.months).sort().reverse();
  sel.innerHTML = '';
  keys.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = monthLabel(k);
    if (k === state.activeMonth) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  const data = getMonthData(state.activeMonth);

  // Header month label
  document.getElementById('header-month').textContent = monthLabel(state.activeMonth);

  // Income fields
  setInputVal('henry-planned', data.henry.planned);
  setInputVal('henry-real', data.henry.real);
  setInputVal('lauri-planned', data.lauri.planned);
  setInputVal('lauri-real', data.lauri.real);

  recalc();
}

function setInputVal(id, val) {
  const el = document.getElementById(id);
  if (el && document.activeElement !== el) el.value = val || '';
}

// ─── Recalc ───────────────────────────────────────────────────────────────────

function recalc() {
  const data = getMonthData(state.activeMonth);

  const hP = +data.henry.planned || 0;
  const hR = +data.henry.real    || 0;
  const lP = +data.lauri.planned || 0;
  const lR = +data.lauri.real    || 0;

  const totalP = hP + lP;
  const totalR = hR + lR;

  // Ratios
  const rHP = totalP > 0 ? hP / totalP : 0.5;
  const rLP = totalP > 0 ? lP / totalP : 0.5;
  const rHR = totalR > 0 ? hR / totalR : 0.5;
  const rLR = totalR > 0 ? lR / totalR : 0.5;

  // Split display
  document.getElementById('split-display').textContent =
    `${Math.round(rHP * 100)}% / ${Math.round(rLP * 100)}%`;

  document.getElementById('total-planned').textContent = fmt(totalP);
  document.getElementById('total-real').textContent = fmt(totalR);

  // Expenses totals
  let expP = 0, expR = 0;
  data.categories.forEach(c => { expP += +c.planned || 0; expR += +c.real || 0; });

  const remP = totalP - expP;
  const remR = totalR - expR;

  setText('s-exp-planned', fmt(expP));
  setText('s-exp-planned-pct', totalP ? `${Math.round(expP / totalP * 100)}% of income` : '—');
  setText('s-exp-real', fmt(expR));
  setText('s-exp-real-pct', totalR ? `${Math.round(expR / totalR * 100)}% of income` : '—');

  const remPEl = document.getElementById('s-rem-planned');
  remPEl.textContent = fmt(remP);
  remPEl.className = 'scard-value' + (remP < 0 ? ' over' : remP > 0 ? ' under' : '');
  setText('s-rem-planned-sub', remP < 0 ? 'over budget' : 'unallocated');

  const remREl = document.getElementById('s-rem-real');
  remREl.textContent = fmt(remR);
  remREl.className = 'scard-value' + (remR < 0 ? ' over' : remR > 0 ? ' under' : '');
  setText('s-rem-real-sub', remR < 0 ? 'over budget' : 'unallocated');

  // Category rows
  renderCatRows(data, rHP, rLP, rHR, rLR);

  // Split section
  renderSplitSection(data, rHP, rLP, rHR, rLR);

  saveState();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderCatRows(data, rHP, rLP, rHR, rLR) {
  const container = document.getElementById('cat-rows');
  container.innerHTML = '';

  data.categories.forEach((cat, idx) => {
    const planned = +cat.planned || 0;
    const real    = +cat.real    || 0;
    const diff    = real - planned;

    const row = document.createElement('div');
    row.className = 'cat-row';

    const diffClass = diff === 0 ? 'neutral' : diff > 0 ? 'negative' : 'positive';
    const diffLabel = diff === 0 ? '—' : (diff > 0 ? '+' : '') + fmt(diff);

    const hPlanned = fmt(planned * rHP);
    const lPlanned = fmt(planned * rLP);
    const hReal    = fmt(real * rHR);
    const lReal    = fmt(real * rLR);

    row.innerHTML = `
      <div class="cat-name">
        <span class="cat-emoji">${cat.emoji}</span>
        <span>${cat.name}</span>
      </div>
      <input type="number" class="cat-input" data-idx="${idx}" data-field="planned" value="${cat.planned || ''}" placeholder="0" min="0" step="10" />
      <input type="number" class="cat-input" data-idx="${idx}" data-field="real"    value="${cat.real    || ''}" placeholder="0" min="0" step="10" />
      <span class="diff-pill ${diffClass}">${diffLabel}</span>
      <span class="split-display-cell">
        <span class="henry-share">H: ${hReal}</span> · <span class="lauri-share">L: ${lReal}</span>
      </span>
      <button class="btn-icon" data-del="${idx}" title="Remove">✕</button>
    `;
    container.appendChild(row);
  });

  // Bind inputs
  container.querySelectorAll('.cat-input').forEach(input => {
    input.addEventListener('change', e => {
      const idx   = +e.target.dataset.idx;
      const field = e.target.dataset.field;
      data.categories[idx][field] = +e.target.value || 0;
      recalc();
    });
  });

  // Bind delete buttons
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = +e.currentTarget.dataset.del;
      data.categories.splice(idx, 1);
      recalc();
    });
  });
}

function renderSplitSection(data, rHP, rLP, rHR, rLR) {
  const hRows = document.getElementById('henry-split-rows');
  const lRows = document.getElementById('lauri-split-rows');
  hRows.innerHTML = '';
  lRows.innerHTML = '';

  let hTotalP = 0, hTotalR = 0, lTotalP = 0, lTotalR = 0;

  data.categories.forEach(cat => {
    const planned = +cat.planned || 0;
    const real    = +cat.real    || 0;
    const hP = planned * rHP, hR = real * rHR;
    const lP = planned * rLP, lR = real * rLR;
    hTotalP += hP; hTotalR += hR;
    lTotalP += lP; lTotalR += lR;

    hRows.innerHTML += `
      <div class="split-row">
        <span class="split-row-name">${cat.emoji} ${cat.name}</span>
        <div class="split-row-amounts">
          <span class="split-amt planned">${fmt(hP)}</span>
          <span class="split-amt real">${fmt(hR)}</span>
        </div>
      </div>`;
    lRows.innerHTML += `
      <div class="split-row">
        <span class="split-row-name">${cat.emoji} ${cat.name}</span>
        <div class="split-row-amounts">
          <span class="split-amt planned">${fmt(lP)}</span>
          <span class="split-amt real">${fmt(lR)}</span>
        </div>
      </div>`;
  });

  document.getElementById('henry-total-row').innerHTML =
    `<span>Total</span><span>${fmt(hTotalP)} → ${fmt(hTotalR)}</span>`;
  document.getElementById('lauri-total-row').innerHTML =
    `<span>Total</span><span>${fmt(lTotalP)} → ${fmt(lTotalR)}</span>`;
}

// ─── Add category modal ───────────────────────────────────────────────────────

let selectedIcon = '🧾';

function openModal() {
  selectedIcon = '🧾';
  document.getElementById('new-cat-name').value = '';
  buildIconPicker();
  document.getElementById('modal-backdrop').style.display = 'flex';
  setTimeout(() => document.getElementById('new-cat-name').focus(), 50);
}

function closeModal() {
  document.getElementById('modal-backdrop').style.display = 'none';
}

function buildIconPicker() {
  const picker = document.getElementById('icon-picker');
  picker.innerHTML = '';
  ICONS.forEach(icon => {
    const btn = document.createElement('button');
    btn.className = 'icon-opt' + (icon === selectedIcon ? ' selected' : '');
    btn.textContent = icon;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      selectedIcon = icon;
      picker.querySelectorAll('.icon-opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    picker.appendChild(btn);
  });
}

function confirmAddCategory() {
  const name = document.getElementById('new-cat-name').value.trim();
  if (!name) { document.getElementById('new-cat-name').focus(); return; }
  const data = getMonthData(state.activeMonth);
  data.categories.push({ id: uid(), emoji: selectedIcon, name, planned: 0, real: 0 });
  closeModal();
  recalc();
}

// ─── Income listeners ─────────────────────────────────────────────────────────

function bindIncomeInputs() {
  ['henry-planned','henry-real','lauri-planned','lauri-real'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      const data = getMonthData(state.activeMonth);
      data.henry.planned = +document.getElementById('henry-planned').value || 0;
      data.henry.real    = +document.getElementById('henry-real').value    || 0;
      data.lauri.planned = +document.getElementById('lauri-planned').value || 0;
      data.lauri.real    = +document.getElementById('lauri-real').value    || 0;
      recalc();
    });
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  loadState();

  // Ensure current month exists
  const cur = currentMonthKey();
  if (!state.activeMonth || !state.months[state.activeMonth]) {
    state.activeMonth = cur;
    getMonthData(cur);
  }

  refreshMonthPicker();
  bindIncomeInputs();

  // Month picker change
  document.getElementById('month-select').addEventListener('change', e => {
    state.activeMonth = e.target.value;
    render();
  });

  // New month button
  document.getElementById('btn-new-month').addEventListener('click', () => {
    // Find next month after the latest
    const keys = Object.keys(state.months).sort();
    const last = keys[keys.length - 1] || currentMonthKey();
    const [y, m] = last.split('-').map(Number);
    const next = m === 12
      ? `${y + 1}-01`
      : `${y}-${String(m + 1).padStart(2, '0')}`;
    getMonthData(next);
    state.activeMonth = next;
    saveState();
    refreshMonthPicker();
    render();
  });

  // Add category
  document.getElementById('btn-add-cat').addEventListener('click', openModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmAddCategory);
  document.getElementById('modal-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('new-cat-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmAddCategory();
    if (e.key === 'Escape') closeModal();
  });

  render();
}

document.addEventListener('DOMContentLoaded', init);
