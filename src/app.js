// ─── Budget rules ─────────────────────────────────────────────────────────────

const RULES = {
  '50-30-20': {
    label: '50/30/20', desc: '50% needs · 30% wants · 20% savings',
    buckets: [
      { id: 'needs',   label: 'Needs',   pct: 50, color: '#534AB7' },
      { id: 'wants',   label: 'Wants',   pct: 30, color: '#0F6E56' },
      { id: 'savings', label: 'Savings', pct: 20, color: '#B87333' },
    ]
  },
  '70-20-10': {
    label: '70/20/10', desc: '70% living · 20% savings · 10% giving/debt',
    buckets: [
      { id: 'living',  label: 'Living',       pct: 70, color: '#534AB7' },
      { id: 'savings', label: 'Savings',      pct: 20, color: '#0F6E56' },
      { id: 'giving',  label: 'Giving / Debt',pct: 10, color: '#B87333' },
    ]
  },
  '60-20-20': {
    label: '60/20/20', desc: '60% committed · 20% wants · 20% savings',
    buckets: [
      { id: 'committed', label: 'Committed', pct: 60, color: '#534AB7' },
      { id: 'wants',     label: 'Wants',     pct: 20, color: '#0F6E56' },
      { id: 'savings',   label: 'Savings',   pct: 20, color: '#B87333' },
    ]
  },
  'zero': {
    label: 'Zero-based', desc: 'Every euro assigned — income minus all categories = 0',
    buckets: [{ id: 'all', label: 'All expenses', pct: 100, color: '#534AB7' }]
  },
  'envelope': {
    label: 'Envelope', desc: 'Custom buckets — you decide the percentages',
    buckets: [
      { id: 'housing',   label: 'Housing',   pct: 30, color: '#534AB7' },
      { id: 'transport', label: 'Transport', pct: 15, color: '#0F6E56' },
      { id: 'food',      label: 'Food',      pct: 12, color: '#B87333' },
      { id: 'savings',   label: 'Savings',   pct: 20, color: '#6B3FA0' },
      { id: 'other',     label: 'Other',     pct: 23, color: '#888'    },
    ]
  },
};

// Which bucket id counts as "savings" for personal budget calculation
function savingsBucketId(ruleId) {
  return RULES[ruleId].buckets.find(b => b.id === 'savings')?.id || null;
}

// ─── Default categories ───────────────────────────────────────────────────────

function defaultCategories(ruleId) {
  const b0  = RULES[ruleId].buckets[0].id;
  const bSav = savingsBucketId(ruleId) || b0;
  const needsBucket = ruleId === 'envelope' ? 'housing'
                    : ruleId === '70-20-10'  ? 'living'
                    : ruleId === 'zero'      ? 'all' : 'needs';
  return [
    { id:'housing',   emoji:'🏠', name:'Housing',           collapsed:true, bucket: ruleId==='envelope'?'housing':needsBucket,
      subs:[{id:uid(),name:'Rent / mortgage',real:0,splitH:null,splitL:null}] },
    { id:'groceries', emoji:'🛒', name:'Groceries & food',  collapsed:true, bucket: ruleId==='envelope'?'food':needsBucket,
      subs:[{id:uid(),name:'Supermarket',real:0,splitH:null,splitL:null},{id:uid(),name:'Takeaway & dining',real:0,splitH:null,splitL:null}] },
    { id:'transport', emoji:'🚗', name:'Transport',         collapsed:true, bucket: ruleId==='envelope'?'transport':needsBucket,
      subs:[{id:uid(),name:'Car payment',real:0,splitH:null,splitL:null},{id:uid(),name:'Fuel',real:0,splitH:null,splitL:null},{id:uid(),name:'Public transport',real:0,splitH:null,splitL:null}] },
    { id:'utilities', emoji:'⚡', name:'Utilities & bills', collapsed:true, bucket: ruleId==='envelope'?'other':needsBucket,
      subs:[{id:uid(),name:'Electricity',real:0,splitH:null,splitL:null},{id:uid(),name:'Internet',real:0,splitH:null,splitL:null},{id:uid(),name:'Phone',real:0,splitH:null,splitL:null}] },
    { id:'savings',   emoji:'💰', name:'Savings',           collapsed:true, bucket: ruleId==='envelope'?'savings':bSav,
      subs:[{id:uid(),name:'Emergency fund',real:0,splitH:null,splitL:null},{id:uid(),name:'Investments',real:0,splitH:null,splitL:null}] },
    { id:'kids',      emoji:'👶', name:'Kids & family',     collapsed:true, bucket: ruleId==='envelope'?'other':needsBucket,
      subs:[{id:uid(),name:'Childcare',real:0,splitH:null,splitL:null},{id:uid(),name:'Activities',real:0,splitH:null,splitL:null}] },
  ];
}

