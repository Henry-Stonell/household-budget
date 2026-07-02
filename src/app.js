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
    { id:'housing',   emoji:'🏠', name:'Housing', plan:{period:'monthly',items:[]},           collapsed:true, bucket:ruleId==='envelope'?'housing':needs,
      subs:[mk('Rent / mortgage')] },
    { id:'groceries', emoji:'🛒', name:'Groceries & food', plan:{period:'weekly',items:[]},  collapsed:true, bucket:ruleId==='envelope'?'food':needs,
      subs:[mk('Supermarket'), mk('Takeaway & dining')] },
    { id:'transport', emoji:'🚗', name:'Transport', plan:{period:'monthly',items:[]},         collapsed:true, bucket:ruleId==='envelope'?'transport':needs,
      subs:[mk('Car payment'), mk('Fuel'), mk('Public transport')] },
    { id:'utilities', emoji:'⚡', name:'Utilities & bills', plan:{period:'monthly',items:[]}, collapsed:true, bucket:ruleId==='envelope'?'other':needs,
      subs:[mk('Electricity'), mk('Internet'), mk('Phone')] },
    { id:'savings',   emoji:'💰', name:'Savings', plan:{period:'monthly',items:[]},           collapsed:true, bucket:ruleId==='envelope'?'savings':bSav,
      subs:[mk('Emergency fund'), mk('Investments')] },
    { id:'kids',      emoji:'👶', name:'Kids & family', plan:{period:'monthly',items:[]},     collapsed:true, bucket:ruleId==='envelope'?'other':needs,
      subs:[mk('Childcare'), mk('Activities')] },
  ];
}

const ICONS = ['🏠','🛒','🚗','⚡','💰','👶','🍽️','🎬','🏥','📱','🐾','🧴','🎓','✈️','🏋️','🎁','🧾','🔧','🌿','💻','🎯','🐶','🎵','🛁','🍺','👗','🏖️','🎮'];

// ─── State ────────────────────────────────────────────────────────────────────

