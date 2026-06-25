// ─── Budget rules ─────────────────────────────────────────────────────────────
// "Wants" bucket removed — personal budgets handle individual discretionary spend.
// Buckets only cover SHARED expenses now.

const RULES = {
  '50-30-20': {
    label: '50/30/20', desc: '50% needs · 30% wants · 20% savings  —  wants tracked in personal budgets',
    buckets: [
      { id: 'needs',   label: 'Needs',   pct: 50, color: '#534AB7' },
      { id: 'savings', label: 'Savings', pct: 20, color: '#B87333' },
    ]
  },
  '70-20-10': {
    label: '70/20/10', desc: '70% living · 20% savings · 10% giving/debt',
    buckets: [
      { id: 'living',  label: 'Living',        pct: 70, color: '#534AB7' },
      { id: 'savings', label: 'Savings',       pct: 20, color: '#0F6E56' },
      { id: 'giving',  label: 'Giving / Debt', pct: 10, color: '#B87333' },
    ]
  },
  '60-20-20': {
    label: '60/20/20', desc: '60% committed · 20% savings — remainder is personal',
    buckets: [
      { id: 'committed', label: 'Committed', pct: 60, color: '#534AB7' },
      { id: 'savings',   label: 'Savings',   pct: 20, color: '#B87333' },
    ]
  },
  'zero': {
    label: 'Zero-based', desc: 'Every euro assigned — income minus all spending = 0',
    buckets: [{ id: 'all', label: 'All expenses', pct: 100, color: '#534AB7' }]
  },
  'envelope': {
    label: 'Envelope', desc: 'Custom category buckets',
    buckets: [
      { id: 'housing',   label: 'Housing',   pct: 30, color: '#534AB7' },
      { id: 'transport', label: 'Transport', pct: 15, color: '#0F6E56' },
      { id: 'food',      label: 'Food',      pct: 12, color: '#B87333' },
      { id: 'savings',   label: 'Savings',   pct: 20, color: '#6B3FA0' },
      { id: 'other',     label: 'Other',     pct: 23, color: '#888'    },
    ]
  },
};

// ─── Default categories ───────────────────────────────────────────────────────

function defaultCategories(ruleId) {
  const b0  = RULES[ruleId].buckets[0].id;
  const bSav = RULES[ruleId].buckets.find(b=>b.id==='savings')?.id || b0;
  const needs = ruleId==='envelope'?'housing': ruleId==='70-20-10'?'living': ruleId==='zero'?'all':'needs';
  const mk = (name, splitH=null, splitL=null) => ({ id:uid(), name, real:0, splitH, splitL, payer:null });
  return [
    { id:'housing',   emoji:'🏠', name:'Housing',           collapsed:true, bucket:ruleId==='envelope'?'housing':needs,
      subs:[mk('Rent / mortgage')] },
    { id:'groceries', emoji:'🛒', name:'Groceries & food',  collapsed:true, bucket:ruleId==='envelope'?'food':needs,
      subs:[mk('Supermarket'), mk('Takeaway & dining')] },
    { id:'transport', emoji:'🚗', name:'Transport',         collapsed:true, bucket:ruleId==='envelope'?'transport':needs,
      subs:[mk('Car payment'), mk('Fuel'), mk('Public transport')] },
    { id:'utilities', emoji:'⚡', name:'Utilities & bills', collapsed:true, bucket:ruleId==='envelope'?'other':needs,
      subs:[mk('Electricity'), mk('Internet'), mk('Phone')] },
    { id:'savings',   emoji:'💰', name:'Savings',           collapsed:true, bucket:ruleId==='envelope'?'savings':bSav,
      subs:[mk('Emergency fund'), mk('Investments')] },
    { id:'kids',      emoji:'👶', name:'Kids & family',     collapsed:true, bucket:ruleId==='envelope'?'other':needs,
      subs:[mk('Childcare'), mk('Activities')] },
  ];
}

const ICONS = ['🏠','🛒','🚗','⚡','💰','👶','🍽️','🎬','🏥','📱','🐾','🧴','🎓','✈️','🏋️','🎁','🧾','🔧','🌿','💻','🎯','🐶','🎵','🛁','🍺','👗','🏖️','🎮'];

// ─── State ────────────────────────────────────────────────────────────────────

let state = { budget: null, activeRule: '50-30-20', activeTab: 'budget' };

// ─── Persistence ──────────────────────────────────────────────────────────────

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