const ICONS = ['🏠','🛒','🚗','⚡','💰','👶','🍽️','🎬','🏥','📱','🐾','🧴','🎓','✈️','🏋️','🎁','🧾','🔧','🌿','💻','🎯','🐶','🎵','🛁','🍺','👗','🏖️','🎮'];

// ─── State ────────────────────────────────────────────────────────────────────

let state = { budget: null, activeRule:'50-30-20' };

// ─── Persistence ──────────────────────────────────────────────────────────────

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

function migrateState(s) {
  // Support old month-based data — pull first month into flat budget
  if (s.months && !s.budget) {
    const keys = Object.keys(s.months).sort();
    s.budget = keys.length ? s.months[keys[keys.length-1]] : null;
    delete s.months;
    delete s.activeMonth;
  }
  if (s.budget) {
    (s.budget.categories||[]).forEach(cat => {
      if (cat.collapsed === undefined) cat.collapsed = true;
      (cat.subs||[]).forEach(sub => {
        if (sub.splitH === undefined) { sub.splitH = null; sub.splitL = null; }
      });
    });
    if (!s.budget.personal) s.budget.personal = {
      henry: { collapsed:true, subs:[] },
      lauri: { collapsed:true, subs:[] },
    };
  }
  return s;
}

async function saveState() {
  if (isElectron) await window.electronAPI.save(state);
  else localStorage.setItem('hl-budget', JSON.stringify(state));
}

async function loadState() {
  if (isElectron) {
    const data = await window.electronAPI.load();
    if (data) state = migrateState(data);
  } else {
    const raw = localStorage.getItem('hl-budget');
    if (raw) { try { state = migrateState(JSON.parse(raw)); } catch {} }
  }
}

