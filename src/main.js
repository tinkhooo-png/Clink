import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import './styles.css';

import { Store, PALETTE } from './store.js';
import { icons, orb } from './icons.js';
import {
  comma, won, pad, todayStr, relLabel, dateLabel, weekLabel, digitsToInt, esc, MAX_AMOUNT, parseYmd,
} from './format.js';
import { inPeriod, previousPeriod, summarize, byCategory, trend, buildList, monthIndex, isIncome } from './stats.js';
import { syncWidget, importWidgetEntries, widgetSupported, WIDGET_SLOTS } from './widget-bridge.js';
import { saveTextFile, onBackButton, onResume } from './platform.js';

const VERSION = '1.0.0';
const store = new Store();
const now = new Date();

const ui = {
  tab: 'record',
  rec: { amount: 0, date: todayStr(), memo: '', hint: '', warn: false },
  st: { period: 'month', year: now.getFullYear(), month: now.getMonth() + 1, sort: 'date', dir: 'desc', group: 'day', filterCats: new Set(), limit: 60 },
  drawer: false,
  sheet: null,
  toast: null,
};
let toastTimer = null;

/* =================================================================
   공통 조각
================================================================= */
const mark = (c, size = 28) =>
  `<span class="cat-mark" style="background:${esc(c?.color ?? '#8b95a1')};width:${size}px;height:${size}px" aria-hidden="true">${esc((c?.name ?? '?').slice(0, 1))}</span>`;

const signed = (e, catMap) => (isIncome(catMap, e) ? `<span class="income-text">+${comma(e.amount)}원</span>` : won(e.amount));

function compact(n) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '')}억`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '')}만`;
  return comma(n);
}
const timeOf = (ms) => (ms ? new Date(ms).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }) : '');

function entryRow(e, catMap, { showDate = false } = {}) {
  const c = catMap.get(e.categoryId);
  const title = e.memo ? esc(e.memo) : esc(c?.name ?? '삭제된 카테고리');
  const subParts = [];
  if (e.memo) subParts.push(esc(c?.name ?? ''));
  subParts.push(showDate ? relLabel(e.date) : timeOf(e.createdAt));
  if (e.source === 'widget') subParts.push('위젯');
  return `<li><button class="row-btn" data-act="edit-entry" data-id="${e.id}">
    ${mark(c, 40)}
    <span class="row-main"><span class="row-title" style="display:block">${title}</span><span class="row-sub" style="display:block">${subParts.filter(Boolean).join(' · ')}</span></span>
    <span class="row-amount">${signed(e, catMap)}</span>
  </button></li>`;
}

/* =================================================================
   기록 화면
================================================================= */
function renderRecord() {
  const { rec } = ui;
  const catMap = store.catMap;
  const cats = store.sortedCategories.filter((c) => !c.hidden);
  const dayEntries = store.state.entries
    .filter((e) => e.date === rec.date)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const daySum = summarize(dayEntries, catMap);
  const offline = store.state.mode === 'cloud' && store.state.sync === 'offline';
  const isToday = rec.date === todayStr();

  return `<main class="screen" aria-labelledby="t-record">
    <header class="topbar">
      <h1 id="t-record">기록</h1>
      ${offline ? '<span class="sync busy"><i></i>오프라인 · 연결되면 올라가요</span>' : ''}
      <button class="date-chip" data-act="pick-date" aria-label="기록 날짜 바꾸기, 지금 ${dateLabel(rec.date)}">
        ${isToday ? '오늘' : relLabel(rec.date)}${icons.down}
      </button>
      <input type="date" id="rec-date" class="sr-only" tabindex="-1" value="${rec.date}" max="${todayStr()}" data-input="rec-date">
    </header>

    <label class="label" for="amount">얼마인가요?</label>
    <div class="amount-field" id="amount-field">
      <input id="amount" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done"
        placeholder="0" value="${rec.amount ? comma(rec.amount) : ''}" data-input="amount" aria-describedby="amount-hint">
      <span class="unit">원</span>
      <button class="icon-btn clear" data-act="clear-amount" aria-label="금액 지우기" ${rec.amount ? '' : 'hidden'}>${icons.clear}</button>
    </div>
    <div class="amount-rule"></div>
    <div class="amount-hint ${rec.warn ? 'warn' : ''}" id="amount-hint" aria-live="polite">${esc(rec.hint)}</div>

    <div class="quick-row" role="group" aria-label="금액 더하기">
      ${[10, 100, 1000, 10000].map((n) => `<button class="btn weak small" data-act="add-amount" data-n="${n}">+${comma(n)}원</button>`).join('')}
    </div>

    <input id="memo" class="memo-input" type="text" maxlength="40" placeholder="메모 (선택)" value="${esc(rec.memo)}" data-input="memo" aria-label="메모">

    <section class="section" aria-labelledby="t-cats">
      <div class="section-head">
        <h2 id="t-cats">카테고리를 누르면 기록돼요</h2>
        <button class="btn neutral small" data-act="go-tab" data-tab="my">편집</button>
      </div>
      ${cats.length ? `<div class="cat-grid" id="cat-grid">
        ${cats.map((c) => `<button class="cat-btn" data-act="save-cat" data-id="${c.id}">
          ${mark(c)}
          <span><span class="cat-name">${esc(c.name)}</span>${c.type === 'income' ? ' <span class="cat-type">수입</span>' : ''}</span>
        </button>`).join('')}
      </div>` : `<div class="card"><p class="hint" style="margin:0 0 12px">아직 카테고리가 없어요. 먼저 카테고리를 만들어 주세요.</p>
        <button class="btn primary medium" data-act="new-category">카테고리 만들기</button></div>`}
    </section>

    <section class="section" aria-labelledby="t-day">
      <div class="section-head">
        <h2 id="t-day">${isToday ? '오늘' : esc(relLabel(rec.date))} 기록</h2>
        <span class="aside num">${dayEntries.length ? `${dayEntries.length}건 · ${won(daySum.expense)}${daySum.income ? ` · +${comma(daySum.income)}원` : ''}` : ''}</span>
      </div>
      ${dayEntries.length
        ? `<ul class="list">${dayEntries.map((e) => entryRow(e, catMap)).join('')}</ul>`
        : `<div class="card today-card">${orb(40)}<div class="grow"><strong style="color:var(--foreground)">아직 기록이 없어요</strong><div class="hint">금액을 입력하고 카테고리를 눌러 보세요.</div></div></div>`}
    </section>
  </main>`;
}

