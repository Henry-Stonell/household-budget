// ─── State ────────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  {
    id: 'housing', emoji: '🏠', name: 'Housing', collapsed: false,
    subs: [
      { id: uid(), name: 'Rent / mortgage', planned: 1200, real: 0 },
    ]
  },
  {
    id: 'groceries', emoji: '🛒', name: 'Groceries & food', collapsed: false,
    subs: [
      { id: uid(), name: 'Supermarket', planned: 300, real: 0 },
      { id: uid(), name: 'Takeaway & dining', planned: 100, real: 0 },
    ]
  },
  {
    id: 'transport', emoji: '🚗', name: 'Transport', collapsed: false,
    subs: [
      { id: uid(), name: 'Car payment', planned: 0, real: 0 },
      { id: uid(), name: 'Fuel', planned: 100, real: 0 },
      { id: uid(), name: 'Public transport', planned: 60, real: 0 },
    ]
  },
  {
    id: 'utilities', emoji: '⚡', name: 'Utilities & bills', collapsed: false,
    subs: [
      { id: uid(), name: 'Electricity', planned: 80, real: 0 },
      { id: uid(), name: 'Internet', planned: 40, real: 0 },
      { id: uid(), name: 'Phone', planned: 30, real: 0 },
    ]
  },
  {
    id: 'savings', emoji: '💰', name: 'Savings', collapsed: false,
    subs: [
      { id: uid(), name: 'Emergency fund', planned: 200, real: 0 },
      { id: uid(), name: 'Investments', planned: 100, real: 0 },
    ]
  },
  {
    id: 'kids', emoji: '👶', name: 'Kids & family', collapsed: false,
    subs: [
      { id: uid(), name: 'Childcare', planned: 200, real: 0 },
      { id: uid(), name: 'Activities', planned: 50, real: 0 },
    ]
  },
];

const ICONS = ['🏠','🛒','🚗','⚡','💰','👶','🍽️','🎬','🏥','📱','🐾','🧴','🎓','✈️','🏋️','🎁','🧾','🔧','🌿','💻','🎯','🐶','🎵','🛁','🍺','👗','🏖️','🎮'];

let state = {
  months: {},
  activeMonth: null,
};

// ─── Persistence ──────────────────────────────────────────────────────────────