function getBudgetData() {
  if (!state.budget) {
    state.budget = {
      henry: 2200, lauri: 2200,
      categories: defaultCategories(state.activeRule || '50-30-20'),
      personal: {
        henry: { collapsed:true, subs:[] },
        lauri: { collapsed:true, subs:[] },
      },
    };
    saveState();
  }
  return state.budget;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid()       { return Math.random().toString(36).slice(2,9); }
function fmt(n)      { return '€' + Math.round(n).toLocaleString('de-DE'); }
function clamp(v)    { return Math.max(0, Math.min(100, v)); }



// Resolve actual henry/lauri amounts for a sub, respecting custom split
function subAmounts(sub, rH, rL) {
  const real = +sub.real || 0;
  // null = use income ratio; explicit value = custom override
  const sH = sub.splitH !== null && sub.splitH !== undefined ? sub.splitH / 100 : rH;
  const sL = sub.splitL !== null && sub.splitL !== undefined ? sub.splitL / 100 : rL;
  return { henry: real * sH, lauri: real * sL };
}

function catTotal(cat) {
  return (cat.subs||[]).reduce((s,sub) => s + (+sub.real||0), 0);
}

function catSplitAmounts(cat, rH, rL) {
  let henry=0, lauri=0;
  (cat.subs||[]).forEach(sub => {
    const a = subAmounts(sub, rH, rL);
    henry += a.henry; lauri += a.lauri;
  });
  return { henry, lauri };
}

// ─── Rule bar ─────────────────────────────────────────────────────────────────

function renderRuleBar() {
  const pills = document.getElementById('rule-pills');
  pills.innerHTML = '';
  Object.entries(RULES).forEach(([id,rule]) => {
    const btn = document.createElement('button');
    btn.className = 'rule-pill' + (id===state.activeRule?' active':'');
    btn.textContent = rule.label;
    btn.addEventListener('click', () => { state.activeRule=id; saveState(); renderRuleBar(); recalc(); });
    pills.appendChild(btn);
  });
  document.getElementById('rule-desc').textContent = RULES[state.activeRule].desc;
}

// ─── Bucket summary ───────────────────────────────────────────────────────────

function renderBuckets(totalIncome, data) {
  const rule = RULES[state.activeRule];
  const container = document.getElementById('buckets');
  container.innerHTML = '';
  const actualByBucket = {};
  rule.buckets.forEach(b => actualByBucket[b.id]=0);
  data.categories.forEach(cat => {
    const bId = cat.bucket || rule.buckets[0].id;
    if (actualByBucket[bId]!==undefined) actualByBucket[bId] += catTotal(cat);
  });
  rule.buckets.forEach(b => {
    const budget = Math.round(totalIncome * b.pct / 100);
    const actual = Math.round(actualByBucket[b.id]||0);
    const diff   = actual - budget;
    const usedPct = budget>0 ? Math.min(100,Math.round(actual/budget*100)) : 0;
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
          <span class="bucket-actual ${over?'over':''}">${fmt(actual)}</span>
        </div>
      </div>
      <div class="bucket-bar-track">
        <div class="bucket-bar-fill" style="width:${usedPct}%;background:${over?'#C0392B':b.color}"></div>
      </div>
      <div class="bucket-foot">
        <span class="bucket-used">${usedPct}% used</span>
        <span class="bucket-diff ${over?'over':'under'}">${over?'+':''}${fmt(diff)}</span>
      </div>`;
    container.appendChild(card);
  });
}


// ─── Render / Recalc ──────────────────────────────────────────────────────────

function render() {
  const data = getBudgetData();
  const hi = document.getElementById('henry-income');
  const li = document.getElementById('lauri-income');
  if (document.activeElement!==hi) hi.value = data.henry||'';
  if (document.activeElement!==li) li.value = data.lauri||'';
  recalc();
}

function recalc() {
  const data   = getBudgetData();
  const henry  = +data.henry||0;
  const lauri  = +data.lauri||0;
  const total  = henry+lauri;
  const rH = total>0 ? henry/total : 0.5;
  const rL = total>0 ? lauri/total : 0.5;

  document.getElementById('split-display').textContent =
    `${Math.round(rH*100)}% / ${Math.round(rL*100)}%`;
  document.getElementById('total-income').textContent = fmt(total);

  // Shared spend totals for personal budget calculation
  let totalSharedActual = 0;
  let henrySharedActual = 0;
  let lauriSharedActual = 0;
  data.categories.forEach(cat => {
    const a = catSplitAmounts(cat, rH, rL);
    henrySharedActual += a.henry;
    lauriSharedActual += a.lauri;
    totalSharedActual += catTotal(cat);
  });

  renderBuckets(total, data);
  renderCatRows(data, rH, rL);
  renderPersonalBudgets(data, henry, lauri, henrySharedActual, lauriSharedActual);
  renderSplitSection(data, rH, rL);
  saveState();
}

// ─── Category rows ────────────────────────────────────────────────────────────

function renderCatRows(data, rH, rL) {
  const rule = RULES[state.activeRule];
  const container = document.getElementById('cat-rows');
  container.innerHTML = '';

  data.categories.forEach((cat, cIdx) => {
    const actual  = catTotal(cat);
    const bucket  = rule.buckets.find(b=>b.id===cat.bucket)||rule.buckets[0];
    const chevron = cat.collapsed ? '▶' : '▼';
    const split   = catSplitAmounts(cat, rH, rL);

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
          <span class="henry-share">H: ${fmt(split.henry)}</span>
          · <span class="lauri-share">L: ${fmt(split.lauri)}</span>
        </span>
        <button class="btn-icon btn-del-cat" data-del-cat="${cIdx}" title="Delete">✕</button>
      </div>`;

    const subsWrap = document.createElement('div');
    subsWrap.className = 'subs-wrap' + (cat.collapsed?' collapsed':'');

    (cat.subs||[]).forEach((sub, sIdx) => {
      const real  = +sub.real||0;
      const hasCustom = sub.splitH !== null && sub.splitH !== undefined;
      const sH    = hasCustom ? sub.splitH : Math.round(rH*100);
      const sL    = hasCustom ? sub.splitL : Math.round(rL*100);
      const isCustom = hasCustom;
      const hAmt  = real * (hasCustom ? sH/100 : rH);
      const lAmt  = real * (hasCustom ? sL/100 : rL);

      const subRow = document.createElement('div');
      subRow.className = 'cat-sub-row';
      subRow.innerHTML = `
        <div class="sub-name-cell">
          <span class="sub-indent">└</span>
          <span class="sub-name-text">${sub.name}</span>
        </div>
        <span class="sub-budget-cell">—</span>
        <input type="number" class="sub-input" data-cidx="${cIdx}" data-sidx="${sIdx}"
          value="${sub.real||''}" placeholder="0" min="0" step="10" />
        <span class="diff-pill neutral">—</span>
        <div class="split-control" data-cidx="${cIdx}" data-sidx="${sIdx}">
          <span class="henry-share split-label">H: ${fmt(hAmt)}</span>
          <div class="split-slider-wrap ${isCustom?'is-custom':''}">
            <span class="split-pct henry-pct">${sH}%</span>
            <input type="range" class="split-slider" title="Double-click to reset to income ratio" min="0" max="100" step="5"
              value="${sH}" data-cidx="${cIdx}" data-sidx="${sIdx}" />
            <span class="split-pct lauri-pct">${sL}%</span>
          </div>
          <span class="lauri-share split-label">L: ${fmt(lAmt)}</span>
        </div>
        <button class="btn-icon btn-del-sub" data-cidx="${cIdx}" data-sidx="${sIdx}" title="Remove">✕</button>`;
      subsWrap.appendChild(subRow);
    });

    parent.appendChild(subsWrap);
    // "+ Add item" sits outside the collapsible wrap so it's always clickable
    const addSubRow = document.createElement('div');
    addSubRow.className = 'add-sub-row-outer';
    addSubRow.innerHTML = `<button class="btn-add-sub" data-cidx="${cIdx}">+ Add item</button>`;
    parent.appendChild(addSubRow);
    container.appendChild(parent);
  });

  // ── Events ──
  container.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', e => {
      const cIdx = +e.currentTarget.dataset.toggle;
      data.categories[cIdx].collapsed = !data.categories[cIdx].collapsed;
      recalc();
    });
  });

  container.querySelectorAll('.sub-input').forEach(input => {
    input.addEventListener('change', e => {
      const {cidx,sidx} = e.target.dataset;
      data.categories[+cidx].subs[+sidx].real = +e.target.value||0;
      recalc();
    });
  });

  container.querySelectorAll('.split-slider').forEach(slider => {
    slider.addEventListener('input', e => {
      const {cidx,sidx} = e.target.dataset;
      const sH = +e.target.value;
      const sL = 100 - sH;
      const sub = data.categories[+cidx].subs[+sidx];
      sub.splitH = sH; sub.splitL = sL;
      // Update display inline without full recalc
      const wrap = e.target.closest('.split-control');
      wrap.querySelector('.henry-pct').textContent = sH+'%';
      wrap.querySelector('.lauri-pct').textContent = sL+'%';
      wrap.querySelector('.split-slider-wrap').classList.add('is-custom');
      const real = +sub.real||0;
      wrap.querySelector('.henry-share').textContent = 'H: '+fmt(real*sH/100);
      wrap.querySelector('.lauri-share').textContent = 'L: '+fmt(real*sL/100);
      saveState();
      // Debounced full recalc for totals
      clearTimeout(slider._t);
      slider._t = setTimeout(recalc, 300);
    });
    // Double-click resets to income ratio
    slider.addEventListener('dblclick', e => {
      const {cidx, sidx} = e.target.dataset;
      const sub = data.categories[+cidx].subs[+sidx];
      sub.splitH = null; sub.splitL = null;
      recalc();
    });
  });

  container.querySelectorAll('.btn-del-sub').forEach(btn => {
    btn.addEventListener('click', e => {
      const {cidx,sidx} = e.currentTarget.dataset;
      data.categories[+cidx].subs.splice(+sidx,1);
      recalc();
    });
  });

  container.querySelectorAll('.btn-del-cat').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = +e.currentTarget.dataset.delCat;
      if (confirm(`Delete "${data.categories[idx].name}" and all its items?`)) {
        data.categories.splice(idx,1); recalc();
      }
    });
  });

  // btn-add-sub clicks handled by delegated listener in init()
}