let state = { budget: null, activeRule: '50-30-20', activeTab: 'budget', plannerCatId: null };

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
      if (!cat.plan) cat.plan = { period:'monthly', items:[] };
    });
    if (!Array.isArray(s.budget.debts)) s.budget.debts = [];
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
      debts: [],  // { id, description, owedBy:'henry'|'lauri', amount, settled:false }
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
  // Debt adjustments — unsettled debts shift the net transfer
  let henryDebtOwed = 0, lauriDebtOwed = 0;
  (data.debts||[]).filter(d=>!d.settled).forEach(d=>{
    if(d.owedBy==='henry') henryDebtOwed += +d.amount||0;  // Henry owes Lauri
    else lauriDebtOwed += +d.amount||0;                     // Lauri owes Henry
  });
  const henryNet = henryPaid - henryOwed + lauriDebtOwed - henryDebtOwed;
  const lauriNet = lauriPaid - lauriOwed + henryDebtOwed - lauriDebtOwed;

  // Disposable = income − total spent (shared share + all personal)
  const henryDisposable = henry - henryTotal;
  const lauriDisposable = lauri - lauriTotal;

  return { data, henry, lauri, total, rH, rL,
           henryShared, lauriShared, totalShared,
           henryPersonal, lauriPersonal,
           henryTotal, lauriTotal,
           henryDisposable, lauriDisposable,
           henryPaid, lauriPaid, henryOwed, lauriOwed, henryNet, lauriNet,
           henryDebtOwed, lauriDebtOwed };
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
  renderDebts(t);
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
        <div class="split-control ${hasCustom?'is-custom':''}" data-cidx="${cIdx}" data-sidx="${sIdx}">
          <div class="split-input-wrap">
            <span class="henry-share split-label-sm">H</span>
            <input type="number" class="split-pct-input henry-pct-input" title="Henry's % (auto-adjusts Lauri)"
              min="0" max="100" step="1" value="${sH}" data-cidx="${cIdx}" data-sidx="${sIdx}" data-person="henry" />
            <span class="split-sep">%</span>
          </div>
          <div class="split-input-wrap">
            <span class="lauri-share split-label-sm">L</span>
            <input type="number" class="split-pct-input lauri-pct-input" title="Lauri's % (auto-adjusts Henry)"
              min="0" max="100" step="1" value="${sL}" data-cidx="${cIdx}" data-sidx="${sIdx}" data-person="lauri" />
            <span class="split-sep">%</span>
          </div>
          <button class="btn-reset-split" data-cidx="${cIdx}" data-sidx="${sIdx}" title="Reset to income ratio">↺</button>
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
  container.querySelectorAll('.split-pct-input').forEach(input=>{
    input.addEventListener('change',e=>{
      const {cidx,sidx,person}=e.target.dataset;
      let val=Math.min(100,Math.max(0,+e.target.value||0));
      e.target.value=val;
      const sub=data.categories[+cidx].subs[+sidx];
      if(person==='henry'){ sub.splitH=val; sub.splitL=100-val; }
      else { sub.splitL=val; sub.splitH=100-val; }
      // Update the sibling input immediately
      const wrap=e.target.closest('.split-control');
      const other=wrap.querySelector(person==='henry'?'.lauri-pct-input':'.henry-pct-input');
      if(other) other.value=person==='henry'?100-val:100-val;
      wrap.classList.add('is-custom');
      recalc();
    });
  });
  container.querySelectorAll('.btn-reset-split').forEach(btn=>{
    btn.addEventListener('click',e=>{
      const {cidx,sidx}=e.currentTarget.dataset;
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



// ─── Debts ledger ─────────────────────────────────────────────────────────────

function renderDebts(t) {
  const el = document.getElementById('debts-list');
  if (!el) { console.warn('debts-list not found'); return; }
  const debts = (t.data.debts || []).filter(Boolean);

  if (debts.length === 0) {
    el.innerHTML = `<div class="debt-empty">No debts recorded — add one below.</div>`;
    return;
  }

  el.innerHTML = debts.map((d, i) => {
    const owedByName = d.owedBy === 'henry' ? 'Henry' : 'Lauri';
    const owedToName = d.owedBy === 'henry' ? 'Lauri' : 'Henry';
    const colorClass  = d.owedBy === 'henry' ? 'henry-color-text' : 'lauri-color-text';
    return `
      <div class="debt-row ${d.settled ? 'settled' : ''}">
        <div class="debt-info">
          <span class="debt-desc">${d.description}</span>
          <span class="debt-who ${colorClass}">${owedByName} → ${owedToName}</span>
        </div>
        <span class="debt-amount">${fmt(+d.amount||0)}</span>
        <div class="debt-actions">
          <button class="btn-settle ${d.settled?'settled':''}" data-idx="${i}" title="${d.settled?'Mark as unsettled':'Mark as settled'}">
            ${d.settled ? '↩ Reopen' : '✓ Settled'}
          </button>
          <button class="btn-icon btn-del-debt" data-idx="${i}" title="Delete">✕</button>
        </div>
      </div>`;
  }).join('');

  // Events
  el.querySelectorAll('.btn-settle').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = +e.currentTarget.dataset.idx;
      t.data.debts[idx].settled = !t.data.debts[idx].settled;
      recalc();
    });
  });
  el.querySelectorAll('.btn-del-debt').forEach(btn => {
    btn.addEventListener('click', e => {
      const idx = +e.currentTarget.dataset.idx;
      if (confirm(`Delete "${t.data.debts[idx].description}"?`)) {
        t.data.debts.splice(idx, 1);
        recalc();
      }
    });
  });
}

