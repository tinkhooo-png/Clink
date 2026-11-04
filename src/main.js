import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import './styles.css';

import { Store, PALETTE } from './store.js';
import { icons } from './icons.js';
import { glassIcon, guessIcon, CATEGORY_ICONS, GLASS_DEFS, HERO, ICONS } from './glass.js';
const ICON_LABEL = (k) => ICONS[k]?.label ?? k;
import { anim, EASE, countUp, flyCoin, shake, pop, reduced, HERO_PLAY } from './motion.js';
import { logoSvg } from './logo.js';
import {
  comma, won, pad, todayStr, relLabel, dateLabel, weekLabel, weekStart, digitsToInt, esc, MAX_AMOUNT, parseYmd, addDays, uid,
} from './format.js';
import { initGestures } from './gestures.js';
import { inPeriod, previousPeriod, summarize, byCategory, trend, buildList, monthIndex, isIncome } from './stats.js';
import { syncWidget, importWidgetEntries, widgetSupported, WIDGET_SLOTS } from './widget-bridge.js';
import { saveTextFile, onBackButton, onResume, platform } from './platform.js';

const VERSION = '1.1.0';
const store = new Store();
const now = new Date();

const mqWide = matchMedia('(min-width: 768px)');   // 레일 + 넓은 화면
const mqXWide = matchMedia('(min-width: 1280px)'); // 2단 PC 배치

const ui = {
  tab: 'record',
  rec: { amount: 0, date: todayStr(), memo: '', hint: '', warn: false },
  st: { period: 'month', date: todayStr(), year: now.getFullYear(), month: now.getMonth() + 1, sort: 'date', dir: 'desc', group: 'day', filterCats: new Set(), limit: 60, anim: false },
  cal: { view: 'month', date: todayStr(), mode: 'item', filterCats: new Set() },
  recOpen: false,
  drawer: false,
  sheet: null,
  justAdded: null,
};
const wide = () => mqWide.matches;
const xwide = () => mqXWide.matches;

// 공용 그라데이션과 팝업·토스트 층은 화면 다시 그리기와 따로 둔다
document.body.insertAdjacentHTML('afterbegin', GLASS_DEFS);
const layer = document.createElement('div');
layer.id = 'layer';
document.body.appendChild(layer);

/* =================================================================
   공통 조각
================================================================= */
const catIcon = (c) => c?.icon || guessIcon(c?.name, c?.type);
const mark = (c, size = 28) => `<span class="cat-mark" style="width:${size}px;height:${size}px">${glassIcon(catIcon(c), size, '', c?.color)}</span>`;

const signed = (e, catMap) => (isIncome(catMap, e) ? `<span class="income-text">+${comma(e.amount)}원</span>` : won(e.amount));