// ─── Personal budgets ─────────────────────────────────────────────────────────

function renderPersonalBudgets(data, henryIncome, lauriIncome, henrySharedSpend, lauriSharedSpend) {
  // Disposable = your income minus your actual share of shared expenses already entered.
  // Nothing is pre-deducted — savings show up here once you enter real savings amounts.
  const henryDisposable = Math.max(0, henryIncome - henrySharedSpend);
  const lauriDisposable = Math.max(0, lauriIncome - lauriSharedSpend);

  const henryPersonalSpend = (data.personal?.henry?.subs||[]).reduce((s,sub)=>s+(+sub.real||0),0);
  const lauriPersonalSpend = (data.personal?.lauri?.subs||[]).reduce((s,sub)=>s+(+sub.real||0),0);

  renderPersonalSection('henry', data, henryDisposable, henryPersonalSpend);
  renderPersonalSection('lauri', data, lauriDisposable, lauriPersonalSpend);
}

function renderPersonalSection(person, data, disposable, spent) {
  const container = document.getElementById(`${person}-personal`);
  if (!container) return;
  const p = data.personal[person];
  const left = disposable - spent;
  const over = left < 0;
  const usedPct = disposable>0 ? Math.min(100,Math.round(spent/disposable*100)) : 0;
  const chevron = p.collapsed ? '▶' : '▼';
  const name = person==='henry' ? 'Henry' : 'Lauri';
  const colorClass = person==='henry' ? 'henry-color' : 'lauri-color';

  container.innerHTML = `
    <div class="personal-header ${colorClass}">
      <div class="personal-header-left">
        <button class="btn-chevron personal-toggle" data-person="${person}">${chevron}</button>
        <span>${name}'s personal budget</span>
      </div>
      <div class="personal-header-right">
        <span class="personal-stat">
          <span class="personal-stat-label">Disposable</span>
          <strong>${fmt(disposable)}</strong>
        </span>
        <span class="personal-stat">
          <span class="personal-stat-label">Spent</span>
          <strong>${fmt(spent)}</strong>
        </span>
        <span class="personal-stat">
          <span class="personal-stat-label">Left</span>
          <strong class="${over?'over':''}">${fmt(left)}</strong>
        </span>
      </div>
    </div>
    <div class="personal-bar-track">
      <div class="personal-bar-fill ${person}-bar" style="width:${usedPct}%"></div>
    </div>
    <div class="personal-body ${p.collapsed?'collapsed':''}">
      <div class="personal-rows" id="${person}-personal-rows"></div>
      <div class="personal-add-row">
        <button class="btn-add-sub" data-person="${person}">+ Add expense</button>
      </div>
    </div>`;

  // Render rows
  const rowsEl = document.getElementById(`${person}-personal-rows`);
  (p.subs||[]).forEach((sub,sIdx) => {
    const row = document.createElement('div');
    row.className = 'personal-item-row';
    row.innerHTML = `
      <div class="sub-name-cell"><span class="sub-indent">└</span><span class="sub-name-text">${sub.name}</span></div>
      <input type="number" class="sub-input personal-sub-input" data-person="${person}" data-sidx="${sIdx}"
        value="${sub.real||''}" placeholder="0" min="0" step="10" />
      <button class="btn-icon personal-del" data-person="${person}" data-sidx="${sIdx}" title="Remove">✕</button>`;
    rowsEl.appendChild(row);
  });

  // Events
  container.querySelector('.personal-toggle').addEventListener('click', e => {
    data.personal[person].collapsed = !data.personal[person].collapsed;
    renderPersonalBudgets(data, +data.henry||0, +data.lauri||0,
      calcSharedSpend(data, 'henry'), calcSharedSpend(data, 'lauri'));
    saveState();
  });

  container.querySelectorAll('.personal-sub-input').forEach(input => {
    input.addEventListener('change', e => {
      const {person:p2, sidx} = e.target.dataset;
      getBudgetData().personal[p2].subs[+sidx].real = +e.target.value||0;
      recalc();
    });
  });

  container.querySelectorAll('.personal-del').forEach(btn => {
    btn.addEventListener('click', e => {
      const {person:p2, sidx} = e.currentTarget.dataset;
      data.personal[p2].subs.splice(+sidx,1);
      recalc();
    });
  });

  const addBtn = container.querySelector('.personal-add-row .btn-add-sub[data-person]');
  if (addBtn) addBtn.addEventListener('click', () => openPersonalSubModal(person));
}