function addDebt() {
  const desc    = document.getElementById('debt-desc').value.trim();
  const owedBy  = document.getElementById('debt-owedby').value;
  const amount  = parseFloat(document.getElementById('debt-amount').value);
  if (!desc) { document.getElementById('debt-desc').focus(); return; }
  if (!amount || amount <= 0) { document.getElementById('debt-amount').focus(); return; }
  const data = getBudgetData();
  data.debts.push({ id: uid(), description: desc, owedBy, amount, settled: false });
  document.getElementById('debt-desc').value = '';
  document.getElementById('debt-amount').value = '';
  recalc();
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

  // Debt line
  const totalDebtH = t.henryDebtOwed||0;
  const totalDebtL = t.lauriDebtOwed||0;
  if(totalDebtH > 0.01 || totalDebtL > 0.01) {
    html += `<div class="transfer-debts-line">`;
    if(totalDebtH > 0.01) html += `<span class="henry-color-text">Henry owes Lauri ${fmt(totalDebtH)} (debts)</span>`;
    if(totalDebtL > 0.01) html += `<span class="lauri-color-text">Lauri owes Henry ${fmt(totalDebtL)} (debts)</span>`;
    html += `</div>`;
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

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const textColor  = isDark ? '#b0afc0' : '#444';
  const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const fmtEur = v => '€' + Number(v).toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2});
  const COLORS = ['#534AB7','#0F6E56','#B87333','#6B3FA0','#C0392B','#2980B9','#E67E22','#16A085'];

  const sharedOpts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    plugins: {
      legend: { labels: { color: textColor, boxWidth: 14, padding: 14, font: { size: 12 } } },
      tooltip: {
        callbacks: {
          label: ctx => ' ' + fmtEur(ctx.parsed.y ?? ctx.parsed)
        }
      }
    }
  };

  function axisOpts() {
    return {
      x: { ticks: { color: textColor, font:{size:11} }, grid: { color: gridColor } },
      y: { ticks: { color: textColor, font:{size:11}, callback: v => fmtEur(v) }, grid: { color: gridColor } }
    };
  }

  // ── Chart 1: Spending breakdown horizontal bar ──────────────────────────────
  const catLabels = t.data.categories.map(c => c.emoji + ' ' + c.name);
  const catValues = t.data.categories.map(c => catTotal(c));
  const allLabels = [...catLabels];
  const allValues = [...catValues];
  if (t.henryPersonal > 0) { allLabels.push('👤 Henry personal'); allValues.push(t.henryPersonal); }
  if (t.lauriPersonal > 0) { allLabels.push('👤 Lauri personal'); allValues.push(t.lauriPersonal); }
  const totalSpend = allValues.reduce((a,b)=>a+b,0);

  const ctx1 = document.getElementById('chart-breakdown')?.getContext('2d');
  if (ctx1) {
    chartInstances.breakdown = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: allLabels,
        datasets: [{
          label: 'Monthly spend',
          data: allValues,
          backgroundColor: COLORS.slice(0, allValues.length).map(c=>c+'cc'),
          borderRadius: 5,
        }]
      },
      options: {
        ...sharedOpts,
        indexAxis: 'y',
        plugins: {
          ...sharedOpts.plugins,
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const pct = totalSpend > 0 ? (ctx.parsed.x / totalSpend * 100).toFixed(1) : 0;
                return ` ${fmtEur(ctx.parsed.x)}  (${pct}% of total spend)`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: textColor, callback: v => fmtEur(v) }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, font:{size:12} }, grid: { display: false } }
        }
      }
    });
  }

  // ── Chart 2: Income vs spending stacked bar ─────────────────────────────────
  const ctx2 = document.getElementById('chart-income-spend')?.getContext('2d');
  if (ctx2) {
    chartInstances.incomeSpend = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['Henry', 'Lauri'],
        datasets: [
          {
            label: 'Shared expenses',
            data: [t.henryShared, t.lauriShared],
            backgroundColor: '#C0392Bcc', borderRadius: 0,
            stack: 'spend',
          },
          {
            label: 'Personal expenses',
            data: [t.henryPersonal, t.lauriPersonal],
            backgroundColor: '#B87333cc', borderRadius: 0,
            stack: 'spend',
          },
          {
            label: 'Remaining',
            data: [Math.max(0, t.henryDisposable), Math.max(0, t.lauriDisposable)],
            backgroundColor: '#0F6E56cc', borderRadius: 5,
            stack: 'spend',
          },
          {
            label: 'Income',
            data: [t.henry, t.lauri],
            backgroundColor: 'transparent',
            borderColor: ['#534AB7','#534AB7'],
            borderWidth: 2,
            type: 'bar',
            stack: 'income',
            borderRadius: 5,
          }
        ]
      },
      options: {
        ...sharedOpts,
        scales: {
          ...axisOpts(),
          x: { ...axisOpts().x, stacked: true },
          y: { ...axisOpts().y, stacked: false },
        },
        plugins: {
          ...sharedOpts.plugins,
          tooltip: {
            callbacks: {
              label: ctx => {
                const pct = ctx.dataset.label === 'Income' ? '' :
                  ` (${((ctx.parsed.y / (ctx.datasetIndex < 2 ? t[ctx.dataIndex===0?'henry':'lauri'] : 1)) * 100).toFixed(0)}%)`;
                return ` ${ctx.dataset.label}: ${fmtEur(ctx.parsed.y)}`;
              }
            }
          }
        }
      }
    });
  }

  // ── Chart 3: Budget rule — target vs actual ─────────────────────────────────
  const rule = RULES[state.activeRule];
  const actualByBucket = {};
  rule.buckets.forEach(b => actualByBucket[b.id] = 0);
  t.data.categories.forEach(cat => {
    const bId = cat.bucket || rule.buckets[0].id;
    if (actualByBucket[bId] !== undefined) actualByBucket[bId] += catTotal(cat);
  });
  const ctx3 = document.getElementById('chart-buckets')?.getContext('2d');
  if (ctx3) {
    chartInstances.buckets = new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: rule.buckets.map(b => b.label),
        datasets: [
          {
            label: 'Target budget',
            data: rule.buckets.map(b => t.total * b.pct / 100),
            backgroundColor: rule.buckets.map(b => b.color + '44'),
            borderColor: rule.buckets.map(b => b.color),
            borderWidth: 2,
            borderRadius: 5,
          },
          {
            label: 'Actual spend',
            data: rule.buckets.map(b => actualByBucket[b.id] || 0),
            backgroundColor: rule.buckets.map(b => b.color + 'cc'),
            borderRadius: 5,
          }
        ]
      },
      options: {
        ...sharedOpts,
        scales: axisOpts(),
        plugins: {
          ...sharedOpts.plugins,
          tooltip: {
            callbacks: {
              label: ctx => {
                const bucket = rule.buckets[ctx.dataIndex];
                const target = t.total * bucket.pct / 100;
                const actual = actualByBucket[bucket.id] || 0;
                const diff   = actual - target;
                if (ctx.dataset.label === 'Actual spend') {
                  return [
                    ` Actual: ${fmtEur(actual)}`,
                    ` Target: ${fmtEur(target)}`,
                    ` ${diff > 0 ? '⚠ Over by ' + fmtEur(diff) : '✓ Under by ' + fmtEur(-diff)}`
                  ];
                }
                return ` Target: ${fmtEur(ctx.parsed.y)} (${bucket.pct}% of income)`;
              }
            }
          }
        }
      }
    });
  }

  // ── Chart 4: Disposable remaining ──────────────────────────────────────────
  const ctx4 = document.getElementById('chart-disposable')?.getContext('2d');
  if (ctx4) {
    chartInstances.disposable = new Chart(ctx4, {
      type: 'doughnut',
      data: {
        labels: ['Henry spent','Henry remaining','Lauri spent','Lauri remaining'],
        datasets: [{
          data: [
            t.henryTotal, Math.max(0, t.henryDisposable),
            t.lauriTotal, Math.max(0, t.lauriDisposable)
          ],
          backgroundColor: ['#534AB7aa','#534AB722','#0F6E56aa','#0F6E5622'],
          borderWidth: 0,
        }]
      },
      options: {
        ...sharedOpts,
        plugins: {
          ...sharedOpts.plugins,
          legend: { position:'bottom', labels:{ color:textColor, boxWidth:12, padding:10, font:{size:11} } },
          tooltip: { callbacks: { label: ctx => ' ' + fmtEur(ctx.parsed) } }
        }
      }
    });
  }

  // Resize observer
  if (window._chartResizeObserver) window._chartResizeObserver.disconnect();
  window._chartResizeObserver = new ResizeObserver(() => {
    if (state.activeTab === 'charts') requestAnimationFrame(() => renderCharts(calcTotals()));
  });
  const firstWrap = document.getElementById('chart-breakdown')?.closest('.chart-wrap');
  if (firstWrap) window._chartResizeObserver.observe(firstWrap);
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