function setAmount(n, { keepFocus = true } = {}) {
  ui.rec.amount = Math.max(0, Math.min(n, MAX_AMOUNT));
  ui.rec.hint = n > MAX_AMOUNT ? '입력할 수 있는 가장 큰 금액이에요.' : '';
  ui.rec.warn = false;
  const input = document.getElementById('amount');
  if (input) {
    input.value = ui.rec.amount ? comma(ui.rec.amount) : '';
    if (keepFocus && document.activeElement === input) input.setSelectionRange(input.value.length, input.value.length);
  }
  const clr = document.querySelector('[data-act="clear-amount"]');
  if (clr) clr.hidden = !ui.rec.amount;
  const hint = document.getElementById('amount-hint');
  if (hint) { hint.textContent = ui.rec.hint; hint.classList.remove('warn'); }
}

function saveWithCategory(catId) {
  const cat = store.catMap.get(catId);
  if (!cat) return;
  if (!ui.rec.amount) {
    ui.rec.hint = '금액을 먼저 입력해 주세요.';
    ui.rec.warn = true;
    const hint = document.getElementById('amount-hint');
    if (hint) { hint.textContent = ui.rec.hint; hint.classList.add('warn'); }
    const field = document.getElementById('amount-field');
    field?.classList.remove('shake'); void field?.offsetWidth; field?.classList.add('shake');
    document.getElementById('amount')?.focus();
    return;
  }
  const entry = store.addEntry({ amount: ui.rec.amount, categoryId: catId, date: ui.rec.date, memo: ui.rec.memo.trim() });
  const amt = ui.rec.amount;
  ui.rec.amount = 0; ui.rec.memo = ''; ui.rec.hint = ''; ui.rec.warn = false;
  showToast(`${cat.name} ${comma(amt)}원을 기록했어요`, { label: '되돌리기', fn: () => store.deleteEntry(entry.id) });
  render();
}

/* =================================================================
   통계 화면
================================================================= */
function periodTitle(p) {
  if (p.period === 'all') return '전체 기간';
  if (p.period === 'year') return `${p.year}년`;
  return p.year === now.getFullYear() ? `${p.month}월` : `${p.year}년 ${p.month}월`;
}

function averageLine(p, sum, entries) {
  const t = new Date();
  if (p.period === 'month') {
    const dim = new Date(p.year, p.month, 0).getDate();
    const cur = p.year === t.getFullYear() && p.month === t.getMonth() + 1;
    const days = cur ? t.getDate() : dim;
    return ['하루 평균', won(Math.round(sum / days))];
  }
  if (p.period === 'year') {
    const months = p.year === t.getFullYear() ? t.getMonth() + 1 : 12;
    return ['한 달 평균', won(Math.round(sum / months))];
  }
  if (!entries.length) return ['한 달 평균', won(0)];
  const first = entries.reduce((m, e) => (e.date < m ? e.date : m), entries[0].date);
  const fd = parseYmd(first);
  const months = (t.getFullYear() - fd.getFullYear()) * 12 + (t.getMonth() - fd.getMonth()) + 1;
  return ['한 달 평균', won(Math.round(sum / Math.max(1, months)))];
}

