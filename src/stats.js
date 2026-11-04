import { pad, weekStart, addDays } from './format.js';

export function periodPrefix(p) {
  if (p.period === 'all') return '';
  if (p.period === 'day') return p.date;
  if (p.period === 'year') return String(p.year);
  return `${p.year}-${pad(p.month)}`;
}
export const inPeriod = (entries, p) => {
  if (p.period === 'week') { const ws = weekStart(p.date); return entries.filter((e) => weekStart(e.date) === ws); }
  const pre = periodPrefix(p);
  return pre ? entries.filter((e) => e.date.startsWith(pre)) : entries.slice();
};

export function previousPeriod(p) {
  if (p.period === 'day') return { ...p, date: addDays(p.date, -1) };
  if (p.period === 'week') return { ...p, date: addDays(p.date, -7) };
  if (p.period === 'month') {
    return p.month === 1 ? { ...p, year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 };
  }
  if (p.period === 'year') return { ...p, year: p.year - 1 };
  return null;
}

export const isIncome = (catMap, e) => catMap.get(e.categoryId)?.type === 'income';

export function summarize(entries, catMap) {
  let expense = 0, income = 0, expenseCount = 0, incomeCount = 0;
  for (const e of entries) {
    if (isIncome(catMap, e)) { income += e.amount; incomeCount++; }
    else { expense += e.amount; expenseCount++; }
  }
  return { expense, income, expenseCount, incomeCount, count: entries.length };
}

/** 카테고리별 합계. 지출·수입을 각각 비율로 계산한다. */
export function byCategory(entries, categories, catMap) {
  const sums = new Map();
  for (const e of entries) {
    const s = sums.get(e.categoryId) ?? { sum: 0, count: 0 };
    s.sum += e.amount; s.count++;
    sums.set(e.categoryId, s);
  }
  const tot = summarize(entries, catMap);
  const rows = [];
  for (const [id, s] of sums) {
    const cat = catMap.get(id) ?? { id, name: '삭제된 카테고리', color: '#8b95a1', type: 'expense' };
    const base = cat.type === 'income' ? tot.income : tot.expense;
    rows.push({ cat, ...s, pct: base ? (s.sum / base) * 100 : 0 });
  }
  rows.sort((a, b) => (a.cat.type === b.cat.type ? b.sum - a.sum : a.cat.type === 'income' ? 1 : -1));
  return rows;
}

/** 추이 막대: 월별=일, 연별=월, 전체=연. 지출 기준. */
export function trend(entries, p, catMap) {
  const exp = entries.filter((e) => !isIncome(catMap, e));
  if (p.period === 'day') {
    // 시간대별 (기록한 시각 기준)
    const buckets = Array.from({ length: 24 }, (_, i) => ({ key: i, label: String(i), sum: 0 }));
    for (const e of exp) buckets[e.createdAt ? new Date(e.createdAt).getHours() : 0].sum += e.amount;
    return buckets;
  }
  if (p.period === 'week') {
    const ws = weekStart(p.date);
    const buckets = Array.from({ length: 7 }, (_, i) => ({ key: addDays(ws, i), label: '월화수목금토일'[i], sum: 0 }));
    for (const e of exp) { const b = buckets.find((x) => x.key === e.date); if (b) b.sum += e.amount; }
    return buckets;
  }
  if (p.period === 'month') {
    const days = new Date(p.year, p.month, 0).getDate();
    const buckets = Array.from({ length: days }, (_, i) => ({ key: i + 1, label: String(i + 1), sum: 0 }));
    for (const e of exp) buckets[Number(e.date.slice(8, 10)) - 1].sum += e.amount;
    return buckets;
  }
  if (p.period === 'year') {
    const buckets = Array.from({ length: 12 }, (_, i) => ({ key: i + 1, label: String(i + 1), sum: 0 }));
    for (const e of exp) buckets[Number(e.date.slice(5, 7)) - 1].sum += e.amount;
    return buckets;
  }
  const years = new Map();
  for (const e of exp) {
    const y = Number(e.date.slice(0, 4));
    years.set(y, (years.get(y) ?? 0) + e.amount);
  }
  const ys = [...years.keys()];
  if (!ys.length) return [];
  const out = [];
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) out.push({ key: y, label: `'${String(y).slice(2)}`, sum: years.get(y) ?? 0 });
  return out;
}

/** 목록: 필터 → 정렬 → 묶기 */
export function buildList(entries, opts, catMap) {
  const { sort, dir, group, filterCats } = opts;
  const list = entries.filter((e) => filterCats.size === 0 || filterCats.has(e.categoryId));
  const sgn = dir === 'asc' ? 1 : -1;
  const byDate = (a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? 0) - (b.createdAt ?? 0);
  const byAmount = (a, b) => a.amount - b.amount || byDate(a, b);
  list.sort((a, b) => sgn * (sort === 'amount' ? byAmount(a, b) : byDate(a, b)));
  if (group === 'item') return [{ key: null, items: list }];

  const keyOf = { day: (e) => e.date, week: (e) => weekStart(e.date), category: (e) => e.categoryId }[group];
  const map = new Map();
  for (const e of list) {
    const k = keyOf(e);
    if (!map.has(k)) map.set(k, { key: k, items: [], expense: 0, income: 0, last: '' });
    const g = map.get(k);
    g.items.push(e);
    if (isIncome(catMap, e)) g.income += e.amount; else g.expense += e.amount;
    if (e.date > g.last) g.last = e.date;
  }
  const groups = [...map.values()];
  groups.sort((a, b) => {
    if (sort === 'amount') return sgn * (a.expense + a.income - (b.expense + b.income));
    const ka = group === 'category' ? a.last : a.key;
    const kb = group === 'category' ? b.last : b.key;
    return sgn * ka.localeCompare(kb);
  });
  return groups;
}

/** 드로어용: 연·월별 지출 합계 */
export function monthIndex(entries, catMap) {
  const idx = new Map(); // year -> Map(month -> sum)
  for (const e of entries) {
    const y = Number(e.date.slice(0, 4)), m = Number(e.date.slice(5, 7));
    if (!idx.has(y)) idx.set(y, new Map());
    const mm = idx.get(y);
    const add = isIncome(catMap, e) ? 0 : e.amount;
    mm.set(m, (mm.get(m) ?? 0) + add);
  }
  return idx;
}