// ─── Plans tab ────────────────────────────────────────────────────────────────

function renderPlansTab() {
  const data = getBudgetData();
  const t    = calcTotals();
  const container = document.getElementById('plans-grid');
  if (!container) return;

  if (state.plannerCatId) {
    // Show single category planner
    const cat = data.categories.find(c => c.id === state.plannerCatId);
    if (!cat) { state.plannerCatId = null; renderPlansTab(); return; }
    renderCategoryPlanner(cat, t);
    return;
  }

  // Show grid of category cards
  document.getElementById('plans-back').style.display = 'none';
  container.innerHTML = '';
  data.categories.forEach(cat => {
    if (!cat.plan) cat.plan = { period:'monthly', items:[] };
    const actual  = catTotal(cat);
    const planned = planTotal(cat);
    const period  = cat.plan.period || 'monthly';
    const budgetAmt = actual; // actual from main budget is the target
    const monthlyPlanned = period === 'weekly' ? planned * 4.33 : planned;
    const diff = monthlyPlanned - budgetAmt;
    const over = diff > 0.01;
    const card = document.createElement('div');
    card.className = 'plan-card';
    card.innerHTML = `
      <div class="plan-card-top">
        <span class="plan-card-emoji">${cat.emoji}</span>
        <div class="plan-card-info">
          <span class="plan-card-name">${cat.name}</span>
          <span class="plan-card-period">${period === 'weekly' ? 'Weekly plan' : 'Monthly plan'}</span>
        </div>
        <div class="plan-card-nums">
          <span class="plan-card-budget">${fmt(budgetAmt)} budget</span>
          <span class="plan-card-planned ${over?'over':''}">${fmt(monthlyPlanned)} planned</span>
        </div>
      </div>
      <div class="plan-bar-track">
        <div class="plan-bar-fill" style="width:${budgetAmt>0?Math.min(100,monthlyPlanned/budgetAmt*100):0}%;background:${over?'#C0392B':'#534AB7'}"></div>
      </div>
      <div class="plan-card-foot">
        <span class="${over?'over lauri-color-text':''}">${cat.plan.items.length} items · ${over?'+'+fmt(diff)+' over':diff<-0.01?fmt(-diff)+' under':'on target'}</span>
        <button class="btn-ghost plan-open-btn" data-catid="${cat.id}">Open plan →</button>
      </div>`;
    container.appendChild(card);
  });

  container.querySelectorAll('.plan-open-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      state.plannerCatId = e.currentTarget.dataset.catid;
      renderPlansTab();
    });
  });
}