function calcSharedSpend(data, person) {
  const henry = +data.henry||0, lauri = +data.lauri||0, total = henry+lauri;
  const rH = total>0?henry/total:0.5, rL = total>0?lauri/total:0.5;
  let spend = 0;
  data.categories.forEach(cat => {
    const a = catSplitAmounts(cat, rH, rL);
    spend += person==='henry' ? a.henry : a.lauri;
  });
  return spend;
}

// ─── Split section ────────────────────────────────────────────────────────────

function renderSplitSection(data, rH, rL) {
  const hRows = document.getElementById('henry-split-rows');
  const lRows = document.getElementById('lauri-split-rows');
  hRows.innerHTML=''; lRows.innerHTML='';
  let hTotal=0, lTotal=0;
  data.categories.forEach(cat => {
    const a = catSplitAmounts(cat,rH,rL);
    hTotal+=a.henry; lTotal+=a.lauri;
    hRows.innerHTML += `<div class="split-row"><span class="split-row-name">${cat.emoji} ${cat.name}</span><span class="split-amt real">${fmt(a.henry)}</span></div>`;
    lRows.innerHTML += `<div class="split-row"><span class="split-row-name">${cat.emoji} ${cat.name}</span><span class="split-amt real">${fmt(a.lauri)}</span></div>`;
  });
  // Add personal spend
  const hPersonal = (data.personal?.henry?.subs||[]).reduce((s,sub)=>s+(+sub.real||0),0);
  const lPersonal = (data.personal?.lauri?.subs||[]).reduce((s,sub)=>s+(+sub.real||0),0);
  if (hPersonal>0) hRows.innerHTML += `<div class="split-row"><span class="split-row-name">👤 Personal</span><span class="split-amt real">${fmt(hPersonal)}</span></div>`;
  if (lPersonal>0) lRows.innerHTML += `<div class="split-row"><span class="split-row-name">👤 Personal</span><span class="split-amt real">${fmt(lPersonal)}</span></div>`;
  hTotal+=hPersonal; lTotal+=lPersonal;
  document.getElementById('henry-total-row').innerHTML = `<span>Total spent</span><span>${fmt(hTotal)}</span>`;
  document.getElementById('lauri-total-row').innerHTML = `<span>Total spent</span><span>${fmt(lTotal)}</span>`;
}