function compact(n) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '')}억`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '')}만`;
  return comma(n);
}
const timeOf = (ms) => (ms ? new Date(ms).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }) : '');
const WD = '일월화수목금토';
const shortDay = (s) => { const d = parseYmd(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };

function entryRow(e, catMap, { showDate = false } = {}) {
  const c = catMap.get(e.categoryId);
  const title = esc(c?.name ?? '삭제된 카테고리');
  const subParts = [];
  if (e.memo) subParts.push(esc(e.memo));
  subParts.push(showDate ? relLabel(e.date) : timeOf(e.createdAt));
  if (e.source === 'widget') subParts.push('위젯');
  return `<li class="${e.id === ui.justAdded ? 'is-new' : ''}"><button class="row-btn" data-act="edit-entry" data-id="${e.id}">
    ${mark(c, 40)}
    <span class="row-main"><span class="row-title" style="display:block">${title}</span><span class="row-sub" style="display:block">${subParts.filter(Boolean).join(' · ')}</span></span>
    <span class="row-amount">${signed(e, catMap)}</span>
  </button></li>`;
}

/** PC 표 한 줄: 시간(또는 날짜) · 카테고리 · 메모 · 금액 */
function tableRow(e, catMap, first) {
  const c = catMap.get(e.categoryId);
  return `<button class="trow ${e.id === ui.justAdded ? 'is-new' : ''}" data-act="edit-entry" data-id="${e.id}">
    <span class="t-when">${first === 'time' ? (timeOf(e.createdAt) || '—') : shortDay(e.date)}${e.source === 'widget' ? ' · 위젯' : ''}</span>
    <span class="t-cat">${mark(c, 24)}<b>${esc(c?.name ?? '삭제된 카테고리')}</b></span>
    <span class="t-memo">${esc(e.memo || '')}</span>
    <span class="t-amt">${signed(e, catMap)}</span>
  </button>`;
}
const tableHead = (first) => `<div class="thead"><span>${first === 'time' ? '시간' : '날짜'}</span><span>카테고리</span><span>메모</span><span>금액</span></div>`;

/* =================================================================
   기록 화면
================================================================= */
const hintHtml = () => (ui.rec.hint ? `${ui.rec.warn ? glassIcon('alert', 18) : ''}<span>${esc(ui.rec.hint)}</span>` : '');
const shortWon = (n) => (n >= 1e6 ? compact(n) : comma(n));

function recordTopbar(pc) {
  const { rec } = ui;
  const offline = store.state.mode === 'cloud' && store.state.sync === 'offline';
  const isToday = rec.date === todayStr();
  const dateText = pc
    ? `${isToday ? '오늘 · ' : ''}${dateLabel(rec.date, rec.date.slice(0, 4) !== todayStr().slice(0, 4))}`
    : (isToday ? '오늘' : relLabel(rec.date));
  return `<header class="topbar">
      <h1 id="t-record">기록</h1>
      ${offline ? '<span class="sync busy"><i></i>오프라인 · 연결되면 올라가요</span>' : ''}
      <button class="date-chip" data-act="pick-date" aria-label="기록 날짜 ${dateLabel(rec.date)}. 누르면 날짜를 고르고${pc ? '' : ', 화면을 위아래로 밀면 하루씩 바뀌어요'}">
        <span class="date-text">${dateText}</span>${pc ? icons.down : icons.updown}
      </button>
      <input type="date" id="rec-date" class="sr-only" tabindex="-1" value="${rec.date}" max="${todayStr()}" data-input="rec-date">
    </header>`;
}

function categoriesHtml(pc) {
  const cats = store.sortedCategories.filter((c) => !c.hidden);
  return `<section class="cat-sec" aria-labelledby="t-cats">
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
      ${pc ? '<p class="hint" style="margin-top:12px">키보드: 숫자로 금액 입력, Alt+1·2·3…으로 카테고리 바로 저장</p>' : ''}
    </section>`;
}

function amountHtml() {
  const { rec } = ui;
  return `<section class="entry-area" aria-label="금액 입력">
    <label class="label" for="amount">얼마인가요?</label>
    <div class="amount-field" id="amount-field">
      <input id="amount" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done"
        placeholder="0" value="${rec.amount ? comma(rec.amount) : ''}" data-input="amount" aria-describedby="amount-hint">
      <span class="unit">원</span>
      <button class="icon-btn clear" data-act="clear-amount" aria-label="금액 지우기" ${rec.amount ? '' : 'hidden'}>${icons.clear}</button>
    </div>
    <div class="amount-rule"></div>
    <div class="amount-hint ${rec.warn ? 'warn' : ''}" id="amount-hint" aria-live="polite">${hintHtml()}</div>
    <div class="quick-row" role="group" aria-label="금액 더하기">
      ${[10, 100, 1000, 10000].map((n) => `<button class="btn weak small" data-act="add-amount" data-n="${n}">+${comma(n)}원</button>`).join('')}
    </div>
    <input id="memo" class="memo-input" type="text" maxlength="40" placeholder="메모 (선택)" value="${esc(rec.memo)}" data-input="memo" aria-label="메모" enterkeyhint="done">
  </section>`;
}

function dayEntriesOf(date) {
  return store.state.entries.filter((e) => e.date === date).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}
const emptyDay = (small = false) => `<div class="card today-card ${small ? 'small' : ''}">${glassIcon('receipt', small ? 32 : 40, 'float')}<div class="grow"><strong style="color:var(--foreground)">아직 기록이 없어요</strong><div class="hint">${small ? '아래에서 금액을 넣고 카테고리를 눌러 보세요.' : '금액을 입력하고 카테고리를 눌러 보세요.'}</div></div></div>`;

/** 오늘 기록: 5열 작은 카드. 1줄 반만 보이고 펼치면 전부 */
function miniCards(dayEntries, catMap) {
  const many = dayEntries.length > 5;
  return `<div class="mini-wrap ${ui.recOpen ? 'open' : ''} ${many ? 'many' : ''}"><div class="mini-grid" id="mini-grid">
    ${dayEntries.map((e) => {
      const c = catMap.get(e.categoryId);
      const inc = isIncome(catMap, e);
      return `<button class="mini ${e.id === ui.justAdded ? 'is-new' : ''}" data-act="edit-entry" data-id="${e.id}" title="${esc(c?.name ?? '')}${e.memo ? ` · ${esc(e.memo)}` : ''} ${won(e.amount)}">
        ${mark(c, 24)}<span class="m-amt ${inc ? 'income-text' : ''}">${inc ? '+' : ''}${shortWon(e.amount)}</span><span class="m-name">${esc(c?.name ?? '삭제됨')}</span></button>`;
    }).join('')}
  </div></div>
  ${many ? `<button class="expand" data-act="toggle-today" aria-expanded="${!!ui.recOpen}">${ui.recOpen ? icons.up : icons.down}<span>${ui.recOpen ? '접기' : `${dayEntries.length}건 모두 보기`}</span></button>` : ''}`;
}

function renderRecord() {
  const { rec } = ui;
  const catMap = store.catMap;
  const dayEntries = dayEntriesOf(rec.date);
  const daySum = summarize(dayEntries, catMap);
  const isToday = rec.date === todayStr();
  const aside = dayEntries.length ? `${dayEntries.length}건 · ${won(daySum.expense)}${daySum.income ? ` · +${comma(daySum.income)}원` : ''}` : '';
  const dayTitle = `${isToday ? '오늘' : esc(relLabel(rec.date))} 기록`;

  if (xwide()) {
    // 이번 달 요약: 지난달 같은 날까지와 비교
    const d = parseYmd(rec.date);
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    const pre = (yy, mm) => `${yy}-${String(mm).padStart(2, '0')}`;
    const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
    const upTo = (yy, mm) => store.state.entries.filter((e) => e.date.startsWith(pre(yy, mm)) && Number(e.date.slice(8, 10)) <= day);
    const cur = summarize(upTo(y, m), catMap).expense, before = summarize(upTo(py, pm), catMap).expense;
    const diff = cur - before;
    const cmp = before ? (diff === 0 ? '지난달 이맘때와 같아요' : `지난달 이맘때보다 ${won(Math.abs(diff))} ${diff > 0 ? '더 썼어요' : '덜 썼어요'}`) : '지난달 기록이 없어요';
    return `<main class="screen pc-record" aria-labelledby="t-record">
      <section class="input-col">${recordTopbar(true)}${categoriesHtml(true)}${amountHtml()}</section>
      <section class="side-col">
        <div class="card month-card">${glassIcon('wallet', 48)}
          <div class="grow"><div class="label">${m}월 지출</div><div class="amount-l num">${won(cur)}</div><div class="hint">${cmp}</div></div>
          <button class="btn neutral medium" data-act="go-month" data-y="${y}" data-m="${m}">통계 보기</button></div>
        <div class="card outline day-card">
          <div class="section-head"><h2 id="t-day">${dayTitle}</h2><span class="aside num">${aside}</span></div>
          ${dayEntries.length ? `<div class="table">${tableHead('time')}${dayEntries.map((e) => tableRow(e, catMap, 'time')).join('')}</div>` : emptyDay()}
        </div>
      </section>
    </main>`;
  }

  // 휴대폰: 위에서부터 오늘 기록 → 카테고리 → 금액 · 더하기 · 메모 (엄지가 닿는 아래쪽에 입력)
  return `<main class="screen record-screen" aria-labelledby="t-record">
    ${recordTopbar(false)}
    <section class="today-sec" aria-labelledby="t-day">
      <div class="section-head"><h2 id="t-day">${dayTitle}</h2><span class="aside num">${aside}</span></div>
      ${dayEntries.length ? miniCards(dayEntries, catMap) : emptyDay(true)}
    </section>
    ${categoriesHtml(false)}
    ${amountHtml()}
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
  if (hint) { hint.innerHTML = hintHtml(); hint.classList.remove('warn'); }
}

/* 한 번만 보여 줄 것 기억 */
const SEEN_KEY = 'sl.seen';
const seenSet = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } };
const seen = (k) => seenSet().has(k);
const markSeen = (k) => { try { const s = seenSet(); s.add(k); localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-60))); } catch { /* 저장 못 함 */ } };

function saveWithCategory(catId, btn) {
  const cat = store.catMap.get(catId);
  if (!cat) return;
  if (!ui.rec.amount) {
    ui.rec.hint = '금액을 먼저 입력해 주세요.';
    ui.rec.warn = true;
    const hint = document.getElementById('amount-hint');
    if (hint) { hint.innerHTML = hintHtml(); hint.classList.add('warn'); pop(hint.querySelector('.gi')); }
    shake(document.getElementById('amount-field'));
    document.getElementById('amount')?.focus();
    return;
  }
  const month = ui.rec.date.slice(0, 7);
  const firstOfMonth = !store.state.entries.some((e) => e.date.startsWith(month));
  // 동전이 날아갈 출발·도착 자리 (다시 그리기 전에 잰다)
  const fromRect = btn?.querySelector('.gi')?.getBoundingClientRect();
  const toRect = document.querySelector('.mini-grid .mini, .day-card .trow, .today-card')?.getBoundingClientRect();

  const id = uid();
  ui.justAdded = id;
  const amt = ui.rec.amount;
  store.addEntry({ id, amount: amt, categoryId: catId, date: ui.rec.date, memo: ui.rec.memo.trim() });
  ui.rec.amount = 0; ui.rec.memo = ''; ui.rec.hint = ''; ui.rec.warn = false;
  render();
  const newBtnIcon = document.querySelector(`.cat-btn[data-id="${catId}"] .gi`);
  anim(newBtnIcon, [{ transform: 'scale(1)' }, { transform: 'scale(.8)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: 340, easing: EASE.bouncy, kind: 'none' });
  if (fromRect && toRect) flyCoin({ getBoundingClientRect: () => fromRect }, toRect);
  showToast(`${cat.name} ${comma(amt)}원을 기록했어요`, { label: '되돌리기', fn: () => store.deleteEntry(id) }, 'check');
  setTimeout(() => { if (ui.justAdded === id) ui.justAdded = null; }, 1400);
  if (firstOfMonth && !seen(`first:${month}`)) {
    markSeen(`first:${month}`);
    setTimeout(() => { if (!ui.sheet) openPopup('first'); }, reduced() ? 300 : 1300);
  }
}

/* =================================================================
   통계 화면
================================================================= */
function periodTitle(p, long = false) {
  if (p.period === 'all') return '전체 기간';
  if (p.period === 'day') {
    const d = parseYmd(p.date);
    return `${d.getFullYear() !== now.getFullYear() ? `${d.getFullYear()}년 ` : ''}${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
  }
  if (p.period === 'week') return `${parseYmd(p.date).getFullYear() !== now.getFullYear() ? `${parseYmd(p.date).getFullYear()}년 ` : ''}${weekLabel(weekStart(p.date))}`;
  if (p.period === 'year') return `${p.year}년`;
  return p.year === now.getFullYear() && !long ? `${p.month}월` : `${p.year}년 ${p.month}월`;
}

const minDate = (d) => (d > todayStr() ? todayStr() : d);
/** 기간 종류를 바꿀 때 날짜·연·월을 서로 맞춘다 */
function setStatsPeriod(v) {
  const p = ui.st, prevKind = p.period;
  if ((v === 'day' || v === 'week') && (prevKind === 'month' || prevKind === 'year')) {
    const t = todayStr();
    const inSame = prevKind === 'month' ? t.startsWith(`${p.year}-${pad(p.month)}`) : t.startsWith(String(p.year));
    p.date = inSame ? t : (prevKind === 'month' ? `${p.year}-${pad(p.month)}-01` : `${p.year}-01-01`);
  }
  if ((v === 'month' || v === 'year') && (prevKind === 'day' || prevKind === 'week')) {
    const d = parseYmd(p.date); p.year = d.getFullYear(); p.month = d.getMonth() + 1;
  }
  p.period = v;
}

function averageLine(p, sum, entries) {
  const t = new Date();
  if (p.period === 'day') return ['한 건 평균', won(entries.length ? Math.round(sum / entries.length) : 0)];
  if (p.period === 'week') {
    const ws = weekStart(p.date), cur = ws === weekStart(todayStr());
    const days = cur ? ((t.getDay() + 6) % 7) + 1 : 7;
    return ['하루 평균', won(Math.round(sum / days))];
  }
  if (p.period === 'month') {
    const dim = new Date(p.year, p.month, 0).getDate();
    const cur = p.year === t.getFullYear() && p.month === t.getMonth() + 1;
    return ['하루 평균', won(Math.round(sum / (cur ? t.getDate() : dim)))];
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

function statsData(p) {
  const catMap = store.catMap;
  const all = store.state.entries;
  const entries = inPeriod(all, p);
  const sum = summarize(entries, catMap);
  const hasIncomeCats = store.state.categories.some((c) => c.type === 'income');
  let compare = '';
  const prev = previousPeriod(p);
  if (prev) {
    const ps = summarize(inPeriod(all, prev), catMap);
    const isNow = p.period === 'day' ? p.date === todayStr() : p.period === 'week' ? weekStart(p.date) === weekStart(todayStr()) : true;
    const word = { day: isNow ? '어제' : '전날', week: isNow ? '지난주' : '전주', month: '지난달', year: '작년' }[p.period];
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
  return { catMap, entries, sum, compare, splits, hasIncomeCats };
}

function summaryCard(p, d) {
  const tag = p.period === 'month' || p.period === 'year' ? 'button' : 'div';
  return `<${tag} class="card summary" ${tag === 'button' ? `data-act="report" aria-label="${periodTitle(p)} 정리 보기"` : ''}>
      <div class="label">${p.period === 'all' ? '전체' : periodTitle(p, xwide())} 지출</div>
      <div class="amount-xl num">${won(d.sum.expense)}</div>
      ${d.compare ? `<div class="compare">${d.compare}</div>` : ''}
      <div class="split">${d.splits.map(([k, v]) => `<div><div class="label">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
    </${tag}>`;
}

function trendHtml(p, d, animate) {
  const bars = trend(d.entries, p, d.catMap);
  const max = Math.max(0, ...bars.map((b) => b.sum));
  const t = new Date();
  const curKey = p.period === 'day' ? (p.date === todayStr() ? t.getHours() : -1)
    : p.period === 'week' ? todayStr()
    : p.period === 'month'
      ? (p.year === t.getFullYear() && p.month === t.getMonth() + 1 ? t.getDate() : -1)
      : p.period === 'year' ? (p.year === t.getFullYear() ? t.getMonth() + 1 : -1) : t.getFullYear();
  if (!bars.length) return '';
  return `<div class="trend ${animate ? 'animate' : ''}" role="list">
    ${bars.map((b, i) => {
      const h = max ? Math.max(2, (b.sum / max) * 100) : 2;
      const showLabel = p.period === 'day' ? b.key % 6 === 0 : p.period !== 'month' || b.key === 1 || b.key % 5 === 0;
      const tip = b.sum === max && max > 0 ? `<span class="tip num">${compact(b.sum)}</span>` : '';
      const clickable = p.period !== 'day';
      const tag = clickable ? 'button' : 'div';
      const name = { day: `${b.key}시`, week: `${b.label}요일`, month: `${b.key}일`, year: `${b.key}월`, all: `${b.key}년` }[p.period];
      return `<${tag} class="bar-col ${b.key === curKey ? 'on' : ''}" role="listitem" ${clickable ? `data-act="drill" data-key="${b.key}"` : ''} aria-label="${name} ${won(b.sum)}" style="--i:${i}">
        ${tip}<span class="b" style="height:calc(${h}% - 34px)"></span><span class="x">${showLabel ? b.label : ''}</span></${tag}>`;
    }).join('')}
  </div>`;
}

function catStatsHtml(d, animate) {
  const rows = byCategory(d.entries, store.sortedCategories, d.catMap);
  let lastType = null;
  return `<div class="${animate ? 'animate' : ''}">${rows.map((r, i) => {
    let head = '';
    if (d.hasIncomeCats && r.cat.type !== lastType) {
      head = `<div class="label" style="margin-top:${lastType ? '16px' : '0'}">${r.cat.type === 'income' ? '수입' : '지출'}</div>`;
      lastType = r.cat.type;
    }
    return `${head}<div class="cat-stat">
      <div class="top"><span class="cat-dot" style="background:${esc(r.cat.color)}"></span>
        <span class="name">${esc(r.cat.name)} <span class="hint">${r.count}건</span></span>
        <span class="pct num">${r.pct.toFixed(r.pct < 10 ? 1 : 0)}%</span>
        <span class="sum">${r.cat.type === 'income' ? `<span class="income-text">+${comma(r.sum)}원</span>` : won(r.sum)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${r.pct}%;background:${esc(r.cat.color)};--i:${i}"></div></div>
    </div>`;
  }).join('')}</div>`;
}

function listHtml(p, d, { table = false } = {}) {
  const catMap = d.catMap;
  const groups = buildList(d.entries, p, catMap);
  const listCount = groups.reduce((n, g) => n + g.items.length, 0);
  const groupLabel = (g) => {
    if (p.group === 'day') return relLabel(g.key);
    if (p.group === 'week') return weekLabel(g.key);
    if (p.group === 'category') return catMap.get(g.key)?.name ?? '삭제된 카테고리';
    return '';
  };
  let budget = p.limit;
  const shown = groups.map((g) => { const items = g.items.slice(0, Math.max(0, budget)); budget -= items.length; return { ...g, shownItems: items }; })
    .filter((g) => g.shownItems.length);
  const more = listCount > p.limit
    ? `<button class="btn neutral medium block" style="margin-top:16px" data-act="more">더 보기 (${comma(listCount - p.limit)}건 남음)</button>` : '';
  const chip = (act, val, cur, label) => `<button class="chip" data-act="${act}" data-v="${val}" aria-pressed="${cur === val}">${label}</button>`;
  const dirLabels = p.sort === 'amount' ? ['큰 금액순', '작은 금액순'] : ['최신순', '오래된순'];
  const dirLabel = p.dir === 'desc' ? dirLabels[0] : dirLabels[1];
  const filterCats = store.sortedCategories.filter((c) => !c.hidden || d.entries.some((e) => e.categoryId === c.id));
  const controls = `<div class="controls">
      <div class="control-row"><span class="label">정렬</span><div class="chips">
        ${chip('sort', 'date', p.sort, '날짜')}${chip('sort', 'amount', p.sort, '금액')}
      </div>
        <button class="dir-toggle" data-act="dir-toggle" aria-label="순서 바꾸기, 지금 ${dirLabel}">${p.dir === 'desc' ? icons.sortDesc : icons.sortAsc}${dirLabel}</button>
      </div>
      <div class="control-row"><span class="label">보기</span><div class="chips">
        ${chip('group', 'item', p.group, '건별')}${chip('group', 'day', p.group, '날짜별')}${chip('group', 'week', p.group, '주별')}${chip('group', 'category', p.group, '카테고리별')}
      </div></div>
      ${p.group === 'category' ? `<div class="chips cat-filter" role="group" aria-label="카테고리 고르기">
        <button class="chip soft" data-act="fcat" data-v="" aria-pressed="${p.filterCats.size === 0}">전체</button>
        ${filterCats.map((c) => `<button class="chip soft" data-act="fcat" data-v="${c.id}" aria-pressed="${p.filterCats.has(c.id)}"><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}</button>`).join('')}
      </div>` : ''}
    </div>`;
  const gsum = (g) => `${g.expense ? won(g.expense) : ''}${g.income ? `${g.expense ? ' · ' : ''}<span class="income-text">+${comma(g.income)}원</span>` : ''}`;
  let body;
  if (!listCount) body = '<p class="hint" style="padding:16px 0">조건에 맞는 기록이 없어요.</p>';
  else if (table) {
    body = `<div class="table">${tableHead('date')}${p.group === 'item'
      ? shown[0].shownItems.map((e) => tableRow(e, catMap, 'date')).join('')
      : shown.map((g) => `<div class="tgroup"><span>${esc(groupLabel(g))} · ${g.items.length}건</span><span class="num">${gsum(g)}</span></div>
          ${g.shownItems.map((e) => tableRow(e, catMap, 'date')).join('')}`).join('')}</div>`;
  } else if (p.group === 'item') {
    body = `<ul class="list">${shown[0].shownItems.map((e) => entryRow(e, catMap, { showDate: true })).join('')}</ul>`;
  } else {
    body = shown.map((g) => `<div class="group">
        <div class="group-head"><span class="g-label">${esc(groupLabel(g))} · ${g.items.length}건</span><span class="g-sum">${gsum(g)}</span></div>
        <ul class="list">${g.shownItems.map((e) => entryRow(e, catMap, { showDate: p.group !== 'day' })).join('')}</ul>
      </div>`).join('');
  }
  return { controls, body: body + more, listCount };
}

function periodNav(p) {
  return `<div class="period-nav">
      ${p.period !== 'all' ? `<button class="icon-btn" data-act="shift" data-d="-1" aria-label="이전 기간">${icons.left}</button>` : ''}
      <h1 class="title" id="t-stats">${periodTitle(p, xwide())}</h1>
      ${p.period !== 'all' ? `<button class="icon-btn" data-act="shift" data-d="1" aria-label="다음 기간">${icons.right}</button>` : ''}
    </div>`;
}
const segment = (p) => `<div class="segment seg5" role="group" aria-label="통계 기간">
    ${[['day', '일별'], ['week', '주별'], ['month', '월별'], ['year', '연별'], ['all', '전체']].map(([v, l]) => `<button data-act="period" data-v="${v}" aria-pressed="${p.period === v}">${l}</button>`).join('')}
  </div>`;
const trendTitle = (p) => ({ day: '시간대별 지출', week: '요일별 지출', month: '일별 지출', year: '월별 지출', all: '연도별 지출' }[p.period]);
const emptyStats = () => `<div class="empty">${glassIcon('chart', 72, 'float')}<strong>이 기간에는 기록이 없어요</strong><p>기록 탭에서 금액을 남기면 여기에 모여요.</p></div>`;

function renderStats(animate) {
  const p = ui.st;
  const d = statsData(p);
  const empty = !d.entries.length;

  if (xwide()) {
    const list = listHtml(p, d, { table: true });
    return `<div class="pc-stats">
      <aside class="period-panel" aria-label="기간 고르기">${periodPanel(false)}</aside>
      <main class="screen pc-main" aria-labelledby="t-stats">
        <header class="pc-head">${periodNav(p)}${segment(p)}</header>
        <div class="pc-grid">
          ${summaryCard(p, d)}
          <section class="card outline" aria-labelledby="t-trend"><div class="section-head"><h2 id="t-trend">${trendTitle(p)}</h2>${p.period !== 'day' ? '<span class="aside">막대를 누르면 자세히 봐요</span>' : ''}</div>
            ${empty ? '<p class="hint">이 기간에는 기록이 없어요.</p>' : trendHtml(p, d, animate)}</section>
          <section class="card outline" aria-labelledby="t-bycat"><div class="section-head"><h2 id="t-bycat">카테고리별</h2></div>
            ${empty ? emptyStats() : catStatsHtml(d, animate)}</section>
          <section class="card outline list-card" aria-labelledby="t-list"><div class="section-head"><h2 id="t-list">기록 목록</h2><span class="aside">${list.listCount}건</span></div>
            ${list.controls}<div class="scroll">${list.body}</div></section>
        </div>
      </main>
    </div>`;
  }

  const list = listHtml(p, d);
  return `<main class="screen" aria-labelledby="t-stats">
    <header class="topbar stats-top">
      <button class="icon-btn" data-act="drawer" aria-label="연도·월 이동 메뉴 열기">${icons.menu}</button>
      ${periodNav(p)}
    </header>
    ${segment(p)}
    ${summaryCard(p, d)}
    ${empty ? emptyStats() : `
    <section class="section" aria-labelledby="t-trend">
      <div class="section-head"><h2 id="t-trend">${trendTitle(p)}</h2>${p.period !== 'day' ? '<span class="aside">막대를 누르면 자세히 봐요</span>' : ''}</div>
      ${trendHtml(p, d, animate)}
    </section>
    <section class="section" aria-labelledby="t-bycat">
      <div class="section-head"><h2 id="t-bycat">카테고리별</h2></div>
      ${catStatsHtml(d, animate)}
    </section>`}
    <section class="section" aria-labelledby="t-list">
      <div class="section-head"><h2 id="t-list">기록 목록</h2><span class="aside">${list.listCount}건</span></div>
      ${list.controls}${list.body}
    </section>
  </main>`;
}

function periodPanel(closable) {
  const catMap = store.catMap;
  const idx = monthIndex(store.state.entries, catMap);
  const years = new Set([now.getFullYear(), ...idx.keys()]);
  const p = ui.st;
  const yearSum = (y) => [...(idx.get(y)?.values() ?? [])].reduce((a, b) => a + b, 0);
  return `<div class="topbar" style="margin-bottom:8px"><h2>${closable ? '기간 이동' : '기간'}</h2>
      ${closable ? `<button class="icon-btn" data-act="close-overlay" aria-label="닫기">${icons.close}</button>` : ''}</div>
    <button class="menu-row" data-act="jump" data-y="" data-m="" aria-current="${p.period === 'all'}"><span>전체 기간</span>${icons.right}</button>
    ${[...years].sort((a, b) => b - a).map((y) => `<div class="year-block">
      <button class="year-head" data-act="jump" data-y="${y}" data-m=""><span>${y}년</span><span class="hint num">${won(yearSum(y))}</span></button>
      <div class="month-grid">
        ${Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const s = idx.get(y)?.get(m);
          const cur = p.period === 'month' && p.year === y && p.month === m;
          return `<button data-act="jump" data-y="${y}" data-m="${m}" class="${s === undefined ? 'none' : ''}" aria-current="${cur}" aria-label="${y}년 ${m}월${s ? ` ${won(s)}` : ''}">
            ${m}월${s !== undefined ? `<small class="num">${compact(s)}</small>` : ''}</button>`;
        }).join('')}
      </div></div>`).join('')}`;
}
const renderDrawer = () => `<div class="scrim" data-act="close-overlay"></div><nav class="drawer" aria-label="연도·월 이동">${periodPanel(true)}</nav>`;

/* =================================================================
   달력 화면: 일·주·월·연 달력 × 건별·카테고리별·합계별
================================================================= */
const CAL_VIEWS = [['day', '일별'], ['week', '주별'], ['month', '월별'], ['year', '연별']];
const CAL_MODES = [['item', '건별'], ['category', '카테고리별'], ['total', '합계별']];

function calTitle(c) {
  const d = parseYmd(c.date);
  const y = d.getFullYear(), m = d.getMonth() + 1;
  if (c.view === 'year') return `${y}년`;
  if (c.view === 'month') return `${y}년 ${m}월`;
  if (c.view === 'week') return `${y !== now.getFullYear() ? `${y}년 ` : ''}${weekLabel(weekStart(c.date))}`;
  return `${y !== now.getFullYear() ? `${y}년 ` : ''}${m}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
}

function calEntries(c) {
  const d = parseYmd(c.date);
  const y = d.getFullYear(), m = d.getMonth() + 1;
  let list;
  if (c.view === 'year') list = store.state.entries.filter((e) => e.date.startsWith(String(y)));
  else if (c.view === 'month') list = store.state.entries.filter((e) => e.date.startsWith(`${y}-${pad(m)}`));
  else if (c.view === 'week') { const ws = weekStart(c.date); list = store.state.entries.filter((e) => weekStart(e.date) === ws); }
  else list = store.state.entries.filter((e) => e.date === c.date);
  if (c.mode === 'category' && c.filterCats.size) list = list.filter((e) => c.filterCats.has(e.categoryId));
  return list;
}

/** 한 칸(날·달)의 내용을 보기 방식에 맞게 */
function calCell(list, catMap, { lines = 2, full = false } = {}) {
  const c = ui.cal;
  const money = (n) => (full ? won(n) : shortWon(n));
  if (!list.length) return '';
  if (c.mode === 'total') {
    const s = summarize(list, catMap);
    return `<span class="c-total num">${s.expense ? money(s.expense) : ''}${s.income ? `<span class="income-text">+${money(s.income)}</span>` : ''}</span>`;
  }
  let rows;
  if (c.mode === 'category') {
    const sums = new Map();
    for (const e of list) sums.set(e.categoryId, (sums.get(e.categoryId) ?? 0) + e.amount);
    rows = [...sums].sort((a, b) => b[1] - a[1]).map(([id, sum]) => ({ c: catMap.get(id), amount: sum, inc: catMap.get(id)?.type === 'income' }));
  } else {
    rows = list.slice().sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)).map((e) => ({ c: catMap.get(e.categoryId), amount: e.amount, inc: isIncome(catMap, e) }));
  }
  const shown = rows.slice(0, lines);
  return shown.map((r) => `<span class="c-line"><i style="background:${esc(r.c?.color ?? '#8b95a1')}"></i>${full ? `<em>${esc(r.c?.name ?? '')}</em>` : ''}<b class="${r.inc ? 'income-text' : ''}">${r.inc ? '+' : ''}${money(r.amount)}</b></span>`).join('')
    + (rows.length > lines ? `<span class="c-more">+${rows.length - lines}</span>` : '');
}

function calMonth(c, list, catMap, big) {
  const d = parseYmd(c.date);
  const y = d.getFullYear(), m = d.getMonth();
  const first = new Date(y, m, 1);
  const start = new Date(y, m, 1 - first.getDay());
  const weeks = Math.ceil((first.getDay() + new Date(y, m + 1, 0).getDate()) / 7);
  const byDay = new Map();
  for (const e of list) { const a = byDay.get(e.date) ?? []; a.push(e); byDay.set(e.date, a); }
  const t = todayStr();
  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const dd = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}-${pad(dd.getDate())}`;
    const out = dd.getMonth() !== m;
    const items = out ? [] : (byDay.get(key) ?? []);
    cells += `<button class="c-day ${out ? 'out' : ''} ${key === t ? 'today' : ''} ${key > t ? 'future' : ''} ${dd.getDay() === 0 ? 'sun' : ''}" data-act="cal-open" data-view="day" data-date="${key}" ${out ? 'tabindex="-1" aria-hidden="true"' : `aria-label="${dd.getMonth() + 1}월 ${dd.getDate()}일 ${items.length}건"`}>
      <span class="c-num">${dd.getDate()}</span>${calCell(items, catMap, { lines: big ? 3 : 2, full: big })}</button>`;
  }
  return `<div class="cal-month"><div class="c-week">${[...WD].map((w, i) => `<span class="${i === 0 ? 'sun' : ''}">${w}</span>`).join('')}</div><div class="c-grid">${cells}</div></div>`;
}

function calYear(c, list, catMap, big) {
  const y = parseYmd(c.date).getFullYear();
  const t = new Date();
  return `<div class="cal-year">${Array.from({ length: 12 }, (_, i) => {
    const items = list.filter((e) => Number(e.date.slice(5, 7)) === i + 1);
    const cur = y === t.getFullYear() && i === t.getMonth();
    return `<button class="c-mon ${cur ? 'today' : ''}" data-act="cal-open" data-view="month" data-date="${y}-${pad(i + 1)}-01" aria-label="${i + 1}월 ${items.length}건">
      <span class="c-num">${i + 1}월${c.mode === 'item' && items.length ? ` <small>${items.length}건</small>` : ''}</span>${calCell(items, catMap, { lines: big ? 4 : 3, full: big })}</button>`;
  }).join('')}</div>`;
}

function calWeek(c, list, catMap) {
  const ws = weekStart(c.date), t = todayStr();
  return `<div class="cal-week">${Array.from({ length: 7 }, (_, i) => {
    const key = addDays(ws, i), d = parseYmd(key);
    const items = list.filter((e) => e.date === key);
    return `<div class="c-wday ${key === t ? 'today' : ''}">
      <button class="c-wlabel" data-act="cal-open" data-view="day" data-date="${key}"><b>${WD[d.getDay()]}</b><span>${d.getMonth() + 1}.${d.getDate()}</span></button>
      <div class="c-wbody">${items.length ? calDayChips(items, catMap) : '<span class="hint">—</span>'}</div></div>`;
  }).join('')}</div>`;
}

function calDayChips(items, catMap) {
  if (ui.cal.mode === 'category') {
    const sums = new Map();
    for (const e of items) sums.set(e.categoryId, (sums.get(e.categoryId) ?? 0) + e.amount);
    return [...sums].sort((a, b) => b[1] - a[1]).map(([id, sum]) => { const cc = catMap.get(id); return `<span class="c-chip">${mark(cc, 18)}${esc(cc?.name ?? '')}<b class="${cc?.type === 'income' ? 'income-text' : ''}">${won(sum)}</b></span>`; }).join('');
  }
  return items.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)).map((e) => { const cc = catMap.get(e.categoryId); return `<button class="c-chip" data-act="edit-entry" data-id="${e.id}">${mark(cc, 18)}${esc(cc?.name ?? '')}${e.memo ? `<small>${esc(e.memo)}</small>` : ''}<b class="${isIncome(catMap, e) ? 'income-text' : ''}">${won(e.amount)}</b></button>`; }).join('');
}

function calDay(c, list, catMap) {
  if (!list.length) return `<div class="empty">${glassIcon('calendar', 64, 'float')}<strong>이 날은 기록이 없어요</strong><p>기록 탭에서 날짜를 이날로 바꾸면 남길 수 있어요.</p></div>`;
  if (c.mode === 'category') return catStatsHtml({ entries: list, catMap, hasIncomeCats: store.state.categories.some((x) => x.type === 'income') }, false);
  return `<ul class="list">${list.slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).map((e) => entryRow(e, catMap)).join('')}</ul>`;
}

function renderCalendar() {
  const c = ui.cal;
  const catMap = store.catMap;
  if ((c.view === 'day' || c.view === 'week') && c.mode === 'total') c.mode = 'item';
  const list = calEntries(c);
  const sum = summarize(list, catMap);
  const big = xwide();
  const totalOff = c.view === 'day' || c.view === 'week';
  const filterCats = store.sortedCategories.filter((x) => !x.hidden || list.some((e) => e.categoryId === x.id));
  const body = c.view === 'month' ? calMonth(c, list, catMap, big) : c.view === 'year' ? calYear(c, list, catMap, big) : c.view === 'week' ? calWeek(c, list, catMap) : calDay(c, list, catMap);
  const isNow = c.view === 'day' ? c.date === todayStr() : c.view === 'week' ? weekStart(c.date) === weekStart(todayStr())
    : c.view === 'month' ? c.date.slice(0, 7) === todayStr().slice(0, 7) : c.date.slice(0, 4) === todayStr().slice(0, 4);
  return `<main class="screen cal-screen ${big ? 'pc-cal' : ''}" aria-labelledby="t-cal">
    <header class="topbar stats-top cal-top">
      <h1 class="cal-h1" id="t-cal">달력</h1>
      <div class="period-nav">
        <button class="icon-btn" data-act="cal-shift" data-d="-1" aria-label="이전">${icons.left}</button>
        <h2 class="title">${calTitle(c)}</h2>
        <button class="icon-btn" data-act="cal-shift" data-d="1" aria-label="다음">${icons.right}</button>
      </div>
      ${isNow ? '' : '<button class="btn neutral small cal-today" data-act="cal-today">오늘</button>'}
    </header>
    <div class="segment" role="group" aria-label="달력 단위">
      ${CAL_VIEWS.map(([v, l]) => `<button data-act="cal-view" data-v="${v}" aria-pressed="${c.view === v}">${l}</button>`).join('')}
    </div>
    <div class="controls cal-controls">
      <div class="control-row"><span class="label">보기</span><div class="chips">
        ${CAL_MODES.map(([v, l]) => `<button class="chip" data-act="cal-mode" data-v="${v}" aria-pressed="${c.mode === v}" ${v === 'total' && totalOff ? 'aria-disabled="true" title="합계별은 월별·연별 달력에서 볼 수 있어요"' : ''}>${l}</button>`).join('')}
      </div><span class="aside cal-sum num">${sum.count}건 · ${won(sum.expense)}${sum.income ? ` · <span class="income-text">+${comma(sum.income)}원</span>` : ''}</span></div>
      ${c.mode === 'category' ? `<div class="chips cat-filter" role="group" aria-label="카테고리 고르기">
        <button class="chip soft" data-act="cal-fcat" data-v="" aria-pressed="${c.filterCats.size === 0}">전체</button>
        ${filterCats.map((x) => `<button class="chip soft" data-act="cal-fcat" data-v="${x.id}" aria-pressed="${c.filterCats.has(x.id)}"><span class="dot" style="background:${esc(x.color)}"></span>${esc(x.name)}</button>`).join('')}
      </div>` : ''}
    </div>
    <section class="cal-body ${c.view}" aria-label="${calTitle(c)} 달력">${body}</section>
  </main>`;
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
    account = `<div class="card account">${glassIcon('cloud', 40)}<div class="who"><strong>${esc(s.user.email)}</strong>
      <span class="sync ${syncText[0]}"><i></i>${syncText[1]}</span></div>
      <button class="btn neutral small" data-act="signout">로그아웃</button></div>`;
  } else if (s.cloudAvailable) {
    account = `<div class="card account">${glassIcon('user', 40)}<div class="who"><strong>로그인하고 함께 쓰기</strong>
      <span class="hint">PC와 휴대폰에서 같은 기록을 바로 봐요</span></div>
      <button class="btn primary small" data-act="open-auth">로그인</button></div>`;
  } else {
    account = `<div class="card account">${glassIcon('user', 40)}<div class="who"><strong>이 기기에만 저장 중</strong>
      <span class="hint">계정 연결(Firebase)을 설정하면 기기 간 실시간 동기화가 켜져요.</span></div></div>`;
  }
  const visible = cats.filter((x) => !x.hidden);
  const catsCard = `<div class="card manage-card">
      ${cats.length ? cats.map((c, i) => `<div class="manage-row ${c.hidden ? 'hidden-cat' : ''}">
        ${mark(c)}
        <span class="name">${esc(c.name)}<small>${c.type === 'income' ? '수입' : '지출'}${c.hidden ? ' · 숨김' : ''}${!c.hidden && visible.indexOf(c) < WIDGET_SLOTS ? ' · 위젯' : ''}</small></span>
        <button class="mini-btn" data-act="cat-move" data-id="${c.id}" data-d="-1" aria-label="${esc(c.name)} 위로" ${i === 0 ? 'disabled' : ''}>${icons.up}</button>
        <button class="mini-btn" data-act="cat-move" data-id="${c.id}" data-d="1" aria-label="${esc(c.name)} 아래로" ${i === cats.length - 1 ? 'disabled' : ''}>${icons.down}</button>
        <button class="mini-btn" data-act="edit-category" data-id="${c.id}" aria-label="${esc(c.name)} 편집">${icons.edit}</button>
      </div>`).join('') : '<p class="hint">카테고리가 없어요.</p>'}
    </div>
    <button class="btn weak large block" style="margin-top:12px" data-act="new-category">${icons.plus.replace('<svg', '<svg width="20" height="20"')}카테고리 추가하기</button>`;
  const widgetCard = `<button class="card widget-card" data-act="widget-guide">${glassIcon('widget', 40)}<span class="grow">
      <strong>빠른 기록 · 이번 달 요약</strong>
      <span class="hint">${widgetSupported ? '홈 화면에 놓고 앱을 열지 않고 기록해요. 누르면 놓는 방법을 알려 드려요.' : '안드로이드 앱에서 쓸 수 있어요. 여기서 기록해도 휴대폰 위젯 금액에 바로 반영돼요.'}</span></span>${icons.right}</button>`;
  const exportRow = `<button class="menu-row export-row" data-act="export">${icons.download.replace('<svg', '<svg style="color:var(--grey600)"')}<span>기록 내보내기 (CSV)</span>${icons.right}</button>`;
  const version = `<p class="hint version">${logoSvg(14)}땡그랑 ${VERSION}${platform === 'web' ? ' · 웹' : ''}</p>`;

  if (xwide()) {
    return `<main class="screen pc-my" aria-labelledby="t-my">
      <header class="topbar"><h1 id="t-my">마이</h1></header>
      <div class="pc-two">
        <div class="col">${account}<section aria-label="홈 화면 위젯">${widgetCard}</section><div class="card outline export-card">${exportRow}</div>${version}</div>
        <section class="card outline" aria-labelledby="t-mcats"><div class="section-head"><h2 id="t-mcats">카테고리</h2><span class="aside">기록 화면에 이 순서로 보여요</span></div>${catsCard}</section>
      </div>
    </main>`;
  }
  return `<main class="screen" aria-labelledby="t-my">
    <header class="topbar"><h1 id="t-my">마이</h1></header>
    ${account}
    <section class="section" aria-labelledby="t-mcats">
      <div class="section-head"><h2 id="t-mcats">카테고리</h2><span class="aside">기록 화면에 이 순서로 보여요</span></div>
      ${catsCard}
    </section>
    <section class="section" aria-labelledby="t-widget">
      <div class="section-head"><h2 id="t-widget">홈 화면 위젯</h2></div>
      ${widgetCard}
    </section>
    <section class="section" aria-labelledby="t-data">
      <div class="section-head"><h2 id="t-data">데이터</h2></div>
      ${exportRow}
    </section>
    ${version}
  </main>`;
}

/* =================================================================
   시트 (넓은 화면에서는 가운데 대화상자)
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
        <div class="amount-rule"></div>
        <div class="quick-row" role="group" aria-label="금액 더하기">
          ${[10, 100, 1000, 10000].map((n) => `<button class="btn weak small" data-act="sh-add" data-n="${n}">+${comma(n)}원</button>`).join('')}
        </div></div>
      <div class="field"><span class="label">카테고리</span><div class="chips" style="flex-wrap:wrap">
        ${cats.map((c) => `<button class="chip" data-act="sh-cat" data-v="${c.id}" aria-pressed="${sh.categoryId === c.id}">${glassIcon(catIcon(c), 18)}${esc(c.name)}</button>`).join('')}
      </div></div>
      <div class="field"><label class="label" for="sh-date">날짜</label><input id="sh-date" class="text-input" type="date" value="${sh.date}" max="${todayStr()}" data-input="sh-date"></div>
      <div class="field"><label class="label" for="sh-memo">메모</label><input id="sh-memo" class="text-input" type="text" maxlength="40" value="${esc(sh.memo)}" placeholder="메모 (선택)" data-input="sh-memo"></div>
      <div class="field-error" aria-live="polite">${esc(sh.error ?? '')}</div>
      <div class="sheet-actions">
        <button class="btn neutral" data-act="sh-delete">삭제하기</button>
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
      <div class="field"><span class="label">아이콘</span><div class="icon-picker" role="group" aria-label="아이콘 고르기">
        ${CATEGORY_ICONS.map((k) => `<button class="icon-pick" data-act="sh-icon" data-v="${k}" aria-pressed="${sh.icon === k}" aria-label="아이콘 ${ICON_LABEL(k)}" title="${ICON_LABEL(k)}">${glassIcon(k, 28, '', sh.color)}</button>`).join('')}
      </div></div>
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
    body = `<div class="sheet-logo">${logoSvg(40)}</div><h3 id="sheet-title">${signup ? '가입하고 동기화 켜기' : '로그인'}</h3>
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
  const fresh = !sh.shown;
  if (fresh) setTimeout(hideToast, 0); // 시트 버튼을 가리지 않게
  sh.shown = true;
  return `<div class="scrim ${fresh ? 'enter' : ''}" data-act="close-overlay"></div>
    <section class="sheet ${fresh ? 'enter' : ''}" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div class="grabber"></div>${body}</section>`;
}