function saveState() {
  localStorage.setItem('hl-budget', JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem('hl-budget');
  if (raw) { try { state = JSON.parse(raw); } catch {} }
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

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

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

function catTotals(cat) {
  let planned = 0, real = 0;
  (cat.subs || []).forEach(s => { planned += +s.planned || 0; real += +s.real || 0; });
  return { planned, real };
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
  document.getElementById('header-month').textContent = monthLabel(state.activeMonth);
  setInputVal('henry-planned', data.henry.planned);
  setInputVal('henry-real',    data.henry.real);
  setInputVal('lauri-planned', data.lauri.planned);
  setInputVal('lauri-real',    data.lauri.real);
  recalc();
}

function setInputVal(id, val) {
  const el = document.getElementById(id);
  if (el && document.activeElement !== el) el.value = val || '';
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
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

  const rHP = totalP > 0 ? hP / totalP : 0.5;
  const rLP = totalP > 0 ? lP / totalP : 0.5;
  const rHR = totalR > 0 ? hR / totalR : 0.5;
  const rLR = totalR > 0 ? lR / totalR : 0.5;

  document.getElementById('split-display').textContent =
    `${Math.round(rHP * 100)}% / ${Math.round(rLP * 100)}%`;
  document.getElementById('total-planned').textContent = fmt(totalP);
  document.getElementById('total-real').textContent    = fmt(totalR);

  let expP = 0, expR = 0;
  data.categories.forEach(cat => {
    const t = catTotals(cat);
    expP += t.planned; expR += t.real;
  });

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

  renderCatRows(data, rHP, rLP, rHR, rLR);
  renderSplitSection(data, rHP, rLP, rHR, rLR);
  saveState();
}

// ─── Category rows ────────────────────────────────────────────────────────────

function renderCatRows(data, rHP, rLP, rHR, rLR) {
  const container = document.getElementById('cat-rows');
  container.innerHTML = '';

  data.categories.forEach((cat, cIdx) => {
    const totals  = catTotals(cat);
    const diff    = totals.real - totals.planned;
    const diffCls = diff === 0 ? 'neutral' : diff > 0 ? 'negative' : 'positive';
    const diffLbl = diff === 0 ? '—' : (diff > 0 ? '+' : '') + fmt(diff);

    // ── Parent row ──
    const parent = document.createElement('div');
    parent.className = 'cat-group';

    const chevron = cat.collapsed ? '▶' : '▼';

    parent.innerHTML = `
      <div class="cat-parent-row" data-cidx="${cIdx}">
        <div class="cat-parent-left">
          <button class="btn-chevron" data-toggle="${cIdx}">${chevron}</button>
          <span class="cat-emoji">${cat.emoji}</span>
          <span class="cat-parent-name">${cat.name}</span>
        </div>
        <span class="cat-parent-total">${fmt(totals.planned)}</span>
        <span class="cat-parent-total">${fmt(totals.real)}</span>
        <span class="diff-pill ${diffCls}">${diffLbl}</span>
        <span class="split-display-cell">
          <span class="henry-share">H: ${fmt(totals.real * rHR)}</span>
          · <span class="lauri-share">L: ${fmt(totals.real * rLR)}</span>
        </span>
        <button class="btn-icon btn-del-cat" data-del-cat="${cIdx}" title="Delete category">✕</button>
      </div>
    `;

    // ── Subcategory block ──
    const subsWrap = document.createElement('div');
    subsWrap.className = 'subs-wrap' + (cat.collapsed ? ' collapsed' : '');

    (cat.subs || []).forEach((sub, sIdx) => {
      const sDiff    = (+sub.real || 0) - (+sub.planned || 0);
      const sDiffCls = sDiff === 0 ? 'neutral' : sDiff > 0 ? 'negative' : 'positive';
      const sDiffLbl = sDiff === 0 ? '—' : (sDiff > 0 ? '+' : '') + fmt(sDiff);

      const subRow = document.createElement('div');
      subRow.className = 'cat-sub-row';
      subRow.innerHTML = `
        <div class="sub-name-cell">
          <span class="sub-indent">└</span>
          <span class="sub-name-text">${sub.name}</span>
        </div>
        <input type="number" class="sub-input" data-cidx="${cIdx}" data-sidx="${sIdx}" data-field="planned"
          value="${sub.planned || ''}" placeholder="0" min="0" step="10" />
        <input type="number" class="sub-input" data-cidx="${cIdx}" data-sidx="${sIdx}" data-field="real"
          value="${sub.real || ''}" placeholder="0" min="0" step="10" />
        <span class="diff-pill ${sDiffCls}">${sDiffLbl}</span>
        <span class="split-display-cell">
          <span class="henry-share">H: ${fmt((+sub.real || 0) * rHR)}</span>
          · <span class="lauri-share">L: ${fmt((+sub.real || 0) * rLR)}</span>
        </span>
        <button class="btn-icon btn-del-sub" data-cidx="${cIdx}" data-sidx="${sIdx}" title="Remove">✕</button>
      `;
      subsWrap.appendChild(subRow);
    });

    // Add subcategory button
    const addSubRow = document.createElement('div');
    addSubRow.className = 'add-sub-row';
    addSubRow.innerHTML = `
      <button class="btn-add-sub" data-cidx="${cIdx}">+ Add item</button>
    `;
    subsWrap.appendChild(addSubRow);
    parent.appendChild(subsWrap);
    container.appendChild(parent);
  });

  // ── Event binding ──

  // Toggle collapse
  container.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', e => {
      const cIdx = +e.currentTarget.dataset.toggle;
      data.categories[cIdx].collapsed = !data.categories[cIdx].collapsed;
      recalc();
    });
  });

  // Sub inputs
  container.querySelectorAll('.sub-input').forEach(input => {
    input.addEventListener('change', e => {
      const { cidx, sidx, field } = e.target.dataset;
      data.categories[+cidx].subs[+sidx][field] = +e.target.value || 0;
      recalc();
    });
  });

  // Delete subcategory
  container.querySelectorAll('.btn-del-sub').forEach(btn => {
    btn.addEventListener('click', e => {
      const { cidx, sidx } = e.currentTarget.dataset;
      data.categories[+cidx].subs.splice(+sidx, 1);
      recalc();
    });
  });

  // Delete parent category
  container.querySelectorAll('.btn-del-cat').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = +e.currentTarget.dataset.delCat;
      if (confirm(`Delete "${data.categories[idx].name}" and all its items?`)) {
        data.categories.splice(idx, 1);
        recalc();
      }
    });
  });

  // Add subcategory — inline
  container.querySelectorAll('.btn-add-sub').forEach(btn => {
    btn.addEventListener('click', e => {
      const cIdx = +e.currentTarget.dataset.cidx;
      openSubModal(cIdx);
    });
  });
}