// ─── Modals ───────────────────────────────────────────────────────────────────

let selectedIcon='🧾', modalMode='category', modalCatIdx=null, modalPerson=null;

function openCatModal() {
  modalMode='category'; selectedIcon='🧾';
  document.getElementById('new-cat-name').value='';
  document.getElementById('modal-icon-row').style.display='';
  document.getElementById('modal-bucket-label').style.display='';
  document.getElementById('modal-bucket').style.display='';
  document.getElementById('modal-title').textContent='New category';
  buildIconPicker(); buildBucketSelect(null);
  document.getElementById('modal-backdrop').style.display='flex';
  setTimeout(()=>document.getElementById('new-cat-name').focus(),50);
}

function openSubModal(cIdx) {
  modalMode='sub'; modalCatIdx=cIdx;
  document.getElementById('new-cat-name').value='';
  document.getElementById('modal-icon-row').style.display='none';
  document.getElementById('modal-bucket-label').style.display='none';
  document.getElementById('modal-bucket').style.display='none';
  const data = getBudgetData();
  document.getElementById('modal-title').textContent=`Add item to "${data.categories[cIdx].name}"`;
  document.getElementById('modal-backdrop').style.display='flex';
  setTimeout(()=>document.getElementById('new-cat-name').focus(),50);
}