/* =================================================================
   토스트 · 팝업 (화면 다시 그리기와 따로 움직인다)
================================================================= */
let toastTimer = null;
function showToast(text, action = null, icon = 'check') {
  layer.querySelector('.toast-wrap')?.remove();
  clearTimeout(toastTimer);
  const wrap = document.createElement('div');
  wrap.className = 'toast-wrap';
  wrap.setAttribute('aria-live', 'polite');
  wrap.innerHTML = `<div class="toast" role="status">${glassIcon(icon, 24)}<span>${esc(text)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}</div>`;
  layer.appendChild(wrap);
  const t = wrap.firstElementChild;
  anim(t, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 200, kind: 'in' });
  pop(t.querySelector('.gi'), 80);
  if (action) t.querySelector('button').onclick = () => { hideToast(); action.fn(); render(); };
  toastTimer = setTimeout(hideToast, 4000);
}
async function hideToast() {
  const w = layer.querySelector('.toast-wrap');
  if (!w) return;
  clearTimeout(toastTimer);
  await anim(w.firstElementChild, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px)' }], { duration: 180, fill: 'forwards', kind: 'out' });
  w.remove();
}

let popupState = null;
function popupContent(kind, ctx = {}) {
  if (kind === 'first') return { hero: 'first', title: '첫 기록을 남겼어요', body: '땡그랑! 이번 달 첫 지출이 기록됐어요.<br>이제 하나씩 쌓아 가요.', btns: [['좋아요', 'primary', 'ok']] };
  if (kind === 'delete') {
    const e = ctx.entry, c = store.catMap.get(e.categoryId);
    const where = store.state.mode === 'cloud' ? '삭제하면 모든 기기에서 사라져요.' : '삭제하면 이 기기에서 사라져요.';
    const d = parseYmd(e.date);
    return { hero: 'delete', title: '이 기록을 삭제할까요?', body: `${esc(c?.name || '기록')}${e.memo ? ` · ${esc(e.memo)}` : ''} · ${won(e.amount)} · ${d.getMonth() + 1}월 ${d.getDate()}일<br>${where}`, btns: [['취소', 'neutral', 'cancel'], ['삭제하기', 'danger-fill', 'delete']] };
  }
  if (kind === 'sync') return { hero: 'sync', title: '동기화를 켰어요', body: '휴대폰과 PC에서 같은 기록을<br>바로 볼 수 있어요.', btns: [['확인', 'primary', 'ok']] };
  if (kind === 'report') {
    const { p } = ctx;
    const d = statsData(p);
    const top = byCategory(d.entries, store.sortedCategories, d.catMap).filter((r) => r.cat.type !== 'income')[0];
    return {
      hero: 'report', title: `${periodTitle(p)} 정리가 끝났어요`, big: d.sum.expense,
      body: [d.compare, top ? `가장 많이 쓴 곳 · ${esc(top.cat.name)} ${Math.round(top.pct)}%` : ''].filter(Boolean).join('<br>') || '이 기간에는 기록이 없어요.',
      btns: ui.tab === 'stats' && ui.st.period === p.period && ui.st.year === p.year && ui.st.month === p.month
        ? [['확인', 'primary', 'ok']] : [['닫기', 'neutral', 'cancel'], ['통계 보기', 'primary', 'stats']],
    };
  }
  if (kind === 'widget') {
    return {
      hero: 'widget', sheet: true, title: '홈 화면에 위젯을 놓아 보세요',
      body: widgetSupported ? '' : '안드로이드 앱을 설치한 휴대폰에서 이렇게 놓아요.',
      steps: ['홈 화면 빈 곳을 길게 눌러요', '위젯 목록에서 ‘땡그랑’을 골라요', '빠른 기록 위젯을 원하는 곳에 놓아요'],
      btns: [['확인', 'primary', 'ok']],
    };
  }
  return null;
}