function migrateState(s) {
  if (s.months && !s.budget) {
    const keys = Object.keys(s.months).sort();
    s.budget = keys.length ? s.months[keys[keys.length-1]] : null;
    delete s.months; delete s.activeMonth;
  }
  if (s.budget) {
    (s.budget.categories||[]).forEach(cat => {
      if (cat.collapsed===undefined) cat.collapsed=true;
      (cat.subs||[]).forEach(sub => {
        if (sub.splitH===undefined) { sub.splitH=null; sub.splitL=null; }
        if (sub.payer===undefined) sub.payer=null;
      });
    });
    if (!s.budget.personal) s.budget.personal = {
      henry:{ collapsed:true, subs:[] },
      lauri:{ collapsed:true, subs:[] },
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
    const d = await window.electronAPI.load();
    if (d) state = migrateState(d);
  } else {
    const raw = localStorage.getItem('hl-budget');
    if (raw) { try { state = migrateState(JSON.parse(raw)); } catch {} }
  }
}

function getBudgetData() {
  if (!state.budget) {
    state.budget = {
      henry: 2200, lauri: 2200,
      categories: defaultCategories(state.activeRule||'50-30-20'),
      personal: {
        henry:{ collapsed:true, subs:[] },
        lauri:{ collapsed:true, subs:[] },
      },
    };
    saveState();
  }
  return state.budget;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid()  { return Math.random().toString(36).slice(2,9); }
function fmt(n) { return '€' + Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtN(n){ return Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function subAmounts(sub, rH, rL) {
  const real = +sub.real||0;
  const sH = (sub.splitH!==null && sub.splitH!==undefined) ? sub.splitH/100 : rH;
  const sL = (sub.splitL!==null && sub.splitL!==undefined) ? sub.splitL/100 : rL;
  return { henry: real*sH, lauri: real*sL };
}

function catTotal(cat) {
  return (cat.subs||[]).reduce((s,sub)=>s+(+sub.real||0), 0);
}

function catSplitAmounts(cat, rH, rL) {
  let henry=0, lauri=0;
  (cat.subs||[]).forEach(sub => { const a=subAmounts(sub,rH,rL); henry+=a.henry; lauri+=a.lauri; });
  return { henry, lauri };
}

// Returns the full numbers needed for display and exports
function calcTotals() {
  const data  = getBudgetData();
  const henry = +data.henry||0;
  const lauri = +data.lauri||0;
  const total = henry+lauri;
  const rH = total>0 ? henry/total : 0.5;
  const rL = total>0 ? lauri/total : 0.5;

  let henryShared=0, lauriShared=0, totalShared=0;
  data.categories.forEach(cat => {
    const a = catSplitAmounts(cat,rH,rL);
    henryShared+=a.henry; lauriShared+=a.lauri; totalShared+=catTotal(cat);
  });

  const henryPersonal = (data.personal?.henry?.subs||[]).reduce((s,sub)=>s+(+sub.real||0),0);
  const lauriPersonal = (data.personal?.lauri?.subs||[]).reduce((s,sub)=>s+(+sub.real||0),0);

  const henryTotal = henryShared + henryPersonal;
  const lauriTotal = lauriShared + lauriPersonal;

  // Payment account tracking — who physically pays each sub
  let henryPaid=0, lauriPaid=0;
  data.categories.forEach(cat=>{
    (cat.subs||[]).forEach(sub=>{
      const real=+sub.real||0;
      if(sub.payer==='henry') henryPaid+=real;
      else if(sub.payer==='lauri') lauriPaid+=real;
      else {
        // No payer set — assume paid proportionally (no transfer needed)
        const a=subAmounts(sub,rH,rL);
        henryPaid+=a.henry; lauriPaid+=a.lauri;
      }
    });
  });
  // Henry owes: his share of all shared costs
  // Henry paid: what came out of his account
  // If Henry paid more than he owes → Lauri transfers to Henry
  // If Henry paid less than he owes → Henry transfers to Lauri
  const henryOwed = henryShared; // his cost share
  const lauriOwed = lauriShared; // her cost share
  const henryNet = henryPaid - henryOwed; // positive = overpaid, Lauri owes Henry
  const lauriNet = lauriPaid - lauriOwed; // positive = overpaid, Henry owes Lauri

  // Disposable = income − total spent (shared share + all personal)
  const henryDisposable = henry - henryTotal;
  const lauriDisposable = lauri - lauriTotal;

  return { data, henry, lauri, total, rH, rL,
           henryShared, lauriShared, totalShared,
           henryPersonal, lauriPersonal,
           henryTotal, lauriTotal,
           henryDisposable, lauriDisposable,
           henryPaid, lauriPaid, henryOwed, lauriOwed, henryNet, lauriNet };
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function renderTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.style.display = panel.dataset.panel === state.activeTab ? '' : 'none';
  });
}

// ─── Rule bar ─────────────────────────────────────────────────────────────────

function renderRuleBar() {
  const pills = document.getElementById('rule-pills');
  pills.innerHTML='';
  Object.entries(RULES).forEach(([id,rule]) => {
    const btn=document.createElement('button');
    btn.className='rule-pill'+(id===state.activeRule?' active':'');
    btn.textContent=rule.label;
    btn.addEventListener('click',()=>{ state.activeRule=id; saveState(); renderRuleBar(); recalc(); });
    pills.appendChild(btn);
  });
  document.getElementById('rule-desc').textContent=RULES[state.activeRule].desc;
}

// ─── Bucket summary ───────────────────────────────────────────────────────────

function renderBuckets(t) {
  const rule=RULES[state.activeRule];
  const container=document.getElementById('buckets');
  container.innerHTML='';
  const actualByBucket={};
  rule.buckets.forEach(b=>actualByBucket[b.id]=0);
  t.data.categories.forEach(cat=>{
    const bId=cat.bucket||rule.buckets[0].id;
    if(actualByBucket[bId]!==undefined) actualByBucket[bId]+=catTotal(cat);
  });
  rule.buckets.forEach(b=>{
    const budget=t.total*b.pct/100;
    const actual=actualByBucket[b.id]||0;
    const diff=actual-budget;
    const usedPct=budget>0?Math.min(100,Math.round(actual/budget*100)):0;
    const over=actual>budget;
    const card=document.createElement('div');
    card.className='bucket-card';
    card.innerHTML=`
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

// ─── Disposable summary cards ─────────────────────────────────────────────────

function renderDisposable(t) {
  const el = document.getElementById('disposable-cards');
  if (!el) return;
  const hOver = t.henryDisposable < 0;
  const lOver = t.lauriDisposable < 0;
  el.innerHTML = `
    <div class="disp-card">
      <div class="disp-person henry-color-text">Henry</div>
      <div class="disp-row"><span class="disp-label">Income</span><span>${fmt(t.henry)}</span></div>
      <div class="disp-row"><span class="disp-label">Shared expenses</span><span>− ${fmt(t.henryShared)}</span></div>
      <div class="disp-row"><span class="disp-label">Personal expenses</span><span>− ${fmt(t.henryPersonal)}</span></div>
      <div class="disp-row disp-total"><span class="disp-label">Remaining</span><span class="${hOver?'over':''}">${fmt(t.henryDisposable)}</span></div>
    </div>
    <div class="disp-card">
      <div class="disp-person lauri-color-text">Lauri</div>
      <div class="disp-row"><span class="disp-label">Income</span><span>${fmt(t.lauri)}</span></div>
      <div class="disp-row"><span class="disp-label">Shared expenses</span><span>− ${fmt(t.lauriShared)}</span></div>
      <div class="disp-row"><span class="disp-label">Personal expenses</span><span>− ${fmt(t.lauriPersonal)}</span></div>
      <div class="disp-row disp-total"><span class="disp-label">Remaining</span><span class="${lOver?'over':''}">${fmt(t.lauriDisposable)}</span></div>
    </div>`;
}

// ─── Render / Recalc ──────────────────────────────────────────────────────────

function render() {
  const data=getBudgetData();
  const hi=document.getElementById('henry-income');
  const li=document.getElementById('lauri-income');
  if(document.activeElement!==hi) hi.value=data.henry||'';
  if(document.activeElement!==li) li.value=data.lauri||'';
  recalc();
}

function recalc() {
  const t = calcTotals();
  document.getElementById('split-display').textContent=
    `${Math.round(t.rH*100)}% / ${Math.round(t.rL*100)}%`;
  document.getElementById('total-income').textContent=fmt(t.total);

  renderBuckets(t);
  renderCatRows(t.data, t.rH, t.rL);
  renderPersonalBudgets(t);
  renderDisposable(t);
  renderSplitSection(t);
  renderTransfers(t);
  if (state.activeTab==='charts') renderCharts(t);
  saveState();
}

// ─── Category rows ────────────────────────────────────────────────────────────

function renderCatRows(data, rH, rL) {
  const rule=RULES[state.activeRule];
  const container=document.getElementById('cat-rows');
  container.innerHTML='';

  data.categories.forEach((cat,cIdx)=>{
    const actual=catTotal(cat);
    const bucket=rule.buckets.find(b=>b.id===cat.bucket)||rule.buckets[0];
    const chevron=cat.collapsed?'▶':'▼';
    const split=catSplitAmounts(cat,rH,rL);

    const parent=document.createElement('div');
    parent.className='cat-group';
    parent.innerHTML=`
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
          <span class="henry-share">H: ${fmt(split.henry)}</span> · <span class="lauri-share">L: ${fmt(split.lauri)}</span>
        </span>
        <button class="btn-icon btn-del-cat" data-del-cat="${cIdx}" title="Delete">✕</button>
      </div>`;

    const subsWrap=document.createElement('div');
    subsWrap.className='subs-wrap'+(cat.collapsed?' collapsed':'');

    (cat.subs||[]).forEach((sub,sIdx)=>{
      const real=+sub.real||0;
      const hasCustom=sub.splitH!==null&&sub.splitH!==undefined;
      const sH=hasCustom?sub.splitH:Math.round(rH*100);
      const sL=hasCustom?sub.splitL:Math.round(rL*100);
      const hAmt=real*(hasCustom?sH/100:rH);
      const lAmt=real*(hasCustom?sL/100:rL);

      const subRow=document.createElement('div');
      subRow.className='cat-sub-row';
      subRow.innerHTML=`
        <div class="sub-name-cell"><span class="sub-indent">└</span><span class="sub-name-text">${sub.name}</span></div>
        <span class="sub-budget-cell">—</span>
        <input type="number" class="sub-input" data-cidx="${cIdx}" data-sidx="${sIdx}"
          value="${sub.real||''}" placeholder="0" min="0" step="10" />
        <span class="diff-pill neutral">—</span>
        <div class="split-control" data-cidx="${cIdx}" data-sidx="${sIdx}">
          <span class="henry-share split-label">H: ${fmt(hAmt)}</span>
          <div class="split-slider-wrap ${hasCustom?'is-custom':''}">
            <span class="split-pct henry-pct">${sH}%</span>
            <input type="range" class="split-slider" title="Double-click to reset to income ratio"
              min="0" max="100" step="5" value="${sH}" data-cidx="${cIdx}" data-sidx="${sIdx}" />
            <span class="split-pct lauri-pct">${sL}%</span>
          </div>
          <span class="lauri-share split-label">L: ${fmt(lAmt)}</span>
        </div>
        <select class="payer-select ${sub.payer==='henry'?'pays-henry':sub.payer==='lauri'?'pays-lauri':''}" data-cidx="${cIdx}" data-sidx="${sIdx}" title="Whose account pays this in full?">
          <option value="">No preference</option>
          <option value="henry" ${sub.payer==='henry'?'selected':''}>💳 Henry pays</option>
          <option value="lauri" ${sub.payer==='lauri'?'selected':''}>💳 Lauri pays</option>
        </select>
        <button class="btn-icon btn-del-sub" data-cidx="${cIdx}" data-sidx="${sIdx}" title="Remove">✕</button>`;
      subsWrap.appendChild(subRow);
    });

    parent.appendChild(subsWrap);
    const addSubRow=document.createElement('div');
    addSubRow.className='add-sub-row-outer';
    addSubRow.innerHTML=`<button class="btn-add-sub" data-cidx="${cIdx}">+ Add item</button>`;
    parent.appendChild(addSubRow);
    container.appendChild(parent);
  });

  container.querySelectorAll('[data-toggle]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      const cIdx=+e.currentTarget.dataset.toggle;
      data.categories[cIdx].collapsed=!data.categories[cIdx].collapsed;
      recalc();
    });
  });
  container.querySelectorAll('.sub-input').forEach(input=>{
    input.addEventListener('change',e=>{
      const {cidx,sidx}=e.target.dataset;
      data.categories[+cidx].subs[+sidx].real=+e.target.value||0;
      recalc();
    });
  });
  container.querySelectorAll('.split-slider').forEach(slider=>{
    slider.addEventListener('input',e=>{
      const {cidx,sidx}=e.target.dataset;
      const sH=+e.target.value, sL=100-sH;
      const sub=data.categories[+cidx].subs[+sidx];
      sub.splitH=sH; sub.splitL=sL;
      const wrap=e.target.closest('.split-control');
      wrap.querySelector('.henry-pct').textContent=sH+'%';
      wrap.querySelector('.lauri-pct').textContent=sL+'%';
      wrap.querySelector('.split-slider-wrap').classList.add('is-custom');
      const real=+sub.real||0;
      wrap.querySelector('.henry-share').textContent='H: '+fmt(real*sH/100);
      wrap.querySelector('.lauri-share').textContent='L: '+fmt(real*sL/100);
      saveState();
      clearTimeout(slider._t);
      slider._t=setTimeout(recalc,300);
    });
    slider.addEventListener('dblclick',e=>{
      const {cidx,sidx}=e.target.dataset;
      const sub=data.categories[+cidx].subs[+sidx];
      sub.splitH=null; sub.splitL=null;
      recalc();
    });
  });
  container.querySelectorAll('.btn-del-sub').forEach(btn=>{
    btn.addEventListener('click',e=>{
      const {cidx,sidx}=e.currentTarget.dataset;
      data.categories[+cidx].subs.splice(+sidx,1);
      recalc();
    });
  });
  container.querySelectorAll('.btn-del-cat').forEach(btn=>{
    btn.addEventListener('click',e=>{
      const idx=+e.currentTarget.dataset.delCat;
      if(confirm(`Delete "${data.categories[idx].name}" and all its items?`)){
        data.categories.splice(idx,1); recalc();
      }
    });
  });
  container.querySelectorAll('.payer-select').forEach(sel=>{
    sel.addEventListener('change',e=>{
      const {cidx,sidx}=e.target.dataset;
      const val=e.target.value||null;
      data.categories[+cidx].subs[+sidx].payer=val;
      e.target.className='payer-select'+(val==='henry'?' pays-henry':val==='lauri'?' pays-lauri':'');
      recalc();
    });
  });
}

// ─── Personal budgets ─────────────────────────────────────────────────────────

function renderPersonalBudgets(t) {
  renderPersonalSection('henry', t.data, t.henryPersonal);
  renderPersonalSection('lauri', t.data, t.lauriPersonal);
}

function renderPersonalSection(person, data, spent) {
  const container=document.getElementById(`${person}-personal`);
  if(!container) return;
  const p=data.personal[person];
  const chevron=p.collapsed?'▶':'▼';
  const name=person==='henry'?'Henry':'Lauri';
  const colorClass=person==='henry'?'henry-color':'lauri-color';

  container.innerHTML=`
    <div class="personal-header ${colorClass}">
      <div class="personal-header-left">
        <button class="btn-chevron personal-toggle" data-person="${person}">${chevron}</button>
        <span>${name}'s personal expenses</span>
      </div>
      <div class="personal-header-right">
        <span class="personal-stat">
          <span class="personal-stat-label">Total</span>
          <strong>${fmt(spent)}</strong>
        </span>
      </div>
    </div>
    <div class="personal-body ${p.collapsed?'collapsed':''}">
      <div class="personal-rows" id="${person}-personal-rows"></div>
      <div class="personal-add-row">
        <button class="btn-add-sub" data-person="${person}">+ Add expense</button>
      </div>
    </div>`;

  const rowsEl=document.getElementById(`${person}-personal-rows`);
  (p.subs||[]).forEach((sub,sIdx)=>{
    const row=document.createElement('div');
    row.className='personal-item-row';
    row.innerHTML=`
      <div class="sub-name-cell"><span class="sub-indent">└</span><span class="sub-name-text">${sub.name}</span></div>
      <input type="number" class="sub-input personal-sub-input" data-person="${person}" data-sidx="${sIdx}"
        value="${sub.real||''}" placeholder="0" min="0" step="10" />
      <button class="btn-icon personal-del" data-person="${person}" data-sidx="${sIdx}" title="Remove">✕</button>`;
    rowsEl.appendChild(row);
  });

  container.querySelector('.personal-toggle').addEventListener('click',()=>{
    data.personal[person].collapsed=!data.personal[person].collapsed;
    recalc();
  });
  container.querySelectorAll('.personal-sub-input').forEach(input=>{
    input.addEventListener('change',e=>{
      const {person:p2,sidx}=e.target.dataset;
      getBudgetData().personal[p2].subs[+sidx].real=+e.target.value||0;
      recalc();
    });
  });
  container.querySelectorAll('.personal-del').forEach(btn=>{
    btn.addEventListener('click',e=>{
      const {person:p2,sidx}=e.currentTarget.dataset;
      data.personal[p2].subs.splice(+sidx,1);
      recalc();
    });
  });
  const addBtn=container.querySelector('.personal-add-row .btn-add-sub[data-person]');
  if(addBtn) addBtn.addEventListener('click',()=>openPersonalSubModal(person));
}

// ─── Split / who pays what ────────────────────────────────────────────────────

function renderSplitSection(t) {
  const hRows=document.getElementById('henry-split-rows');
  const lRows=document.getElementById('lauri-split-rows');
  hRows.innerHTML=''; lRows.innerHTML='';
  let hTot=0, lTot=0;
  t.data.categories.forEach(cat=>{
    const a=catSplitAmounts(cat,t.rH,t.rL);
    hTot+=a.henry; lTot+=a.lauri;
    hRows.innerHTML+=`<div class="split-row"><span class="split-row-name">${cat.emoji} ${cat.name}</span><span class="split-amt">${fmt(a.henry)}</span></div>`;
    lRows.innerHTML+=`<div class="split-row"><span class="split-row-name">${cat.emoji} ${cat.name}</span><span class="split-amt">${fmt(a.lauri)}</span></div>`;
  });
  if(t.henryPersonal>0) hRows.innerHTML+=`<div class="split-row"><span class="split-row-name">👤 Personal</span><span class="split-amt">${fmt(t.henryPersonal)}</span></div>`;
  if(t.lauriPersonal>0) lRows.innerHTML+=`<div class="split-row"><span class="split-row-name">👤 Personal</span><span class="split-amt">${fmt(t.lauriPersonal)}</span></div>`;
  hTot+=t.henryPersonal; lTot+=t.lauriPersonal;
  const hDisp=t.henry-hTot, lDisp=t.lauri-lTot;
  document.getElementById('henry-total-row').innerHTML=`
    <span>Total spent</span><span>${fmt(hTot)}</span>`;
  document.getElementById('lauri-total-row').innerHTML=`
    <span>Total spent</span><span>${fmt(lTot)}</span>`;
  document.getElementById('henry-remaining-row').innerHTML=`
    <span>Remaining</span><span class="${hDisp<0?'over':''}">${fmt(hDisp)}</span>`;
  document.getElementById('lauri-remaining-row').innerHTML=`
    <span>Remaining</span><span class="${lDisp<0?'over':''}">${fmt(lDisp)}</span>`;
}


// ─── Transfers ────────────────────────────────────────────────────────────────

function renderTransfers(t) {
  const el = document.getElementById('transfers-section');
  if (!el) return;

  // henryNet > 0 means Henry overpaid → Lauri owes Henry
  // henryNet < 0 means Henry underpaid → Henry owes Lauri
  const amount = Math.abs(t.henryNet);
  const noTransfer = amount < 0.01;

  let html = '';
  if (noTransfer) {
    html = `<div class="transfer-balanced">✓ No transfers needed — payments are balanced</div>`;
  } else if (t.henryNet > 0) {
    // Henry overpaid shared costs → Lauri owes Henry
    html = `
      <div class="transfer-row">
        <div class="transfer-arrow lauri-color-text">Lauri → Henry</div>
        <div class="transfer-amount henry-color-text">${fmt(amount)}</div>
        <div class="transfer-reason">Lauri's share of shared costs paid by Henry's account</div>
      </div>`;
  } else {
    // Lauri overpaid → Henry owes Lauri
    html = `
      <div class="transfer-row">
        <div class="transfer-arrow henry-color-text">Henry → Lauri</div>
        <div class="transfer-amount lauri-color-text">${fmt(amount)}</div>
        <div class="transfer-reason">Henry's share of shared costs paid by Lauri's account</div>
      </div>`;
  }

  // Detail breakdown
  html += `<div class="transfer-detail">
    <div class="transfer-detail-row">
      <span class="henry-color-text">Henry paid from account</span>
      <span>${fmt(t.henryPaid)}</span>
    </div>
    <div class="transfer-detail-row">
      <span class="henry-color-text">Henry's actual share</span>
      <span>${fmt(t.henryOwed)}</span>
    </div>
    <div class="transfer-detail-row">
      <span class="lauri-color-text">Lauri paid from account</span>
      <span>${fmt(t.lauriPaid)}</span>
    </div>
    <div class="transfer-detail-row">
      <span class="lauri-color-text">Lauri's actual share</span>
      <span>${fmt(t.lauriOwed)}</span>
    </div>
  </div>`;

  el.innerHTML = html;
}

// ─── Charts ───────────────────────────────────────────────────────────────────

let chartInstances = {};

function destroyCharts() {
  Object.values(chartInstances).forEach(c=>{ try{c.destroy();}catch{} });
  chartInstances={};
}

function renderCharts(t) {
  destroyCharts();

  // Ensure canvases have explicit pixel dimensions (needed when tab was hidden)
  ['chart-breakdown','chart-income-spend','chart-buckets'].forEach(id=>{
    const wrap=document.getElementById(id)?.parentElement;
    const el=document.getElementById(id);
    if(wrap&&el){ el.width=wrap.offsetWidth||600; el.height=wrap.offsetHeight||260; }
  });

  const isDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
  const textColor=isDark?'#aaa':'#555';
  const gridColor=isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)';

  // 1. Spending breakdown donut
  const catLabels=t.data.categories.map(c=>c.name);
  const catValues=t.data.categories.map(c=>catTotal(c));
  const colors=['#534AB7','#0F6E56','#B87333','#6B3FA0','#C0392B','#2980B9','#8B7355','#27AE60'];

  const ctx1=document.getElementById('chart-breakdown')?.getContext('2d');
  if(ctx1){
    chartInstances.breakdown=new Chart(ctx1,{
      type:'doughnut',
      data:{
        labels:[...catLabels,'Henry personal','Lauri personal'],
        datasets:[{
          data:[...catValues, t.henryPersonal, t.lauriPersonal],
          backgroundColor:[...colors.slice(0,catLabels.length),'#534AB7aa','#0F6E56aa'],
          borderWidth:0,
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'right', labels:{color:textColor,boxWidth:12,padding:12} } }
      }
    });
  }

  // 2. Income vs spending bar
  const ctx2=document.getElementById('chart-income-spend')?.getContext('2d');
  if(ctx2){
    chartInstances.incomeSpend=new Chart(ctx2,{
      type:'bar',
      data:{
        labels:['Henry','Lauri'],
        datasets:[
          { label:'Income', data:[t.henry,t.lauri], backgroundColor:'#534AB7aa', borderRadius:6 },
          { label:'Shared expenses', data:[t.henryShared,t.lauriShared], backgroundColor:'#C0392Baa', borderRadius:6 },
          { label:'Personal expenses', data:[t.henryPersonal,t.lauriPersonal], backgroundColor:'#B87333aa', borderRadius:6 },
          { label:'Remaining', data:[Math.max(0,t.henryDisposable),Math.max(0,t.lauriDisposable)], backgroundColor:'#0F6E56aa', borderRadius:6 },
        ]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{color:textColor} } },
        scales:{
          x:{ ticks:{color:textColor}, grid:{color:gridColor} },
          y:{ ticks:{color:textColor, callback:v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}, grid:{color:gridColor} }
        }
      }
    });
  }

  // Resize observer — redraw charts when window resizes
  if(window._chartResizeObserver) window._chartResizeObserver.disconnect();
  window._chartResizeObserver = new ResizeObserver(()=>{
    if(state.activeTab==='charts') {
      requestAnimationFrame(()=>renderCharts(calcTotals()));
    }
  });
  const firstChart=document.getElementById('chart-breakdown');
  if(firstChart) window._chartResizeObserver.observe(firstChart.parentElement);

  // 3. Budget rule bucket bar
  const rule=RULES[state.activeRule];
  const actualByBucket={};
  rule.buckets.forEach(b=>actualByBucket[b.id]=0);
  t.data.categories.forEach(cat=>{
    const bId=cat.bucket||rule.buckets[0].id;
    if(actualByBucket[bId]!==undefined) actualByBucket[bId]+=catTotal(cat);
  });
  const ctx3=document.getElementById('chart-buckets')?.getContext('2d');
  if(ctx3){
    chartInstances.buckets=new Chart(ctx3,{
      type:'bar',
      data:{
        labels:rule.buckets.map(b=>b.label),
        datasets:[
          { label:'Budget', data:rule.buckets.map(b=>t.total*b.pct/100), backgroundColor:rule.buckets.map(b=>b.color+'66'), borderRadius:6 },
          { label:'Actual', data:rule.buckets.map(b=>actualByBucket[b.id]||0), backgroundColor:rule.buckets.map(b=>b.color), borderRadius:6 },
        ]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{color:textColor} } },
        scales:{
          x:{ ticks:{color:textColor}, grid:{color:gridColor} },
          y:{ ticks:{color:textColor, callback:v=>Number(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}, grid:{color:gridColor} }
        }
      }
    });
  }
}

// ─── Export: Excel ────────────────────────────────────────────────────────────

function exportExcel() {
  const t=calcTotals();
  const rows=[
    ['H&L Household Budget'],
    [],
    ['INCOME','Henry','Lauri','Total'],
    ['',t.henry,t.lauri,t.total],
    [],
    ['SHARED EXPENSES','Category','Item','Total','Henry','Lauri'],
  ];
  t.data.categories.forEach(cat=>{
    (cat.subs||[]).forEach(sub=>{
      const a=subAmounts(sub,t.rH,t.rL);
      rows.push(['',cat.name,sub.name,+sub.real||0,Math.round(a.henry),Math.round(a.lauri)]);
    });
    const a=catSplitAmounts(cat,t.rH,t.rL);
    rows.push(['','TOTAL: '+cat.name,'',catTotal(cat),Math.round(a.henry),Math.round(a.lauri)]);
    rows.push([]);
  });
  rows.push(['PERSONAL EXPENSES','','','','','']);
  ['henry','lauri'].forEach(person=>{
    const name=person==='henry'?'Henry':'Lauri';
    (t.data.personal[person]?.subs||[]).forEach(sub=>{
      rows.push(['',name,sub.name,+sub.real||0,'','']);
    });
  });
  rows.push([]);
  rows.push(['SUMMARY','','','','Henry','Lauri']);
  rows.push(['','Total shared','','',t.henryShared.toFixed(2),t.lauriShared.toFixed(2)]);
  rows.push(['','Total personal','','',t.henryPersonal,t.lauriPersonal]);
  rows.push(['','Total spent','','',t.henryTotal.toFixed(2),t.lauriTotal.toFixed(2)]);
  rows.push(['','Remaining','','',t.henryDisposable.toFixed(2),t.lauriDisposable.toFixed(2)]);

  // Build CSV (xlsx without SheetJS — clean CSV that Excel opens perfectly)
  const csv=rows.map(r=>r.map(c=>{
    const s=String(c??'');
    return s.includes(',')||s.includes('"') ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(',')).join('\r\n');

  const bom='\uFEFF'; // UTF-8 BOM so Excel opens with correct encoding
  const blob=new Blob([bom+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='HL-Budget.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ─── Export: PDF ──────────────────────────────────────────────────────────────

function exportPDF() {
  const t=calcTotals();
  const w=window.open('','_blank');
  const style=`
    body{font-family:system-ui,sans-serif;padding:32px;color:#111;max-width:900px;margin:auto}
    h1{font-size:22px;margin-bottom:4px}
    h2{font-size:15px;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
    th{text-align:left;padding:6px 8px;background:#f4f4f4;font-weight:600;font-size:12px}
    td{padding:5px 8px;border-bottom:1px solid #eee}
    .num{text-align:right;font-variant-numeric:tabular-nums}
    .total{font-weight:700;background:#f9f9f9}
    .henry{color:#534AB7}.lauri{color:#0F6E56}
    .over{color:#C0392B}.sub{color:#666;padding-left:20px}
    .summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
    .summary-box{background:#f7f7f7;border-radius:8px;padding:16px}
    .summary-box h3{font-size:13px;margin:0 0 12px;font-weight:700}
    .sum-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid #eee}
    .sum-row:last-child{border:none;font-weight:700;margin-top:4px}
  `;
  let html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>H&L Budget</title><style>${style}</style></head><body>`;
  html+=`<h1>Henry &amp; Lauri — Household Budget</h1><p style="color:#888;font-size:12px">Generated ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>`;

  // Income
  html+=`<h2>Income</h2><table><tr><th></th><th class="num">Henry</th><th class="num">Lauri</th><th class="num">Total</th></tr>`;
  html+=`<tr><td>Net monthly income</td><td class="num henry">${fmt(t.henry)}</td><td class="num lauri">${fmt(t.lauri)}</td><td class="num">${fmt(t.total)}</td></tr></table>`;

  // Shared expenses
  html+=`<h2>Shared Expenses</h2><table><tr><th>Category / Item</th><th class="num">Total</th><th class="num henry">Henry</th><th class="num lauri">Lauri</th></tr>`;
  t.data.categories.forEach(cat=>{
    const ca=catSplitAmounts(cat,t.rH,t.rL);
    html+=`<tr class="total"><td>${cat.emoji} ${cat.name}</td><td class="num">${fmt(catTotal(cat))}</td><td class="num henry">${fmt(ca.henry)}</td><td class="num lauri">${fmt(ca.lauri)}</td></tr>`;
    (cat.subs||[]).forEach(sub=>{
      const a=subAmounts(sub,t.rH,t.rL);
      if(+sub.real) html+=`<tr><td class="sub">└ ${sub.name}</td><td class="num">${fmt(+sub.real)}</td><td class="num">${fmt(a.henry)}</td><td class="num">${fmt(a.lauri)}</td></tr>`;
    });
  });
  html+=`<tr class="total"><td>Subtotal</td><td class="num">${fmt(t.totalShared)}</td><td class="num henry">${fmt(t.henryShared)}</td><td class="num lauri">${fmt(t.lauriShared)}</td></tr></table>`;

  // Personal
  html+=`<h2>Personal Expenses</h2><table><tr><th>Person / Item</th><th class="num">Amount</th></tr>`;
  ['henry','lauri'].forEach(person=>{
    const name=person==='henry'?'Henry':'Lauri';
    const subs=t.data.personal[person]?.subs||[];
    if(subs.length){
      subs.forEach(sub=>{
        if(+sub.real) html+=`<tr><td class="${person}">${name} — ${sub.name}</td><td class="num">${fmt(+sub.real)}</td></tr>`;
      });
    }
  });
  html+=`</table>`;

  // Summary
  html+=`<h2>Summary</h2><div class="summary-grid">`;
  ['henry','lauri'].forEach(person=>{
    const name=person==='henry'?'Henry':'Lauri';
    const inc=person==='henry'?t.henry:t.lauri;
    const sh=person==='henry'?t.henryShared:t.lauriShared;
    const pe=person==='henry'?t.henryPersonal:t.lauriPersonal;
    const disp=person==='henry'?t.henryDisposable:t.lauriDisposable;
    html+=`<div class="summary-box"><h3 class="${person}">${name}</h3>
      <div class="sum-row"><span>Income</span><span>${fmt(inc)}</span></div>
      <div class="sum-row"><span>Shared expenses</span><span>− ${fmt(sh)}</span></div>
      <div class="sum-row"><span>Personal expenses</span><span>− ${fmt(pe)}</span></div>
      <div class="sum-row"><span>Remaining</span><span class="${disp<0?'over':''}">${fmt(disp)}</span></div>
    </div>`;
  });
  html+=`</div></body></html>`;

  w.document.write(html);
  w.document.close();
  setTimeout(()=>w.print(),400);
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
  document.getElementById('modal-title').textContent=`Add item to "${getBudgetData().categories[cIdx].name}"`;
  document.getElementById('modal-backdrop').style.display='flex';
  setTimeout(()=>document.getElementById('new-cat-name').focus(),50);
}

function openPersonalSubModal(person) {
  modalMode='personal'; modalPerson=person;
  document.getElementById('new-cat-name').value='';
  document.getElementById('modal-icon-row').style.display='none';
  document.getElementById('modal-bucket-label').style.display='none';
  document.getElementById('modal-bucket').style.display='none';
  document.getElementById('modal-title').textContent=`Add expense for ${person==='henry'?'Henry':'Lauri'}`;
  document.getElementById('modal-backdrop').style.display='flex';
  setTimeout(()=>document.getElementById('new-cat-name').focus(),50);
}

function closeModal() { document.getElementById('modal-backdrop').style.display='none'; }

function buildIconPicker() {
  const picker=document.getElementById('icon-picker');
  picker.innerHTML='';
  ICONS.forEach(icon=>{
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
  if(modalMode==='category'){
    const bucketEl=document.getElementById('modal-bucket');
    const bucket=(bucketEl&&bucketEl.options.length>0)?bucketEl.value:RULES[state.activeRule].buckets[0].id;
    data.categories.push({id:uid(),emoji:selectedIcon,name,collapsed:true,bucket,subs:[]});
  } else if(modalMode==='sub'){
    data.categories[modalCatIdx].subs.push({id:uid(),name,real:0,splitH:null,splitL:null,payer:null});
    data.categories[modalCatIdx].collapsed=false;
  } else if(modalMode==='personal'){
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
  if(!state.activeRule) state.activeRule='50-30-20';
  if(!state.activeTab)  state.activeTab='budget';
  getBudgetData();

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      state.activeTab=btn.dataset.tab;
      renderTabs();
      if(state.activeTab==='charts') requestAnimationFrame(()=>requestAnimationFrame(()=>renderCharts(calcTotals())));
    });
  });

  renderTabs();
  renderRuleBar();
  bindIncomeInputs();

  document.getElementById('btn-add-cat').addEventListener('click',openCatModal);
  document.getElementById('modal-cancel').addEventListener('click',closeModal);
  document.getElementById('modal-confirm').addEventListener('click',confirmModal);
  document.getElementById('modal-backdrop').addEventListener('click',e=>{ if(e.target===e.currentTarget)closeModal(); });
  document.getElementById('new-cat-name').addEventListener('keydown',e=>{ if(e.key==='Enter')confirmModal(); if(e.key==='Escape')closeModal(); });

  document.getElementById('cat-rows').addEventListener('click',e=>{
    const btn=e.target.closest('.btn-add-sub[data-cidx]');
    if(btn) openSubModal(+btn.dataset.cidx);
  });

  document.getElementById('btn-export-excel').addEventListener('click',exportExcel);
  document.getElementById('btn-export-pdf').addEventListener('click',exportPDF);

  render();
}

document.addEventListener('DOMContentLoaded',init);