function planTotal(cat) {
  return (cat.plan?.items||[]).reduce((s,i) => s + (+i.amount||0), 0);
}

function renderCategoryPlanner(cat, t) {
  const container = document.getElementById('plans-grid');
  document.getElementById('plans-back').style.display = 'flex';
  document.getElementById('plans-back-label').textContent = `${cat.emoji} ${cat.name}`;

  const plan    = cat.plan || { period:'monthly', items:[] };
  const actual  = catTotal(cat);
  const planned = planTotal(cat);
  const period  = plan.period || 'monthly';
  const monthlyPlanned = period === 'weekly' ? planned * 4.33 : planned;
  const diff    = monthlyPlanned - actual;
  const over    = diff > 0.01;
  const weeklyBudget  = actual / 4.33;
  const monthlyBudget = actual;

  container.innerHTML = `
    <div class="planner-wrap">
      <div class="planner-header">
        <div class="planner-summary">
          <div class="planner-stat">
            <span class="planner-stat-label">Monthly budget (from main)</span>
            <span class="planner-stat-val">${fmt(monthlyBudget)}</span>
          </div>
          <div class="planner-stat">
            <span class="planner-stat-label">Equivalent per week</span>
            <span class="planner-stat-val">${fmt(weeklyBudget)}</span>
          </div>
          <div class="planner-stat">
            <span class="planner-stat-label">Total planned (${period})</span>
            <span class="planner-stat-val">${fmt(planned)}</span>
          </div>
          <div class="planner-stat">
            <span class="planner-stat-label">Monthly equivalent</span>
            <span class="planner-stat-val ${over?'over':''}">${fmt(monthlyPlanned)}</span>
          </div>
        </div>
        <div class="planner-period-wrap">
          <label class="planner-period-label">Plan by</label>
          <div class="planner-period-pills">
            <button class="period-pill ${period==='weekly'?'active':''}" data-period="weekly">Weekly</button>
            <button class="period-pill ${period==='monthly'?'active':''}" data-period="monthly">Monthly</button>
          </div>
        </div>
      </div>

      <div class="planner-bar-track">
        <div class="planner-bar-fill" style="width:${actual>0?Math.min(100,monthlyPlanned/actual*100):0}%;background:${over?'#C0392B':'#534AB7'}"></div>
      </div>
      <div class="planner-bar-labels">
        <span>${over?'⚠ '+fmt(diff)+' over monthly budget':'✓ '+fmt(-diff)+' under budget'}</span>
        <span>${actual>0?Math.round(monthlyPlanned/actual*100):0}% of budget</span>
      </div>

      <div class="planner-items" id="planner-items-list"></div>

      <div class="planner-add-row">
        <input type="text" id="plan-item-name" placeholder="Item name e.g. Vegetables" style="flex:1;min-width:140px" />
        <input type="number" id="plan-item-amount" placeholder="${period==='weekly'?'Weekly cost €':'Monthly cost €'}" min="0" step="0.50" style="width:160px" />
        <button class="btn-primary" id="btn-add-plan-item">+ Add item</button>
      </div>
    </div>`;

  renderPlanItems(cat, t, period);

  // Period pills
  container.querySelectorAll('.period-pill').forEach(btn => {
    btn.addEventListener('click', e => {
      cat.plan.period = e.currentTarget.dataset.period;
      saveState();
      renderCategoryPlanner(cat, t);
    });
  });

  // Add item
  document.getElementById('btn-add-plan-item').addEventListener('click', () => addPlanItem(cat, t));
  document.getElementById('plan-item-amount').addEventListener('keydown', e => {
    if (e.key === 'Enter') addPlanItem(cat, t);
  });
}