function openPersonalSubModal(person) {
  modalMode='personal'; modalPerson=person;
  document.getElementById('new-cat-name').value='';
  document.getElementById('modal-icon-row').style.display='none';
  document.getElementById('modal-bucket-label').style.display='none';
  document.getElementById('modal-bucket').style.display='none';
  const name = person==='henry'?'Henry':'Lauri';
  document.getElementById('modal-title').textContent=`Add expense for ${name}`;
  document.getElementById('modal-backdrop').style.display='flex';
  setTimeout(()=>document.getElementById('new-cat-name').focus(),50);
}

function closeModal() { document.getElementById('modal-backdrop').style.display='none'; }

function buildIconPicker() {
  const picker = document.getElementById('icon-picker');
  picker.innerHTML='';
  ICONS.forEach(icon => {
    const btn=document.createElement('button');
    btn.className='icon-opt'+(icon===selectedIcon?' selected':'');
    btn.textContent=icon; btn.type='button';
    btn.addEventListener('click',()=>{
      selectedIcon=icon;
      picker.querySelectorAll('.icon-opt').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    picker.appendChild(btn);
  });
}

function buildBucketSelect(currentBucket) {
  const sel=document.getElementById('modal-bucket');
  sel.innerHTML='';
  RULES[state.activeRule].buckets.forEach(b=>{
    const opt=document.createElement('option');
    opt.value=b.id; opt.textContent=`${b.label} (${b.pct}%)`;
    if(b.id===currentBucket) opt.selected=true;
    sel.appendChild(opt);
  });
}

function confirmModal() {
  const name=document.getElementById('new-cat-name').value.trim();
  if(!name){document.getElementById('new-cat-name').focus();return;}
  const data=getBudgetData();
  if (modalMode==='category') {
    const bucketEl=document.getElementById('modal-bucket');
    const bucket=(bucketEl&&bucketEl.options.length>0)?bucketEl.value:RULES[state.activeRule].buckets[0].id;
    data.categories.push({id:uid(),emoji:selectedIcon,name,collapsed:true,bucket,subs:[]});
  } else if (modalMode==='sub') {
    data.categories[modalCatIdx].subs.push({id:uid(),name,real:0,splitH:null,splitL:null});
    data.categories[modalCatIdx].collapsed=false;
  } else if (modalMode==='personal') {
    data.personal[modalPerson].subs.push({id:uid(),name,real:0});
    data.personal[modalPerson].collapsed=false;
  }
  closeModal(); recalc();
}

// ─── Income ───────────────────────────────────────────────────────────────────

function bindIncomeInputs() {
  document.getElementById('henry-income').addEventListener('change',()=>{
    getBudgetData().henry=+document.getElementById('henry-income').value||0; recalc();
  });
  document.getElementById('lauri-income').addEventListener('change',()=>{
    getBudgetData().lauri=+document.getElementById('lauri-income').value||0; recalc();
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────


async function init() {
  await loadState();
  if (!state.activeRule) state.activeRule='50-30-20';
  getBudgetData(); // ensure data initialised
  renderRuleBar(); bindIncomeInputs();
  document.getElementById('btn-add-cat').addEventListener('click',openCatModal);
  document.getElementById('modal-cancel').addEventListener('click',closeModal);
  document.getElementById('modal-confirm').addEventListener('click',confirmModal);
  document.getElementById('modal-backdrop').addEventListener('click',e=>{ if(e.target===e.currentTarget)closeModal(); });
  document.getElementById('new-cat-name').addEventListener('keydown',e=>{ if(e.key==='Enter')confirmModal(); if(e.key==='Escape')closeModal(); });

  // Delegated: "+ Add item" buttons inside category rows (survives re-renders)
  document.getElementById('cat-rows').addEventListener('click', e => {
    const btn = e.target.closest('.btn-add-sub[data-cidx]');
    if (btn) openSubModal(+btn.dataset.cidx);
  });

  render();
}

document.addEventListener('DOMContentLoaded',init);
