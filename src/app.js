// ─── Budget rules ─────────────────────────────────────────────────────────────

const RULES = {
  '50-30-20': {
    label: '50/30/20',
    desc: '50% needs · 30% wants · 20% savings',
    buckets: [
      { id: 'needs',   label: 'Needs',   pct: 50, color: '#534AB7' },
      { id: 'wants',   label: 'Wants',   pct: 30, color: '#0F6E56' },
      { id: 'savings', label: 'Savings', pct: 20, color: '#B87333' },
    ]
  },
  '70-20-10': {
    label: '70/20/10',
    desc: '70% living · 20% savings · 10% giving/debt',
    buckets: [
      { id: 'living',  label: 'Living',  pct: 70, color: '#534AB7' },
      { id: 'savings', label: 'Savings', pct: 20, color: '#0F6E56' },
      { id: 'giving',  label: 'Giving / Debt', pct: 10, color: '#B87333' },
    ]
  },
  '60-20-20': {
    label: '60/20/20',
    desc: '60% committed · 20% wants · 20% savings',
    buckets: [
      { id: 'committed', label: 'Committed', pct: 60, color: '#534AB7' },
      { id: 'wants',     label: 'Wants',     pct: 20, color: '#0F6E56' },
      { id: 'savings',   label: 'Savings',   pct: 20, color: '#B87333' },
    ]
  },
  'zero': {
    label: 'Zero-based',
    desc: 'Every euro assigned — income minus all categories = 0',
    buckets: [
      { id: 'all', label: 'All expenses', pct: 100, color: '#534AB7' },
    ]
  },
  'envelope': {
    label: 'Envelope',
    desc: 'Custom buckets — you decide the percentages',
    buckets: [
      { id: 'housing',   label: 'Housing',    pct: 30, color: '#534AB7' },
      { id: 'transport', label: 'Transport',  pct: 15, color: '#0F6E56' },
      { id: 'food',      label: 'Food',       pct: 12, color: '#B87333' },
      { id: 'savings',   label: 'Savings',    pct: 20, color: '#6B3FA0' },
      { id: 'other',     label: 'Other',      pct: 23, color: '#888' },
    ]
  },
};

// ─── Default categories ───────────────────────────────────────────────────────

function defaultCategories(ruleId) {
  const buckets = RULES[ruleId].buckets;
  const b0 = buckets[0].id;
  const bSav = buckets.find(b => b.id === 'savings')?.id || b0;
  const bWant = buckets.find(b => b.id === 'wants' || b.id === 'living')?.id || b0;

  const needsBucket = ruleId === 'envelope' ? 'housing' :
                      ruleId === '70-20-10' ? 'living' :
                      ruleId === 'zero'     ? 'all' : 'needs';

  return [
    {
      id: 'housing', emoji: '🏠', name: 'Housing', collapsed: false,
      bucket: ruleId === 'envelope' ? 'housing' : needsBucket,
      subs: [{ id: uid(), name: 'Rent / mortgage', real: 0 }]
    },
    {
      id: 'groceries', emoji: '🛒', name: 'Groceries & food', collapsed: false,
      bucket: ruleId === 'envelope' ? 'food' : needsBucket,
      subs: [
        { id: uid(), name: 'Supermarket', real: 0 },
        { id: uid(), name: 'Takeaway & dining', real: 0 },
      ]
    },
    {
      id: 'transport', emoji: '🚗', name: 'Transport', collapsed: false,
      bucket: ruleId === 'envelope' ? 'transport' : needsBucket,
      subs: [
        { id: uid(), name: 'Car payment', real: 0 },
        { id: uid(), name: 'Fuel', real: 0 },
        { id: uid(), name: 'Public transport', real: 0 },
      ]
    },
    {
      id: 'utilities', emoji: '⚡', name: 'Utilities & bills', collapsed: false,
      bucket: ruleId === 'envelope' ? 'other' : needsBucket,
      subs: [
        { id: uid(), name: 'Electricity', real: 0 },
        { id: uid(), name: 'Internet', real: 0 },
        { id: uid(), name: 'Phone', real: 0 },
      ]
    },
    {
      id: 'savings', emoji: '💰', name: 'Savings', collapsed: false,
      bucket: ruleId === 'envelope' ? 'savings' : bSav,
      subs: [
        { id: uid(), name: 'Emergency fund', real: 0 },
        { id: uid(), name: 'Investments', real: 0 },
      ]
    },
    {
      id: 'kids', emoji: '👶', name: 'Kids & family', collapsed: false,
      bucket: ruleId === 'envelope' ? 'other' : needsBucket,
      subs: [
        { id: uid(), name: 'Childcare', real: 0 },
        { id: uid(), name: 'Activities', real: 0 },
      ]
    },
  ];
}