function renderPlanItems(cat, t, period) {
  const list = document.getElementById('planner-items-list');
  if (!list) return;
  const items = cat.plan?.items || [];

  if (items.length === 0) {
    list.innerHTML = `<div class="plan-item-empty">No items yet — add your first planned expense below.</div>`;
    return;
  }

  const weeklyBudget = catTotal(cat) / 4.33;

  list.innerHTML = '';
  items.forEach((item, idx) => {
    const monthly = period === 'weekly' ? (+item.amount||0) * 4.33 : +item.amount||0;
    const pctOfBudget = weeklyBudget > 0 ? Math.min(100, (period==='weekly'?+item.amount:monthly/4.33) / weeklyBudget * 100) : 0;
    const row = document.createElement('div');
    row.className = 'plan-item-row';
    row.innerHTML = `
      <div class="plan-item-left">
        <span class="plan-item-name">${item.name}</span>
        <div class="plan-item-bar-track"><div class="plan-item-bar" style="width:${pctOfBudget}%"></div></div>
      </div>
      <div class="plan-item-right">
        <div class="plan-item-amounts">
          <input type="number" class="plan-item-input" data-idx="${idx}" value="${item.amount||''}" placeholder="0.00" min="0" step="0.50" />
          <span class="plan-item-period-label">${period==='weekly'?'/ week':'/ month'}</span>
          ${period==='weekly'?`<span class="plan-item-monthly">${fmt(monthly)}/mo</span>`:''}
        </div>
        <button class="btn-icon btn-del-plan-item" data-idx="${idx}" title="Remove">✕</button>
      </div>`;
    list.appendChild(row);
  });

  // Bind inputs
  list.querySelectorAll('.plan-item-input').forEach(input => {
    input.addEventListener('change', e => {
      cat.plan.items[+e.target.dataset.idx].amount = +e.target.value||0;
      saveState();
      renderCategoryPlanner(cat, t);
    });
  });
  list.querySelectorAll('.btn-del-plan-item').forEach(btn => {
    btn.addEventListener('click', e => {
      cat.plan.items.splice(+e.currentTarget.dataset.idx, 1);
      saveState();
      renderCategoryPlanner(cat, t);
    });
  });
}