function renderStats() {
  const p = ui.st;
  const catMap = store.catMap;
  const all = store.state.entries;
  const entries = inPeriod(all, p);
  const sum = summarize(entries, catMap);
  const hasIncomeCats = store.state.categories.some((c) => c.type === 'income');

  // 이전 기간과 비교
  let compare = '';
  const prev = previousPeriod(p);
  if (prev) {
    const ps = summarize(inPeriod(all, prev), catMap);
    const word = p.period === 'month' ? '지난달' : '작년';
    if (ps.expense > 0) {
      const d = sum.expense - ps.expense;
      compare = d === 0 ? `${word}과 같아요` : `${word}보다 ${won(Math.abs(d))} ${d > 0 ? '더 썼어요' : '덜 썼어요'}`;
    }
  }
  const [avgLabel, avgValue] = averageLine(p, sum.expense, entries);
  const splits = [];
  if (hasIncomeCats || sum.income) {
    splits.push(['수입', `<span class="income-text">+${comma(sum.income)}원</span>`]);
    splits.push(['남은 돈', won(sum.income - sum.expense).replace(/^-/, '−')]);
  } else {
    splits.push(['기록', `${comma(sum.count)}건`]);
    splits.push([avgLabel, avgValue]);
  }

  // 추이
  const bars = trend(entries, p, catMap);
  const max = Math.max(0, ...bars.map((b) => b.sum));
  const t = new Date();
  const curKey = p.period === 'month'
    ? (p.year === t.getFullYear() && p.month === t.getMonth() + 1 ? t.getDate() : -1)
    : p.period === 'year' ? (p.year === t.getFullYear() ? t.getMonth() + 1 : -1) : t.getFullYear();
  const trendTitle = { month: '일별 지출', year: '월별 지출', all: '연도별 지출' }[p.period];
  const labelEvery = p.period === 'month' ? 5 : 1;
  const barsHtml = bars.length ? `<div class="trend" role="list">
    ${bars.map((b, i) => {
      const h = max ? Math.max(2, (b.sum / max) * 100) : 2;
      const showLabel = p.period !== 'month' || b.key === 1 || b.key % labelEvery === 0;
      const tip = b.sum === max && max > 0 ? `<span class="tip num">${compact(b.sum)}</span>` : '';
      const clickable = p.period !== 'month';
      const tag = clickable ? 'button' : 'div';
      const name = p.period === 'month' ? `${b.key}일` : p.period === 'year' ? `${b.key}월` : `${b.key}년`;
      return `<${tag} class="bar-col ${b.key === curKey ? 'on' : ''}" role="listitem" ${clickable ? `data-act="drill" data-key="${b.key}"` : ''} aria-label="${name} ${won(b.sum)}" style="position:relative">
        ${tip}<span class="b" style="height:calc(${h}% - 34px)"></span><span class="x">${showLabel ? b.label : ''}</span></${tag}>`;
    }).join('')}
  </div>` : '';

  // 카테고리별
  const catRows = byCategory(entries, store.sortedCategories, catMap);
  let lastType = null;
  const catHtml = catRows.map((r) => {
    let head = '';
    if (hasIncomeCats && r.cat.type !== lastType) {
      head = `<div class="label" style="margin-top:${lastType ? '16px' : '0'}">${r.cat.type === 'income' ? '수입' : '지출'}</div>`;
      lastType = r.cat.type;
    }
    return `${head}<div class="cat-stat">
      <div class="top"><span class="cat-dot" style="background:${esc(r.cat.color)}"></span>
        <span class="name">${esc(r.cat.name)} <span class="hint">${r.count}건</span></span>
        <span class="pct num">${r.pct.toFixed(r.pct < 10 ? 1 : 0)}%</span>
        <span class="sum">${r.cat.type === 'income' ? `<span class="income-text">+${comma(r.sum)}원</span>` : won(r.sum)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${r.pct}%;background:${esc(r.cat.color)}"></div></div>
    </div>`;
  }).join('');

  // 목록
  const groups = buildList(entries, p, catMap);
  const listCount = groups.reduce((n, g) => n + g.items.length, 0);
  const groupLabel = (g) => {
    if (p.group === 'day') return relLabel(g.key);
    if (p.group === 'week') return weekLabel(g.key);
    if (p.group === 'category') return catMap.get(g.key)?.name ?? '삭제된 카테고리';
    return '';
  };
  // 많을 때는 끊어서 보여 준다
  let budget = p.limit;
  const shown = groups.map((g) => { const items = g.items.slice(0, Math.max(0, budget)); budget -= items.length; return { ...g, shownItems: items }; })
    .filter((g) => g.shownItems.length);
  const more = listCount > p.limit
    ? `<button class="btn neutral medium block" style="margin-top:16px" data-act="more">더 보기 (${comma(listCount - p.limit)}건 남음)</button>` : '';
  const listHtml = !listCount
    ? `<p class="hint" style="padding:16px 0">조건에 맞는 기록이 없어요.</p>`
    : p.group === 'item'
      ? `<ul class="list">${shown[0].shownItems.map((e) => entryRow(e, catMap, { showDate: true })).join('')}</ul>`
      : shown.map((g) => `<div class="group">
          <div class="group-head"><span class="g-label">${esc(groupLabel(g))} · ${g.items.length}건</span>
          <span class="g-sum">${g.expense ? won(g.expense) : ''}${g.income ? `${g.expense ? ' · ' : ''}<span class="income-text">+${comma(g.income)}원</span>` : ''}</span></div>
          <ul class="list">${g.shownItems.map((e) => entryRow(e, catMap, { showDate: p.group !== 'day' })).join('')}</ul>
        </div>`).join('');

  const chip = (act, val, cur, label, icon = '') =>
    `<button class="chip" data-act="${act}" data-v="${val}" aria-pressed="${cur === val}">${icon}${label}</button>`;
  const dirLabels = p.sort === 'amount' ? ['큰 금액순', '작은 금액순'] : ['최신순', '오래된순'];
  const filterCats = store.sortedCategories.filter((c) => !c.hidden || entries.some((e) => e.categoryId === c.id));

  const empty = !entries.length;

  return `<main class="screen" aria-labelledby="t-stats">
    <header class="topbar">
      <button class="icon-btn" data-act="drawer" aria-label="연도·월 이동 메뉴 열기">${icons.menu}</button>
      <div class="period-nav">
        ${p.period !== 'all' ? `<button class="icon-btn" data-act="shift" data-d="-1" aria-label="이전 기간">${icons.left}</button>` : ''}
        <h1 class="title" id="t-stats">${periodTitle(p)}</h1>
        ${p.period !== 'all' ? `<button class="icon-btn" data-act="shift" data-d="1" aria-label="다음 기간">${icons.right}</button>` : ''}
      </div>
    </header>

    <div class="segment" role="group" aria-label="통계 기간">
      ${[['month', '월별'], ['year', '연별'], ['all', '전체']].map(([v, l]) => `<button data-act="period" data-v="${v}" aria-pressed="${p.period === v}">${l}</button>`).join('')}
    </div>

    <div class="card summary">
      <div class="label">${p.period === 'all' ? '전체' : periodTitle(p)} 지출</div>
      <div class="amount-xl num">${won(sum.expense)}</div>
      ${compare ? `<div class="compare">${compare}</div>` : ''}
      <div class="split">${splits.map(([k, v]) => `<div><div class="label">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
    </div>

    ${empty ? `<div class="empty">${orb(80)}<strong>이 기간에는 기록이 없어요</strong><p>기록 탭에서 금액을 남기면 여기에 모여요.</p></div>` : `
    <section class="section" aria-labelledby="t-trend">
      <div class="section-head"><h2 id="t-trend">${trendTitle}</h2>${p.period !== 'month' ? '<span class="aside">막대를 누르면 자세히 봐요</span>' : ''}</div>
      ${barsHtml}
    </section>

    <section class="section" aria-labelledby="t-bycat">
      <div class="section-head"><h2 id="t-bycat">카테고리별</h2></div>
      ${catHtml}
    </section>`}

    <section class="section" aria-labelledby="t-list">
      <div class="section-head"><h2 id="t-list">기록 목록</h2><span class="aside">${listCount}건</span></div>
      <div class="controls">
        <div class="control-row"><span class="label">정렬</span><div class="chips">
          ${chip('sort', 'date', p.sort, '날짜')}${chip('sort', 'amount', p.sort, '금액')}
          <span style="width:1px;background:var(--border);margin:6px 2px;flex:none"></span>
          ${chip('dir', 'desc', p.dir, dirLabels[0], icons.sortDesc)}${chip('dir', 'asc', p.dir, dirLabels[1], icons.sortAsc)}
        </div></div>
        <div class="control-row"><span class="label">보기</span><div class="chips">
          ${chip('group', 'item', p.group, '건별')}${chip('group', 'day', p.group, '날짜별')}${chip('group', 'week', p.group, '주별')}${chip('group', 'category', p.group, '카테고리별')}
        </div></div>
        <div class="control-row"><span class="label">카테고리</span><div class="chips">
          <button class="chip" data-act="fcat" data-v="" aria-pressed="${p.filterCats.size === 0}">전체</button>
          ${filterCats.map((c) => `<button class="chip" data-act="fcat" data-v="${c.id}" aria-pressed="${p.filterCats.has(c.id)}"><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}</button>`).join('')}
        </div></div>
      </div>
      ${listHtml}${more}
    </section>
  </main>`;
}

function renderDrawer() {
  const catMap = store.catMap;
  const idx = monthIndex(store.state.entries, catMap);
  const years = new Set([now.getFullYear(), ...idx.keys()]);
  const p = ui.st;
  const yearSum = (y) => [...(idx.get(y)?.values() ?? [])].reduce((a, b) => a + b, 0);
  return `<div class="scrim" data-act="close-overlay"></div>
  <nav class="drawer" aria-label="연도·월 이동">
    <div class="topbar" style="margin-bottom:8px"><h2>기간 이동</h2>
      <button class="icon-btn" data-act="close-overlay" aria-label="닫기">${icons.close}</button></div>
    <button class="menu-row" data-act="jump" data-y="" data-m="" aria-current="${p.period === 'all'}"><span>전체 기간</span>${icons.right}</button>
    ${[...years].sort((a, b) => b - a).map((y) => `<div class="year-block">
      <button class="year-head" data-act="jump" data-y="${y}" data-m=""><span>${y}년</span><span class="hint num">${won(yearSum(y))} ${''}</span></button>
      <div class="month-grid">
        ${Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const s = idx.get(y)?.get(m);
          const cur = p.period === 'month' && p.year === y && p.month === m;
          return `<button data-act="jump" data-y="${y}" data-m="${m}" class="${s === undefined ? 'none' : ''}" aria-current="${cur}" aria-label="${y}년 ${m}월${s ? ` ${won(s)}` : ''}">
            ${m}월${s !== undefined ? `<small class="num">${compact(s)}</small>` : ''}</button>`;
        }).join('')}
      </div></div>`).join('')}
  </nav>`;
}

/* =================================================================
   마이 화면
================================================================= */
function renderMy() {
  const s = store.state;
  const cats = store.sortedCategories;
  const syncText = { synced: ['ok', '실시간 동기화 중'], pending: ['busy', '올리는 중'], offline: ['', '오프라인 · 연결되면 올라가요'], local: ['', '이 기기에만 저장 중'] }[s.sync];
  let account;
  if (s.mode === 'cloud' && s.user) {
    account = `<div class="card account">${orb(40)}<div class="who"><strong>${esc(s.user.email)}</strong>
      <span class="sync ${syncText[0]}"><i></i>${syncText[1]}</span></div>
      <button class="btn neutral small" data-act="signout">로그아웃</button></div>`;
  } else if (s.cloudAvailable) {
    account = `<div class="card account">${orb(40)}<div class="who"><strong>로그인하고 함께 쓰기</strong>
      <span class="hint">PC와 휴대폰에서 같은 기록을 바로 봐요</span></div>
      <button class="btn primary small" data-act="open-auth">로그인</button></div>`;
  } else {
    account = `<div class="card account">${orb(40)}<div class="who"><strong>이 기기에만 저장 중</strong>
      <span class="hint">계정 연결(Firebase)을 설정하면 기기 간 실시간 동기화가 켜져요. README의 3단계를 따라 주세요.</span></div></div>`;
  }

  return `<main class="screen" aria-labelledby="t-my">
    <header class="topbar"><h1 id="t-my">마이</h1></header>
    ${account}

    <section class="section" aria-labelledby="t-mcats">
      <div class="section-head"><h2 id="t-mcats">카테고리</h2><span class="aside">기록 화면에 이 순서로 보여요</span></div>
      <div class="card" style="padding:4px 16px">
        ${cats.length ? cats.map((c, i) => `<div class="manage-row ${c.hidden ? 'hidden-cat' : ''}">
          ${mark(c)}
          <span class="name">${esc(c.name)}<small>${c.type === 'income' ? '수입' : '지출'}${c.hidden ? ' · 숨김' : ''}${widgetSupported && !c.hidden && cats.filter((x) => !x.hidden).indexOf(c) < WIDGET_SLOTS ? ' · 위젯' : ''}</small></span>
          <button class="mini-btn" data-act="cat-move" data-id="${c.id}" data-d="-1" aria-label="${esc(c.name)} 위로" ${i === 0 ? 'disabled' : ''}>${icons.up}</button>
          <button class="mini-btn" data-act="cat-move" data-id="${c.id}" data-d="1" aria-label="${esc(c.name)} 아래로" ${i === cats.length - 1 ? 'disabled' : ''}>${icons.down}</button>
          <button class="mini-btn" data-act="edit-category" data-id="${c.id}" aria-label="${esc(c.name)} 편집">${icons.edit}</button>
        </div>`).join('') : '<p class="hint">카테고리가 없어요.</p>'}
      </div>
      <button class="btn weak large block" style="margin-top:12px" data-act="new-category">${icons.plus.replace('<svg', '<svg width="20" height="20"')}카테고리 추가하기</button>
    </section>

    <section class="section" aria-labelledby="t-widget">
      <div class="section-head"><h2 id="t-widget">홈 화면 위젯</h2></div>
      <div class="card">
        <p style="margin:0;color:var(--foreground);font-weight:600">빠른 기록 · 이번 달 요약</p>
        <p class="hint" style="margin:6px 0 0">${widgetSupported
          ? `홈 화면을 길게 누르고 위젯에서 ‘심플 가계부’를 고르세요. 숨기지 않은 카테고리 중 위에서부터 ${WIDGET_SLOTS}개가 빠른 기록 위젯에 나와요.`
          : '안드로이드 앱에서 쓸 수 있어요. 여기서 기록해도 위젯 금액에 바로 반영돼요.'}</p>
      </div>
    </section>

    <section class="section" aria-labelledby="t-data">
      <div class="section-head"><h2 id="t-data">데이터</h2></div>
      <button class="menu-row" data-act="export">${icons.download.replace('<svg', '<svg style="color:var(--grey600)"')}<span>기록 내보내기 (CSV)</span>${icons.right}</button>
    </section>
    <p class="hint" style="margin-top:24px">심플 가계부 ${VERSION}</p>
  </main>`;
}

/* =================================================================
   시트
================================================================= */
function renderSheet() {
  const sh = ui.sheet;
  if (!sh) return '';
  let body = '';
  if (sh.type === 'entry') {
    const cats = store.sortedCategories.filter((c) => !c.hidden || c.id === sh.categoryId);
    body = `<h3 id="sheet-title">기록 고치기</h3>
      <div class="field"><label class="label" for="sh-amount">금액</label>
        <div class="amount-field" style="margin:0"><input id="sh-amount" type="text" inputmode="numeric" value="${sh.amount ? comma(sh.amount) : ''}" data-input="sh-amount" placeholder="0"><span class="unit">원</span></div>
        <div class="amount-rule"></div></div>
      <div class="field"><span class="label">카테고리</span><div class="chips" style="flex-wrap:wrap">
        ${cats.map((c) => `<button class="chip" data-act="sh-cat" data-v="${c.id}" aria-pressed="${sh.categoryId === c.id}"><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}</button>`).join('')}
      </div></div>
      <div class="field"><label class="label" for="sh-date">날짜</label><input id="sh-date" class="text-input" type="date" value="${sh.date}" data-input="sh-date"></div>
      <div class="field"><label class="label" for="sh-memo">메모</label><input id="sh-memo" class="text-input" type="text" maxlength="40" value="${esc(sh.memo)}" placeholder="메모 (선택)" data-input="sh-memo"></div>
      <div class="field-error" aria-live="polite">${esc(sh.error ?? '')}</div>
      <div class="sheet-actions">
        <button class="btn ${sh.confirmDelete ? 'weak' : 'neutral'}" data-act="sh-delete" style="${sh.confirmDelete ? 'color:var(--danger)' : ''}">${sh.confirmDelete ? '한 번 더 누르면 삭제돼요' : '삭제하기'}</button>
        <button class="btn primary" data-act="sh-save-entry">저장하기</button>
      </div>`;
  } else if (sh.type === 'category') {
    const used = sh.id && store.state.entries.some((e) => e.categoryId === sh.id);
    body = `<h3 id="sheet-title">${sh.id ? '카테고리 고치기' : '새 카테고리'}</h3>
      <div class="field"><label class="label" for="sh-name">이름</label>
        <input id="sh-name" class="text-input" type="text" maxlength="12" value="${esc(sh.name)}" placeholder="예: 주유비" data-input="sh-name"></div>
      <div class="field"><span class="label">종류</span><div class="segment">
        <button data-act="sh-type" data-v="expense" aria-pressed="${sh.ctype === 'expense'}">지출</button>
        <button data-act="sh-type" data-v="income" aria-pressed="${sh.ctype === 'income'}">수입</button></div></div>
      <div class="field"><span class="label">색</span><div class="swatches" role="group" aria-label="색 고르기">
        ${PALETTE.map((col) => `<button class="swatch" style="background:${col}" data-act="sh-color" data-v="${col}" aria-pressed="${sh.color === col}" aria-label="색 ${col}"></button>`).join('')}
      </div></div>
      <div class="field-error" aria-live="polite">${esc(sh.error ?? '')}</div>
      <div class="sheet-actions">
        ${sh.id ? (used
          ? `<button class="btn neutral" data-act="sh-hide">${sh.hidden ? '다시 보이기' : '숨기기'}</button>`
          : `<button class="btn ${sh.confirmDelete ? 'weak' : 'neutral'}" data-act="sh-cat-delete" style="${sh.confirmDelete ? 'color:var(--danger)' : ''}">${sh.confirmDelete ? '한 번 더 누르면 삭제돼요' : '삭제하기'}</button>`) : ''}
        <button class="btn primary" data-act="sh-save-category">${sh.id ? '저장하기' : '추가하기'}</button>
      </div>
      ${sh.id && used ? '<p class="hint" style="margin-top:12px">기록이 있는 카테고리는 지우는 대신 숨겨요. 숨겨도 통계에는 남아요.</p>' : ''}`;
  } else if (sh.type === 'auth') {
    const signup = sh.mode === 'signup';
    const hasLocal = store.state.mode === 'local' && store.state.entries.length > 0;
    body = `<h3 id="sheet-title">${signup ? '가입하고 동기화 켜기' : '로그인'}</h3>
      <div class="segment"><button data-act="auth-mode" data-v="signin" aria-pressed="${!signup}">로그인</button>
        <button data-act="auth-mode" data-v="signup" aria-pressed="${signup}">가입하기</button></div>
      <div class="field"><label class="label" for="sh-email">이메일</label>
        <input id="sh-email" class="text-input" type="email" autocomplete="email" value="${esc(sh.email)}" data-input="sh-email" placeholder="name@example.com"></div>
      <div class="field"><label class="label" for="sh-pw">비밀번호${signup ? ' (6자 이상)' : ''}</label>
        <input id="sh-pw" class="text-input" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" value="${esc(sh.pw)}" data-input="sh-pw" enterkeyhint="go"></div>
      <div class="field-error" aria-live="polite">${esc(sh.error ?? '')}</div>
      ${hasLocal ? `<p class="hint">이 기기에 있는 기록 ${store.state.entries.length}건은 로그인하면 계정으로 옮겨져요.</p>` : ''}
      ${sh.info ? `<p class="hint" style="color:var(--foreground)">${esc(sh.info)}</p>` : ''}
      <div class="sheet-actions" style="flex-direction:column">
        <button class="btn primary block" data-act="auth-submit" ${sh.busy ? 'aria-disabled="true"' : ''}>${sh.busy ? '확인하는 중…' : signup ? '가입하기' : '로그인하기'}</button>
        ${signup ? '' : '<button class="btn neutral medium" data-act="auth-reset">비밀번호를 잊었어요</button>'}
      </div>`;
  }
  return `<div class="scrim" data-act="close-overlay"></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div class="grabber"></div>${body}</section>`;
}

function renderToast() {
  if (!ui.toast) return '';
  return `<div class="toast-wrap" aria-live="polite"><div class="toast" role="status"><span>${esc(ui.toast.text)}</span>
    ${ui.toast.action ? `<button data-act="toast-action">${esc(ui.toast.action.label)}</button>` : ''}</div></div>`;
}

function showToast(text, action = null) {
  ui.toast = { text, action };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast = null; render(); }, 4000);
}

/* =================================================================
   렌더링
================================================================= */
const TABS = [
  ['record', '기록', icons.tabRecord],
  ['stats', '통계', icons.tabStats],
  ['my', '마이', icons.tabMy],
];

function render() {
  const app = document.getElementById('app');
  // 입력 중인 칸의 포커스·커서 유지
  const active = document.activeElement;
  const focusId = active?.id;
  const sel = active && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
  const scrollY = window.scrollY;

  const screen = ui.tab === 'record' ? renderRecord() : ui.tab === 'stats' ? renderStats() : renderMy();
  app.innerHTML = `${screen}
    <nav class="tabbar" aria-label="주 메뉴"><div class="tabbar-inner">
      ${TABS.map(([id, label, icon]) => `<button class="tab" data-act="go-tab" data-tab="${id}" aria-label="${label}" ${ui.tab === id ? 'aria-current="page"' : ''}>${icon}</button>`).join('')}
    </div></nav>
    ${ui.drawer ? renderDrawer() : ''}
    ${renderSheet()}
    ${renderToast()}`;

  window.scrollTo(0, scrollY);
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) {
      el.focus({ preventScroll: true });
      if (sel && el.setSelectionRange && el.type !== 'email' && el.type !== 'date') {
        try { el.setSelectionRange(sel[0], sel[1]); } catch { /* 지원 안 함 */ }
      }
    }
  }
}

function closeOverlay() {
  if (ui.sheet) { ui.sheet = null; render(); return true; }
  if (ui.drawer) { ui.drawer = false; render(); return true; }
  return false;
}

function goTab(tab) {
  if (ui.tab === tab) return;
  ui.tab = tab;
  ui.drawer = false; ui.sheet = null;
  render();
  window.scrollTo(0, 0);
}

/* =================================================================
   이벤트
================================================================= */
const actions = {
  'go-tab': (el) => goTab(el.dataset.tab),
  'pick-date': () => {
    const input = document.getElementById('rec-date');
    try { input.showPicker(); } catch { input.focus(); input.click(); }
  },
  'clear-amount': () => { setAmount(0); document.getElementById('amount')?.focus(); },
  'add-amount': (el) => setAmount(ui.rec.amount + Number(el.dataset.n)),
  'save-cat': (el) => saveWithCategory(el.dataset.id),
  'edit-entry': (el) => {
    const e = store.state.entries.find((x) => x.id === el.dataset.id);
    if (!e) return;
    ui.sheet = { type: 'entry', id: e.id, amount: e.amount, categoryId: e.categoryId, date: e.date, memo: e.memo ?? '' };
    render();
  },
  'new-category': () => { ui.sheet = { type: 'category', id: null, name: '', ctype: 'expense', color: PALETTE[store.state.categories.length % PALETTE.length] }; render(); setTimeout(() => document.getElementById('sh-name')?.focus(), 50); },
  'edit-category': (el) => {
    const c = store.catMap.get(el.dataset.id);
    if (!c) return;
    ui.sheet = { type: 'category', id: c.id, name: c.name, ctype: c.type, color: c.color, hidden: c.hidden };
    render();
  },
  'cat-move': (el) => store.moveCategory(el.dataset.id, Number(el.dataset.d)),

  // 통계
  drawer: () => { ui.drawer = true; render(); },
  'close-overlay': () => closeOverlay(),
  period: (el) => { ui.st.limit = 60; ui.st.period = el.dataset.v; render(); },
  shift: (el) => {
    const d = Number(el.dataset.d);
    const p = ui.st;
    if (p.period === 'year') p.year += d;
    else { let m = p.month + d, y = p.year; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } p.month = m; p.year = y; }
    render();
  },
  drill: (el) => {
    const k = Number(el.dataset.key);
    if (ui.st.period === 'year') { ui.st.period = 'month'; ui.st.month = k; }
    else if (ui.st.period === 'all') { ui.st.period = 'year'; ui.st.year = k; }
    render(); window.scrollTo(0, 0);
  },
  jump: (el) => {
    const { y, m } = el.dataset;
    if (!y) ui.st.period = 'all';
    else if (!m) { ui.st.period = 'year'; ui.st.year = Number(y); }
    else { ui.st.period = 'month'; ui.st.year = Number(y); ui.st.month = Number(m); }
    ui.drawer = false; render(); window.scrollTo(0, 0);
  },
  sort: (el) => { ui.st.limit = 60; ui.st.sort = el.dataset.v; render(); },
  dir: (el) => { ui.st.limit = 60; ui.st.dir = el.dataset.v; render(); },
  group: (el) => { ui.st.limit = 60; ui.st.group = el.dataset.v; render(); },
  more: () => { ui.st.limit += 100; render(); },
  fcat: (el) => {
    ui.st.limit = 60;
    const v = el.dataset.v, f = ui.st.filterCats;
    if (!v) f.clear(); else if (f.has(v)) f.delete(v); else f.add(v);
    render();
  },

  // 기록 시트
  'sh-cat': (el) => { ui.sheet.categoryId = el.dataset.v; render(); },
  'sh-save-entry': () => {
    const sh = ui.sheet;
    if (!sh.amount) { sh.error = '금액을 입력해 주세요.'; render(); return; }
    store.updateEntry(sh.id, { amount: sh.amount, categoryId: sh.categoryId, date: sh.date || todayStr(), memo: sh.memo.trim() });
    ui.sheet = null; showToast('기록을 고쳤어요'); render();
  },
  'sh-delete': () => {
    const sh = ui.sheet;
    if (!sh.confirmDelete) { sh.confirmDelete = true; render(); return; }
    const old = store.state.entries.find((e) => e.id === sh.id);
    store.deleteEntry(sh.id);
    ui.sheet = null;
    showToast('기록을 삭제했어요', old ? { label: '되돌리기', fn: () => store.addEntry(old) } : null);
    render();
  },

  // 카테고리 시트
  'sh-type': (el) => { ui.sheet.ctype = el.dataset.v; render(); },
  'sh-color': (el) => { ui.sheet.color = el.dataset.v; render(); },
  'sh-save-category': () => {
    const sh = ui.sheet;
    const name = sh.name.trim();
    if (!name) { sh.error = '이름을 입력해 주세요.'; render(); return; }
    if (store.state.categories.some((c) => c.name === name && c.id !== sh.id)) { sh.error = '같은 이름의 카테고리가 있어요.'; render(); return; }
    if (sh.id) store.updateCategory(sh.id, { name, type: sh.ctype, color: sh.color });
    else store.addCategory({ name, type: sh.ctype, color: sh.color });
    ui.sheet = null; showToast(sh.id ? '카테고리를 고쳤어요' : `‘${name}’ 카테고리를 만들었어요`); render();
  },
  'sh-hide': () => {
    const sh = ui.sheet;
    store.updateCategory(sh.id, { hidden: !sh.hidden });
    ui.sheet = null; showToast(sh.hidden ? '다시 보이게 했어요' : '숨겼어요. 통계에는 남아 있어요'); render();
  },
  'sh-cat-delete': () => {
    const sh = ui.sheet;
    if (!sh.confirmDelete) { sh.confirmDelete = true; render(); return; }
    store.deleteCategory(sh.id);
    ui.sheet = null; showToast('카테고리를 삭제했어요'); render();
  },

  // 계정
  'open-auth': () => { ui.sheet = { type: 'auth', mode: 'signin', email: '', pw: '', error: '' }; render(); setTimeout(() => document.getElementById('sh-email')?.focus(), 50); },
  'auth-mode': (el) => { ui.sheet.mode = el.dataset.v; ui.sheet.error = ''; ui.sheet.info = ''; render(); },
  'auth-submit': async () => {
    const sh = ui.sheet;
    if (sh.busy) return;
    sh.busy = true; sh.error = ''; render();
    try {
      if (sh.mode === 'signup') await store.signUp(sh.email.trim(), sh.pw);
      else await store.signIn(sh.email.trim(), sh.pw);
      ui.sheet = null;
      showToast(sh.mode === 'signup' ? '가입했어요. 이제 모든 기기에서 같은 기록을 봐요' : '로그인했어요. 기록을 맞추고 있어요');
    } catch (err) {
      sh.busy = false; sh.error = authMessage(err);
    }
    render();
  },
  'auth-reset': async () => {
    const sh = ui.sheet;
    if (!sh.email.trim()) { sh.error = '이메일을 먼저 입력해 주세요.'; render(); return; }
    try { await store.resetPassword(sh.email.trim()); sh.error = ''; sh.info = '비밀번호를 바꾸는 메일을 보냈어요. 메일함을 확인해 주세요.'; }
    catch (err) { sh.error = authMessage(err); }
    render();
  },
  signout: async () => { await store.signOut(); showToast('로그아웃했어요. 이 기기에서만 기록돼요'); render(); },

  export: () => exportCsv(),
  'toast-action': () => { const a = ui.toast?.action; ui.toast = null; a?.fn(); render(); },
};

function authMessage(err) {
  const map = {
    'auth/invalid-email': '이메일 형식을 확인해 주세요.',
    'auth/missing-password': '비밀번호를 입력해 주세요.',
    'auth/missing-email': '이메일을 입력해 주세요.',
    'auth/weak-password': '비밀번호는 6자 이상으로 정해 주세요.',
    'auth/email-already-in-use': '이미 가입한 이메일이에요. 로그인해 주세요.',
    'auth/invalid-credential': '이메일이나 비밀번호가 맞지 않아요.',
    'auth/wrong-password': '이메일이나 비밀번호가 맞지 않아요.',
    'auth/user-not-found': '가입하지 않은 이메일이에요.',
    'auth/too-many-requests': '시도가 많았어요. 잠시 뒤에 다시 해 주세요.',
    'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
  };
  return map[err?.code] ?? '잠시 문제가 생겼어요. 다시 시도해 주세요.';
}

function exportCsv() {
  if (import.meta.env.MODE === 'preview') { showToast('미리보기에서는 내보내기를 쓸 수 없어요. 앱에서 써 주세요'); render(); return; }
  const catMap = store.catMap;
  const rows = [['날짜', '카테고리', '종류', '금액', '메모']];
  store.state.entries.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => {
    const c = catMap.get(e.categoryId);
    rows.push([e.date, c?.name ?? '', c?.type === 'income' ? '수입' : '지출', e.amount, e.memo ?? '']);
  });
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  saveTextFile(`가계부_${todayStr()}.csv`, csv)
    .then(() => showToast(`${rows.length - 1}건을 내보냈어요`))
    .catch(() => showToast('내보내지 못했어요. 다시 시도해 주세요'))
    .finally(render);
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.getAttribute('aria-disabled') === 'true') return;
  const fn = actions[el.dataset.act];
  if (fn) { ev.preventDefault(); fn(el); }
});

document.addEventListener('input', (ev) => {
  const el = ev.target;
  const key = el.dataset?.input;
  if (!key) return;
  switch (key) {
    case 'amount': setAmount(digitsToInt(el.value)); break;
    case 'memo': ui.rec.memo = el.value; break;
    case 'rec-date': if (el.value) { ui.rec.date = el.value; render(); } break;
    case 'sh-amount': {
      ui.sheet.amount = digitsToInt(el.value);
      el.value = ui.sheet.amount ? comma(ui.sheet.amount) : '';
      break;
    }
    case 'sh-date': ui.sheet.date = el.value; break;
    case 'sh-memo': ui.sheet.memo = el.value; break;
    case 'sh-name': ui.sheet.name = el.value; break;
    case 'sh-email': ui.sheet.email = el.value; break;
    case 'sh-pw': ui.sheet.pw = el.value; break;
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && closeOverlay()) { ev.preventDefault(); return; }
  if (ev.key === 'Enter' && ev.target.id === 'sh-pw') { ev.preventDefault(); actions['auth-submit'](); }
  if (ev.key === 'Enter' && ev.target.id === 'sh-name') { ev.preventDefault(); actions['sh-save-category'](); }
  // PC: 금액 칸에서 숫자 1~9 대신 Alt+숫자로 카테고리 바로 저장
  if (ev.altKey && /^[1-9]$/.test(ev.key) && ui.tab === 'record') {
    const c = store.sortedCategories.filter((x) => !x.hidden)[Number(ev.key) - 1];
    if (c) { ev.preventDefault(); saveWithCategory(c.id); }
  }
});

/* =================================================================
   시작
================================================================= */
let authSeen = store.state.authReady;
store.subscribe(() => {
  render(); syncWidget(store);
  if (!authSeen && store.state.authReady) { authSeen = true; pullWidget(); }
});
render();
store.initCloud().then(() => syncWidget(store));
syncWidget(store);

const pullWidget = async () => {
  if (!store.state.authReady) return; // 로그인 상태를 확인한 뒤에 가져온다
  const n = await importWidgetEntries(store);
  if (n) { showToast(`위젯에서 남긴 기록 ${n}건을 가져왔어요`); render(); }
  // 날짜가 바뀌었으면 기록 날짜를 오늘로
  if (ui.rec.date < todayStr() && !ui.rec.amount) { ui.rec.date = todayStr(); render(); }
};
pullWidget();
onResume(pullWidget);
onBackButton(() => {
  if (closeOverlay()) return true;
  if (ui.tab !== 'record') { goTab('record'); return true; }
  return false;
});