const ICONS = ['🏠','🛒','🚗','⚡','💰','👶','🍽️','🎬','🏥','📱','🐾','🧴','🎓','✈️','🏋️','🎁','🧾','🔧','🌿','💻','🎯','🐶','🎵','🛁','🍺','👗','🏖️','🎮'];

// ─── State ────────────────────────────────────────────────────────────────────

let state = {
  months: {},
  activeMonth: null,
  activeRule: '50-30-20',
};

// ─── Persistence ──────────────────────────────────────────────────────────────

function saveState() { localStorage.setItem('hl-budget', JSON.stringify(state)); }

function loadState() {
  const raw = localStorage.getItem('hl-budget');
  if (raw) { try { state = JSON.parse(raw); } catch {} }
}

function getMonthData(key) {
  if (!state.months[key]) {
    state.months[key] = {
      henry: 2200,
      lauri: 2200,
      categories: defaultCategories(state.activeRule || '50-30-20'),
    };
    saveState();
  }
  return state.months[key];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }
function fmt(n) { return '€' + Math.round(n).toLocaleString('de-DE'); }
function pct(v, t) { return t ? Math.round(v / t * 100) : 0; }

function monthLabel(key) {
  const [y, m] = key.split('-');
  return new Date(+y, +m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function catTotal(cat) {
  return (cat.subs || []).reduce((s, sub) => s + (+sub.real || 0), 0);
}

// ─── Rule UI ──────────────────────────────────────────────────────────────────

function renderRuleBar() {
  const pills = document.getElementById('rule-pills');
  pills.innerHTML = '';
  Object.entries(RULES).forEach(([id, rule]) => {
    const btn = document.createElement('button');
    btn.className = 'rule-pill' + (id === state.activeRule ? ' active' : '');
    btn.textContent = rule.label;
    btn.addEventListener('click', () => {
      state.activeRule = id;
      saveState();
      renderRuleBar();
      recalc();
    });
    pills.appendChild(btn);
  });
  document.getElementById('rule-desc').textContent = RULES[state.activeRule].desc;
}

// ─── Bucket summary ───────────────────────────────────────────────────────────

function renderBuckets(totalIncome, data) {
  const rule = RULES[state.activeRule];
  const container = document.getElementById('buckets');
  container.innerHTML = '';

  // Tally actual spend per bucket
  const actualByBucket = {};
  rule.buckets.forEach(b => actualByBucket[b.id] = 0);
  data.categories.forEach(cat => {
    const bId = cat.bucket || rule.buckets[0].id;
    if (actualByBucket[bId] !== undefined) {
      actualByBucket[bId] += catTotal(cat);
    }
  });

  rule.buckets.forEach(b => {
    const budget = Math.round(totalIncome * b.pct / 100);
    const actual = Math.round(actualByBucket[b.id] || 0);
    const diff   = actual - budget;
    const usedPct = budget > 0 ? Math.min(100, Math.round(actual / budget * 100)) : 0;
    const over = actual > budget;

    const card = document.createElement('div');
    card.className = 'bucket-card';
    card.innerHTML = `
      <div class="bucket-top">
        <div>
          <span class="bucket-name">${b.label}</span>
          <span class="bucket-pct-badge" style="background:${b.color}22;color:${b.color}">${b.pct}%</span>
        </div>
        <div class="bucket-amounts">
          <span class="bucket-budget">${fmt(budget)}</span>
          <span class="bucket-actual ${over ? 'over' : ''}">${fmt(actual)}</span>
        </div>
      </div>
      <div class="bucket-bar-track">
        <div class="bucket-bar-fill" style="width:${usedPct}%;background:${over ? '#C0392B' : b.color}"></div>
      </div>
      <div class="bucket-foot">
        <span class="bucket-used">${usedPct}% used</span>
        <span class="bucket-diff ${over ? 'over' : 'under'}">${over ? '+' : ''}${fmt(diff)}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ─── Month picker ─────────────────────────────────────────────────────────────

function refreshMonthPicker() {
  const sel = document.getElementById('month-select');
  const keys = Object.keys(state.months).sort().reverse();
  sel.innerHTML = '';
  keys.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = monthLabel(k);
    if (k === state.activeMonth) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ─── Render / Recalc ──────────────────────────────────────────────────────────

function render() {
  const data = getMonthData(state.activeMonth);
  document.getElementById('header-month').textContent = monthLabel(state.activeMonth);
  const hi = document.getElementById('henry-income');
  const li = document.getElementById('lauri-income');
  if (document.activeElement !== hi) hi.value = data.henry || '';
  if (document.activeElement !== li) li.value = data.lauri || '';
  recalc();
}

function recalc() {
  const data = getMonthData(state.activeMonth);
  const henry  = +data.henry || 0;
  const lauri  = +data.lauri || 0;
  const total  = henry + lauri;
  const rH = total > 0 ? henry / total : 0.5;
  const rL = total > 0 ? lauri / total : 0.5;

  document.getElementById('split-display').textContent =
    `${Math.round(rH * 100)}% / ${Math.round(rL * 100)}%`;
  document.getElementById('total-income').textContent = fmt(total);

  renderBuckets(total, data);
  renderCatRows(data, total, rH, rL);
  renderSplitSection(data, rH, rL);
  saveState();
}

// ─── Category rows ────────────────────────────────────────────────────────────

function renderCatRows(data, totalIncome, rH, rL) {
  const rule = RULES[state.activeRule];
  const container = document.getElementById('cat-rows');
  container.innerHTML = '';

  data.categories.forEach((cat, cIdx) => {
    const actual  = catTotal(cat);
    const bucket  = rule.buckets.find(b => b.id === cat.bucket) || rule.buckets[0];
    const bucketBudgetTotal = Math.round(totalIncome * bucket.pct / 100);
    const catBudget = data.categories.filter(c => (c.bucket || rule.buckets[0].id) === bucket.id).length > 0
      ? null : bucketBudgetTotal; // no per-cat budget in rule-based mode; show bucket context

    const diff    = actual; // compare to 0 since budget is the bucket
    const chevron = cat.collapsed ? '▶' : '▼';

    const parent = document.createElement('div');
    parent.className = 'cat-group';

    parent.innerHTML = `
      <div class="cat-parent-row">
        <div class="cat-parent-left">
          <button class="btn-chevron" data-toggle="${cIdx}">${chevron}</button>
          <span class="cat-emoji">${cat.emoji}</span>
          <span class="cat-parent-name">${cat.name}</span>
          <span class="bucket-tag" style="background:${bucket.color}22;color:${bucket.color}">${bucket.label}</span>
        </div>
        <span class="cat-parent-total">—</span>
        <span class="cat-parent-total">${fmt(actual)}</span>
        <span class="diff-pill neutral">—</span>
        <span class="split-display-cell">
          <span class="henry-share">H: ${fmt(actual * rH)}</span>
          · <span class="lauri-share">L: ${fmt(actual * rL)}</span>
        </span>
        <button class="btn-icon btn-del-cat" data-del-cat="${cIdx}" title="Delete">✕</button>
      </div>
    `;

    const subsWrap = document.createElement('div');
    subsWrap.className = 'subs-wrap' + (cat.collapsed ? ' collapsed' : '');

    (cat.subs || []).forEach((sub, sIdx) => {
      const subRow = document.createElement('div');
      subRow.className = 'cat-sub-row';
      subRow.innerHTML = `
        <div class="sub-name-cell">
          <span class="sub-indent">└</span>
          <span class="sub-name-text">${sub.name}</span>
        </div>
        <span class="sub-budget-cell">—</span>
        <input type="number" class="sub-input" data-cidx="${cIdx}" data-sidx="${sIdx}"
          value="${sub.real || ''}" placeholder="0" min="0" step="10" />
        <span class="diff-pill neutral">—</span>
        <span class="split-display-cell">
          <span class="henry-share">H: ${fmt((+sub.real || 0) * rH)}</span>
          · <span class="lauri-share">L: ${fmt((+sub.real || 0) * rL)}</span>
        </span>
        <button class="btn-icon btn-del-sub" data-cidx="${cIdx}" data-sidx="${sIdx}" title="Remove">✕</button>
      `;
      subsWrap.appendChild(subRow);
    });

    const addSubRow = document.createElement('div');
    addSubRow.className = 'add-sub-row';
    addSubRow.innerHTML = `<button class="btn-add-sub" data-cidx="${cIdx}">+ Add item</button>`;
    subsWrap.appendChild(addSubRow);
    parent.appendChild(subsWrap);
    container.appendChild(parent);
  });

  // Events
  container.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', e => {
      const cIdx = +e.currentTarget.dataset.toggle;
      data.categories[cIdx].collapsed = !data.categories[cIdx].collapsed;
      recalc();
    });
  });

  container.querySelectorAll('.sub-input').forEach(input => {
    input.addEventListener('change', e => {
      const { cidx, sidx } = e.target.dataset;
      data.categories[+cidx].subs[+sidx].real = +e.target.value || 0;
      recalc();
    });
  });

  container.querySelectorAll('.btn-del-sub').forEach(btn => {
    btn.addEventListener('click', e => {
      const { cidx, sidx } = e.currentTarget.dataset;
      data.categories[+cidx].subs.splice(+sidx, 1);
      recalc();
    });
  });

  container.querySelectorAll('.btn-del-cat').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = +e.currentTarget.dataset.delCat;
      if (confirm(`Delete "${data.categories[idx].name}" and all its items?`)) {
        data.categories.splice(idx, 1);
        recalc();
      }
    });
  });

  container.querySelectorAll('.btn-add-sub').forEach(btn => {
    btn.addEventListener('click', e => openSubModal(+e.currentTarget.dataset.cidx));
  });
}

// ─── Split section ────────────────────────────────────────────────────────────

function renderSplitSection(data, rH, rL) {
  const hRows = document.getElementById('henry-split-rows');
  const lRows = document.getElementById('lauri-split-rows');
  hRows.innerHTML = '';
  lRows.innerHTML = '';

  let hTotal = 0, lTotal = 0;
  data.categories.forEach(cat => {
    const actual = catTotal(cat);
    const hA = actual * rH, lA = actual * rL;
    hTotal += hA; lTotal += lA;
    hRows.innerHTML += `<div class="split-row"><span class="split-row-name">${cat.emoji} ${cat.name}</span><span class="split-amt real">${fmt(hA)}</span></div>`;
    lRows.innerHTML += `<div class="split-row"><span class="split-row-name">${cat.emoji} ${cat.name}</span><span class="split-amt real">${fmt(lA)}</span></div>`;
  });

  document.getElementById('henry-total-row').innerHTML = `<span>Total</span><span>${fmt(hTotal)}</span>`;
  document.getElementById('lauri-total-row').innerHTML = `<span>Total</span><span>${fmt(lTotal)}</span>`;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

let selectedIcon = '🧾';
let modalMode    = 'category';
let modalCatIdx  = null;

function openCatModal() {
  modalMode = 'category';
  selectedIcon = '🧾';
  document.getElementById('new-cat-name').value = '';
  document.getElementById('modal-icon-row').style.display = '';
  document.getElementById('modal-bucket-label').style.display = '';
  document.getElementById('modal-bucket').style.display = '';
  document.getElementById('modal-title').textContent = 'New category';
  buildIconPicker();
  buildBucketSelect(null);
  document.getElementById('modal-backdrop').style.display = 'flex';
  setTimeout(() => document.getElementById('new-cat-name').focus(), 50);
}

function openSubModal(cIdx) {
  modalMode = 'sub';
  modalCatIdx = cIdx;
  document.getElementById('new-cat-name').value = '';
  document.getElementById('modal-icon-row').style.display = 'none';
  document.getElementById('modal-bucket-label').style.display = 'none';
  document.getElementById('modal-bucket').style.display = 'none';
  const data = getMonthData(state.activeMonth);
  document.getElementById('modal-title').textContent = `Add item to "${data.categories[cIdx].name}"`;
  document.getElementById('modal-backdrop').style.display = 'flex';
  setTimeout(() => document.getElementById('new-cat-name').focus(), 50);
}

function closeModal() { document.getElementById('modal-backdrop').style.display = 'none'; }

function buildIconPicker() {
  const picker = document.getElementById('icon-picker');
  picker.innerHTML = '';
  ICONS.forEach(icon => {
    const btn = document.createElement('button');
    btn.className = 'icon-opt' + (icon === selectedIcon ? ' selected' : '');
    btn.textContent = icon; btn.type = 'button';
    btn.addEventListener('click', () => {
      selectedIcon = icon;
      picker.querySelectorAll('.icon-opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    picker.appendChild(btn);
  });
}

function buildBucketSelect(currentBucket) {
  const sel = document.getElementById('modal-bucket');
  sel.innerHTML = '';
  RULES[state.activeRule].buckets.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id; opt.textContent = `${b.label} (${b.pct}%)`;
    if (b.id === currentBucket) opt.selected = true;
    sel.appendChild(opt);
  });
}

function confirmModal() {
  const name = document.getElementById('new-cat-name').value.trim();
  if (!name) { document.getElementById('new-cat-name').focus(); return; }
  const data = getMonthData(state.activeMonth);

  if (modalMode === 'category') {
    const bucket = document.getElementById('modal-bucket').value;
    data.categories.push({ id: uid(), emoji: selectedIcon, name, collapsed: false, bucket, subs: [] });
  } else {
    data.categories[modalCatIdx].subs.push({ id: uid(), name, real: 0 });
    data.categories[modalCatIdx].collapsed = false;
  }
  closeModal();
  recalc();
}

// ─── Income ───────────────────────────────────────────────────────────────────

function bindIncomeInputs() {
  document.getElementById('henry-income').addEventListener('change', () => {
    const data = getMonthData(state.activeMonth);
    data.henry = +document.getElementById('henry-income').value || 0;
    recalc();
  });
  document.getElementById('lauri-income').addEventListener('change', () => {
    const data = getMonthData(state.activeMonth);
    data.lauri = +document.getElementById('lauri-income').value || 0;
    recalc();
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  loadState();
  if (!state.activeRule) state.activeRule = '50-30-20';

  const cur = currentMonthKey();
  if (!state.activeMonth || !state.months[state.activeMonth]) {
    state.activeMonth = cur;
    getMonthData(cur);
  }

  renderRuleBar();
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