function addPlanItem(cat, t) {
  const name   = document.getElementById('plan-item-name')?.value.trim();
  const amount = parseFloat(document.getElementById('plan-item-amount')?.value||0);
  if (!name) { document.getElementById('plan-item-name')?.focus(); return; }
  if (!cat.plan) cat.plan = { period:'monthly', items:[] };
  cat.plan.items.push({ id: uid(), name, amount: amount||0 });
  saveState();
  document.getElementById('plan-item-name').value = '';
  document.getElementById('plan-item-amount').value = '';
  renderCategoryPlanner(cat, t);
}

// ─── Hard reset ───────────────────────────────────────────────────────────────
function hardReset() {
  if(!confirm('Reset all budget data to defaults? This cannot be undone.')) return;
  localStorage.removeItem('hl-budget');
  state = { budget: null, activeRule: '50-30-20', activeTab: 'budget' };
  getBudgetData();
  renderRuleBar();
  renderTabs();
  render();
}

async function init() {
  try {
    await loadState();
  } catch(e) {
    console.warn('State load failed, resetting:', e);
    state = { budget: null, activeRule: '50-30-20', activeTab: 'budget' };
  }
  // Safety checks — if state looks corrupt, reset it
  if(!state || typeof state !== 'object') state = { budget: null, activeRule: '50-30-20', activeTab: 'budget' };
  if(!state.activeRule || !RULES[state.activeRule]) state.activeRule = '50-30-20';
  if(!state.activeTab) state.activeTab = 'budget';
  // If budget data is malformed, wipe and rebuild cleanly
  if(state.budget && (!Array.isArray(state.budget.categories) || !state.budget.personal)) {
    console.warn('Corrupt budget data, rebuilding');
    state.budget = null;
  }
  getBudgetData();

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      state.activeTab=btn.dataset.tab;
      renderTabs();
      if(state.activeTab==='charts') requestAnimationFrame(()=>requestAnimationFrame(()=>renderCharts(calcTotals())));
      if(state.activeTab==='plans') renderPlansTab();
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

  document.getElementById('btn-plans-back').addEventListener('click',()=>{ state.plannerCatId=null; renderPlansTab(); });
  document.getElementById('btn-add-debt').addEventListener('click',addDebt);
  document.getElementById('debt-amount').addEventListener('keydown',e=>{ if(e.key==='Enter') addDebt(); });
  document.getElementById('btn-export-excel').addEventListener('click',exportExcel);
  document.getElementById('btn-export-pdf').addEventListener('click',exportPDF);
  document.getElementById('btn-reset').addEventListener('click',hardReset);

  try {
    render();
  } catch(e) {
    console.error('Render failed:', e);
    // Nuclear option: wipe state and retry once
    state = { budget: null, activeRule: '50-30-20', activeTab: 'budget' };
    await saveState();
    getBudgetData();
    render();
  }
}

document.addEventListener('DOMContentLoaded',init);