// ─── Split section ────────────────────────────────────────────────────────────

function renderSplitSection(data, rHP, rLP, rHR, rLR) {
  const hRows = document.getElementById('henry-split-rows');
  const lRows = document.getElementById('lauri-split-rows');
  hRows.innerHTML = '';
  lRows.innerHTML = '';

  let hTotalP = 0, hTotalR = 0, lTotalP = 0, lTotalR = 0;

  data.categories.forEach(cat => {
    const t = catTotals(cat);
    const hP = t.planned * rHP, hR = t.real * rHR;
    const lP = t.planned * rLP, lR = t.real * rLR;
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

// ─── Modals ───────────────────────────────────────────────────────────────────

let selectedIcon = '🧾';
let modalMode    = 'category'; // 'category' | 'sub'
let modalCatIdx  = null;

function openCatModal() {
  modalMode = 'category';
  selectedIcon = '🧾';
  document.getElementById('new-cat-name').value = '';
  document.getElementById('modal-icon-row').style.display = '';
  document.getElementById('modal-title').textContent = 'New category';
  buildIconPicker();
  document.getElementById('modal-backdrop').style.display = 'flex';
  setTimeout(() => document.getElementById('new-cat-name').focus(), 50);
}

function openSubModal(cIdx) {
  modalMode   = 'sub';
  modalCatIdx = cIdx;
  document.getElementById('new-cat-name').value = '';
  document.getElementById('modal-icon-row').style.display = 'none';
  const data = getMonthData(state.activeMonth);
  document.getElementById('modal-title').textContent = `Add item to "${data.categories[cIdx].name}"`;
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

function confirmModal() {
  const name = document.getElementById('new-cat-name').value.trim();
  if (!name) { document.getElementById('new-cat-name').focus(); return; }
  const data = getMonthData(state.activeMonth);

  if (modalMode === 'category') {
    data.categories.push({
      id: uid(), emoji: selectedIcon, name, collapsed: false,
      subs: []
    });
  } else {
    data.categories[modalCatIdx].subs.push({
      id: uid(), name, planned: 0, real: 0
    });
    data.categories[modalCatIdx].collapsed = false;
  }

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

  const cur = currentMonthKey();
  if (!state.activeMonth || !state.months[state.activeMonth]) {
    state.activeMonth = cur;
    getMonthData(cur);
  }

  refreshMonthPicker();
  bindIncomeInputs();

  document.getElementById('month-select').addEventListener('change', e => {
    state.activeMonth = e.target.value;
    render();
  });

  document.getElementById('btn-new-month').addEventListener('click', () => {
    const keys = Object.keys(state.months).sort();
    const last = keys[keys.length - 1] || currentMonthKey();
    const [y, m] = last.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    getMonthData(next);
    state.activeMonth = next;
    saveState();
    refreshMonthPicker();
    render();
  });

  document.getElementById('btn-add-cat').addEventListener('click', openCatModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmModal);
  document.getElementById('modal-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('new-cat-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmModal();
    if (e.key === 'Escape') closeModal();
  });

  render();
}

document.addEventListener('DOMContentLoaded', init);