function openPopup(kind, ctx = {}) {
  closePopup(true);
  const c = popupContent(kind, ctx);
  if (!c) return;
  const sheetLike = c.sheet && !wide();
  const el = document.createElement('div');
  el.className = `popup-scrim ${sheetLike ? 'bottom' : ''}`;
  el.innerHTML = `<div class="${sheetLike ? 'popup-sheet' : 'popup'}" role="dialog" aria-modal="true" aria-labelledby="popup-title">
    ${sheetLike ? '<div class="grabber"></div>' : ''}
    <div class="hero">${HERO[c.hero]()}</div>
    <h3 id="popup-title">${c.title}</h3>
    ${c.big != null ? '<div class="big num">0원</div>' : ''}
    ${c.body ? `<p>${c.body}</p>` : ''}
    ${c.steps ? `<ol class="steps">${c.steps.map((t, i) => `<li><em>${i + 1}</em>${t}</li>`).join('')}</ol>` : ''}
    <div class="popup-actions">${c.btns.map(([l, v, k]) => `<button class="btn ${v}" data-k="${k}">${l}</button>`).join('')}</div>
  </div>`;
  layer.appendChild(el);
  popupState = { el, kind, ctx };
  const card = el.firstElementChild;
  el.addEventListener('click', (ev) => {
    if (ev.target === el) { closePopup(); return; }
    const b = ev.target.closest('[data-k]');
    if (b) popupAction(b.dataset.k);
  });
  anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, kind: 'in' });
  if (sheetLike) anim(card, [{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 340, easing: EASE.gentle, kind: 'in' });
  else anim(card, [{ opacity: 0, transform: 'translateY(24px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: EASE.bouncy, kind: 'in' });
  HERO_PLAY[c.hero]?.(card);
  if (c.big != null) {
    const b = card.querySelector('.big');
    if (reduced()) b.textContent = won(c.big); else setTimeout(() => countUp(b, 0, c.big, 800), 300);
  }
  if (wide()) card.querySelector('.popup-actions .btn:last-child')?.focus({ preventScroll: true });
}

async function closePopup(fast) {
  if (!popupState) return false;
  const { el } = popupState;
  popupState = null;
  if (fast) { el.remove(); return true; }
  const card = el.firstElementChild;
  const sheetLike = card.classList.contains('popup-sheet');
  await Promise.all([
    anim(card, sheetLike ? [{ transform: 'none' }, { transform: 'translateY(100%)' }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px) scale(.98)' }], { duration: sheetLike ? 240 : 160, easing: EASE.in, fill: 'forwards', kind: 'out' }),
    anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 40, fill: 'forwards', kind: 'out' }),
  ]);
  el.remove();
  return true;
}

function popupAction(k) {
  const st = popupState;
  if (!st) return;
  if (k === 'delete') {
    const e = st.ctx.entry;
    store.deleteEntry(e.id);
    ui.sheet = null;
    closePopup();
    render();
    showToast('기록을 삭제했어요', { label: '되돌리기', fn: () => store.addEntry(e) }, 'trash');
    return;
  }
  if (k === 'stats') {
    const { p } = st.ctx;
    Object.assign(ui.st, { period: p.period, year: p.year, month: p.month, limit: 60 });
    closePopup();
    goTab('stats', true);
    return;
  }
  closePopup();
}

/** 달이 바뀐 뒤 처음 열면 지난달 정리를 보여 준다 */
let reportChecked = false;
function maybeMonthlyReport() {
  if (reportChecked) return;
  const s = store.state;
  const ready = s.mode === 'local' ? s.authReady : s.sync === 'synced';
  if (!ready) return;
  reportChecked = true;
  const t = new Date();
  const key = `report:${t.getFullYear()}-${t.getMonth() + 1}`;
  if (seen(key)) return;
  markSeen(key);
  const p = t.getMonth() === 0 ? { period: 'month', year: t.getFullYear() - 1, month: 12 } : { period: 'month', year: t.getFullYear(), month: t.getMonth() };
  const had = summarize(inPeriod(s.entries, p), store.catMap).expense > 0;
  if (had) setTimeout(() => { if (!ui.sheet && !popupState) openPopup('report', { p }); }, 700);
}

/* =================================================================
   렌더링
================================================================= */
const TABS = [
  ['record', '기록', icons.tabRecord],
  ['calendar', '달력', icons.tabCalendar],
  ['stats', '통계', icons.tabStats],
  ['my', '마이', icons.tabMy],
];

function renderTab(tab, animate = false) {
  if (tab === 'record') return renderRecord();
  if (tab === 'calendar') return renderCalendar();
  return tab === 'stats' ? renderStats(animate) : renderMy();
}

function render() {
  const app = document.getElementById('app');
  const active = document.activeElement;
  const focusId = active?.id;
  const sel = active && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
  const scrollY = window.scrollY;
  const listScroll = document.querySelector('.list-card .scroll')?.scrollTop ?? 0;
  const animateStats = ui.st.anim; ui.st.anim = false;
  const isWide = wide();
  document.documentElement.classList.toggle('is-wide', isWide);
  document.documentElement.classList.toggle('is-xwide', xwide());

  const rail = isWide ? `<nav class="rail" aria-label="주 메뉴"><div class="rail-logo">${logoSvg(34)}</div>
      ${TABS.map(([id, label, icon]) => `<button class="rail-tab" data-act="go-tab" data-tab="${id}" aria-label="${label}" title="${label}" ${ui.tab === id ? 'aria-current="page"' : ''}>${icon}</button>`).join('')}</nav>` : '';
  app.innerHTML = `<div class="shell tab-${ui.tab}">${rail}${renderTab(ui.tab, animateStats)}</div>
    ${isWide ? '' : `<nav class="tabbar" aria-label="주 메뉴"><div class="tabbar-inner">
      ${TABS.map(([id, label, icon]) => `<button class="tab" data-act="go-tab" data-tab="${id}" aria-label="${label}" ${ui.tab === id ? 'aria-current="page"' : ''}>${icon}</button>`).join('')}
    </div></nav>`}
    ${ui.drawer ? renderDrawer() : ''}
    ${renderSheet()}`;

  window.scrollTo(0, scrollY);
  const ls = document.querySelector('.list-card .scroll'); if (ls) ls.scrollTop = listScroll;
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
  if (popupState) { closePopup(); return true; }
  if (ui.sheet) { ui.sheet = null; render(); return true; }
  if (ui.drawer) { ui.drawer = false; render(); return true; }
  return false;
}

function goTab(tab, force = false) {
  if (ui.tab === tab && !force) return;
  ui.tab = tab;
  if (tab === 'stats') ui.st.anim = true;
  ui.drawer = false; ui.sheet = null;
  render();
  window.scrollTo(0, 0);
}

/* =================================================================
   이벤트
================================================================= */
const actions = {
  'go-tab': (el) => goTab(el.dataset.tab),
  'go-month': (el) => { Object.assign(ui.st, { period: 'month', year: Number(el.dataset.y), month: Number(el.dataset.m), limit: 60 }); goTab('stats', true); },
  'pick-date': () => {
    const input = document.getElementById('rec-date');
    try { input.showPicker(); } catch { input.focus(); input.click(); }
  },
  'clear-amount': () => { setAmount(0); document.getElementById('amount')?.focus(); },
  'add-amount': (el) => setAmount(ui.rec.amount + Number(el.dataset.n)),
  'save-cat': (el) => saveWithCategory(el.dataset.id, el),
  'edit-entry': (el) => {
    const e = store.state.entries.find((x) => x.id === el.dataset.id);
    if (!e) return;
    ui.sheet = { type: 'entry', id: e.id, amount: e.amount, categoryId: e.categoryId, date: e.date, memo: e.memo ?? '' };
    render();
  },
  'new-category': () => {
    ui.sheet = { type: 'category', id: null, name: '', ctype: 'expense', color: PALETTE[store.state.categories.length % PALETTE.length], icon: 'etc', iconAuto: true };
    render(); setTimeout(() => document.getElementById('sh-name')?.focus(), 50);
  },
  'edit-category': (el) => {
    const c = store.catMap.get(el.dataset.id);
    if (!c) return;
    ui.sheet = { type: 'category', id: c.id, name: c.name, ctype: c.type, color: c.color, hidden: c.hidden, icon: catIcon(c), iconAuto: false };
    render();
  },
  'cat-move': (el) => store.moveCategory(el.dataset.id, Number(el.dataset.d)),
  'widget-guide': () => openPopup('widget'),
  report: () => { if (ui.st.period === 'month' || ui.st.period === 'year') openPopup('report', { p: { ...ui.st } }); },
  'toggle-today': () => { ui.recOpen = !ui.recOpen; render(); },
  'sh-add': (el) => {
    const sh = ui.sheet;
    sh.amount = Math.min(MAX_AMOUNT, (sh.amount || 0) + Number(el.dataset.n));
    const inp = document.getElementById('sh-amount'); if (inp) inp.value = comma(sh.amount);
  },

  // 달력
  'cal-view': (el) => { ui.cal.view = el.dataset.v; if ((ui.cal.view === 'day' || ui.cal.view === 'week') && ui.cal.mode === 'total') ui.cal.mode = 'item'; render(); },
  'cal-mode': (el) => { ui.cal.mode = el.dataset.v; if (ui.cal.mode !== 'category') ui.cal.filterCats.clear(); render(); },
  'cal-fcat': (el) => { const v = el.dataset.v, f = ui.cal.filterCats; if (!v) f.clear(); else if (f.has(v)) f.delete(v); else f.add(v); render(); },
  'cal-shift': (el) => {
    const d = Number(el.dataset.d), c = ui.cal, dt = parseYmd(c.date);
    if (c.view === 'day') c.date = addDays(c.date, d);
    else if (c.view === 'week') c.date = addDays(c.date, d * 7);
    else if (c.view === 'month') { const n = new Date(dt.getFullYear(), dt.getMonth() + d, 1); c.date = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-01`; }
    else c.date = `${dt.getFullYear() + d}-01-01`;
    render();
  },
  'cal-today': () => { ui.cal.date = todayStr(); render(); },
  'cal-open': (el) => { ui.cal.view = el.dataset.view; ui.cal.date = el.dataset.date; if (ui.cal.view !== 'month' && ui.cal.mode === 'total') ui.cal.mode = 'item'; render(); window.scrollTo(0, 0); },

  // 통계
  drawer: () => { ui.drawer = true; render(); },
  'close-overlay': () => closeOverlay(),
  period: (el) => { ui.st.limit = 60; setStatsPeriod(el.dataset.v); ui.st.anim = true; render(); },
  shift: (el) => {
    const d = Number(el.dataset.d);
    const p = ui.st;
    if (p.period === 'day') p.date = minDate(addDays(p.date, d));
    else if (p.period === 'week') p.date = minDate(addDays(p.date, d * 7));
    else if (p.period === 'year') p.year += d;
    else { let m = p.month + d, y = p.year; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } p.month = m; p.year = y; }
    p.anim = true;
    render();
  },
  drill: (el) => {
    const raw = el.dataset.key, k = Number(raw);
    if (ui.st.period === 'week') { ui.st.period = 'day'; ui.st.date = raw; }
    else if (ui.st.period === 'month') { ui.st.period = 'day'; ui.st.date = `${ui.st.year}-${pad(ui.st.month)}-${pad(k)}`; }
    else if (ui.st.period === 'year') { ui.st.period = 'month'; ui.st.month = k; }
    else if (ui.st.period === 'all') { ui.st.period = 'year'; ui.st.year = k; }
    ui.st.anim = true;
    render(); window.scrollTo(0, 0);
  },
  jump: (el) => {
    const { y, m } = el.dataset;
    if (!y) ui.st.period = 'all';
    else if (!m) { ui.st.period = 'year'; ui.st.year = Number(y); }
    else { ui.st.period = 'month'; ui.st.year = Number(y); ui.st.month = Number(m); }
    ui.st.date = minDate(`${ui.st.year}-${pad(ui.st.month)}-01`);
    ui.st.anim = true;
    ui.drawer = false; render(); window.scrollTo(0, 0);
  },
  sort: (el) => { ui.st.limit = 60; ui.st.sort = el.dataset.v; render(); },
  'dir-toggle': () => { ui.st.limit = 60; ui.st.dir = ui.st.dir === 'desc' ? 'asc' : 'desc'; render(); },
  group: (el) => {
    ui.st.limit = 60; ui.st.group = el.dataset.v;
    if (ui.st.group !== 'category') ui.st.filterCats.clear(); // 카테고리 고르기는 카테고리별 보기에서만
    render();
  },
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
    if (!sh.amount) { sh.error = '금액을 입력해 주세요.'; render(); shake(document.querySelector('.sheet .amount-field')); return; }
    store.updateEntry(sh.id, { amount: sh.amount, categoryId: sh.categoryId, date: sh.date || todayStr(), memo: sh.memo.trim() });
    ui.sheet = null; render(); showToast('기록을 고쳤어요');
  },
  'sh-delete': () => {
    const e = store.state.entries.find((x) => x.id === ui.sheet?.id);
    if (e) openPopup('delete', { entry: e });
  },

  // 카테고리 시트
  'sh-type': (el) => { ui.sheet.ctype = el.dataset.v; if (ui.sheet.iconAuto) ui.sheet.icon = guessIcon(ui.sheet.name, ui.sheet.ctype); render(); },
  'sh-color': (el) => { ui.sheet.color = el.dataset.v; render(); },
  'sh-icon': (el) => { ui.sheet.icon = el.dataset.v; ui.sheet.iconAuto = false; render(); },
  'sh-save-category': () => {
    const sh = ui.sheet;
    const name = sh.name.trim();
    if (!name) { sh.error = '이름을 입력해 주세요.'; render(); return; }
    if (store.state.categories.some((c) => c.name === name && c.id !== sh.id)) { sh.error = '같은 이름의 카테고리가 있어요.'; render(); return; }
    if (sh.id) store.updateCategory(sh.id, { name, type: sh.ctype, color: sh.color, icon: sh.icon });
    else store.addCategory({ name, type: sh.ctype, color: sh.color, icon: sh.icon });
    ui.sheet = null; render(); showToast(sh.id ? '카테고리를 고쳤어요' : `‘${name}’ 카테고리를 만들었어요`);
  },
  'sh-hide': () => {
    const sh = ui.sheet;
    store.updateCategory(sh.id, { hidden: !sh.hidden });
    ui.sheet = null; render(); showToast(sh.hidden ? '다시 보이게 했어요' : '숨겼어요. 통계에는 남아 있어요');
  },
  'sh-cat-delete': () => {
    const sh = ui.sheet;
    if (!sh.confirmDelete) { sh.confirmDelete = true; render(); return; }
    store.deleteCategory(sh.id);
    ui.sheet = null; render(); showToast('카테고리를 삭제했어요', null, 'trash');
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
      render();
      openPopup('sync');
      return;
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
  signout: async () => { await store.signOut(); render(); showToast('로그아웃했어요. 이 기기에서만 기록돼요', null, 'user'); },

  export: () => exportCsv(),
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
  if (import.meta.env.MODE === 'preview') { showToast('미리보기에서는 내보내기를 쓸 수 없어요. 앱에서 써 주세요', null, 'alert'); return; }
  const catMap = store.catMap;
  const rows = [['날짜', '카테고리', '종류', '금액', '메모']];
  store.state.entries.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => {
    const c = catMap.get(e.categoryId);
    rows.push([e.date, c?.name ?? '', c?.type === 'income' ? '수입' : '지출', e.amount, e.memo ?? '']);
  });
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  saveTextFile(`땡그랑_${todayStr()}.csv`, csv)
    .then(() => showToast(`${rows.length - 1}건을 내보냈어요`, null, 'export'))
    .catch(() => showToast('내보내지 못했어요. 다시 시도해 주세요', null, 'alert'));
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.closest('#layer')) return;
  if (el.getAttribute('aria-disabled') === 'true') {
    if (el.dataset.act === 'cal-mode') showToast('합계별은 월별·연별 달력에서 볼 수 있어요', null, 'calendar');
    return;
  }
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
    case 'rec-date': if (el.value) { ui.rec.date = el.value > todayStr() ? todayStr() : el.value; render(); } break;
    case 'sh-amount': {
      ui.sheet.amount = digitsToInt(el.value);
      el.value = ui.sheet.amount ? comma(ui.sheet.amount) : '';
      break;
    }
    case 'sh-date': ui.sheet.date = el.value; break;
    case 'sh-memo': ui.sheet.memo = el.value; break;
    case 'sh-name': {
      ui.sheet.name = el.value;
      if (ui.sheet.iconAuto) {
        const g = guessIcon(el.value, ui.sheet.ctype);
        if (g !== ui.sheet.icon) {
          ui.sheet.icon = g;
          document.querySelectorAll('.icon-pick').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === g)));
        }
      }
      break;
    }
    case 'sh-email': ui.sheet.email = el.value; break;
    case 'sh-pw': ui.sheet.pw = el.value; break;
  }
});

const typing = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && closeOverlay()) { ev.preventDefault(); return; }
  if (popupState) {
    if (ev.key === 'Enter' && !ev.target.closest?.('.popup-actions')) { ev.preventDefault(); popupState.el.querySelector('.popup-actions .btn:last-child')?.click(); }
    return;
  }
  if (ev.key === 'Enter' && ev.target.id === 'sh-pw') { ev.preventDefault(); actions['auth-submit'](); return; }
  if (ev.key === 'Enter' && ev.target.id === 'sh-name') { ev.preventDefault(); actions['sh-save-category'](); return; }
  if (ev.key === 'Enter' && ui.sheet?.type === 'entry' && typing(ev.target) && ev.target.type !== 'date') { ev.preventDefault(); actions['sh-save-entry'](); return; }
  if (ui.tab !== 'record' || ui.sheet || ui.drawer) return;
  // Alt+숫자: 그 순서의 카테고리로 바로 저장
  if (ev.altKey && /^[1-9]$/.test(ev.key)) {
    const c = store.sortedCategories.filter((x) => !x.hidden)[Number(ev.key) - 1];
    if (c) { ev.preventDefault(); saveWithCategory(c.id, document.querySelector(`.cat-btn[data-id="${c.id}"]`)); }
    return;
  }
  // PC: 아무 칸도 고르지 않았을 때 숫자를 누르면 바로 금액으로
  if (!typing(ev.target) && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    if (/^[0-9]$/.test(ev.key)) { ev.preventDefault(); setAmount(ui.rec.amount * 10 + Number(ev.key)); document.getElementById('amount')?.focus(); }
    else if (ev.key === 'Backspace' && ui.rec.amount) { ev.preventDefault(); setAmount(Math.floor(ui.rec.amount / 10)); }
  }
});

/* =================================================================
   기록 날짜 하루씩 옮기기 (세로 스와이프)
================================================================= */
function shiftRecordDate(d) {
  const next = addDays(ui.rec.date, d);
  const screen = () => document.querySelector('#app .screen');
  if (next > todayStr()) {
    anim(screen(), [{ transform: 'translateY(-14px)' }, { transform: 'none' }], { duration: 360, easing: EASE.bouncy, kind: 'none' });
    showToast('오늘보다 뒤 날짜는 고를 수 없어요', null, 'calendar');
    return;
  }
  ui.rec.date = next;
  render();
  navigator.vibrate?.(8);
  const from = d > 0 ? 36 : -36; // 다음 날은 아래에서, 전날은 위에서 들어온다
  anim(screen(), [{ transform: `translateY(${from}px)`, opacity: 0.35 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: EASE.bouncy, kind: 'none' });
  anim(document.querySelector('.date-text'), [{ transform: `translateY(${from / 2.4}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: EASE.bouncy, kind: 'none' });
}

/* =================================================================
   키보드가 올라오면 화면 전체를 위로 (금액·메모 칸이 가려지지 않게)
================================================================= */
const root = document.documentElement;
let baseH = innerHeight, kbOverlay = 0;
function updateKeyboard() {
  const a = document.activeElement;
  if (!typing(a)) baseH = Math.max(baseH, innerHeight);
  const resized = baseH - innerHeight > 120;                       // 창 자체가 줄어든 경우
  const vv = window.visualViewport;
  const vvGap = vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0; // 창 위에 겹친 경우
  const overlay = Math.max(kbOverlay, vvGap > 120 ? vvGap : 0);
  const open = typing(a) && (resized || overlay > 0);
  root.classList.toggle('kb-open', open);
  root.style.setProperty('--kb', `${open && !resized ? overlay : 0}px`);
  if (open) requestAnimationFrame(() => a.scrollIntoView({ block: a.id === 'memo' || a.id === 'amount' ? 'end' : 'center', behavior: reduced() ? 'auto' : 'smooth' }));
}
addEventListener('resize', updateKeyboard);
window.visualViewport?.addEventListener('resize', updateKeyboard);
document.addEventListener('focusin', () => setTimeout(updateKeyboard, 250));
document.addEventListener('focusout', () => setTimeout(updateKeyboard, 100));
if (platform === 'android' || platform === 'ios') {
  import('@capacitor/keyboard').then(({ Keyboard }) => {
    Keyboard.addListener('keyboardWillShow', (i) => { kbOverlay = i.keyboardHeight || 0; setTimeout(updateKeyboard, 50); });
    Keyboard.addListener('keyboardWillHide', () => { kbOverlay = 0; updateKeyboard(); });
  }).catch(() => { /* 플러그인 없음 */ });
}

/* =================================================================
   시작
================================================================= */
initGestures({
  enabled: () => !ui.sheet && !ui.drawer && !popupState && !wide(),
  tab: () => ui.tab,
  tabs: TABS.map(([id]) => id),
  renderTab: (t) => renderTab(t),
  onTab: (t) => goTab(t),
  onDateShift: (d) => shiftRecordDate(d),
});
mqWide.addEventListener?.('change', () => { ui.drawer = false; render(); });
mqXWide.addEventListener?.('change', () => render());

let authSeen = store.state.authReady;
store.subscribe(() => {
  render(); syncWidget(store);
  if (!authSeen && store.state.authReady) { authSeen = true; pullWidget(); }
  maybeMonthlyReport();
});
render();
store.initCloud().then(() => syncWidget(store));
syncWidget(store);

const pullWidget = async () => {
  if (!store.state.authReady) return; // 로그인 상태를 확인한 뒤에 가져온다
  const n = await importWidgetEntries(store);
  if (n) showToast(`위젯에서 남긴 기록 ${n}건을 가져왔어요`, null, 'widget');
  if (ui.rec.date < todayStr() && !ui.rec.amount) { ui.rec.date = todayStr(); render(); }
};
pullWidget();
maybeMonthlyReport();
onResume(pullWidget);
onBackButton(() => {
  if (closeOverlay()) return true;
  if (ui.tab !== 'record') { goTab('record'); return true; }
  return false;
});
