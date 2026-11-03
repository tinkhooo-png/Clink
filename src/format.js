export const MAX_AMOUNT = 999_999_999_999;

export const comma = (n) => Number(n || 0).toLocaleString('ko-KR');
export const won = (n) => `${comma(n)}원`;
export const pad = (n) => String(n).padStart(2, '0');

export function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const todayStr = () => ymd(new Date());
export function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
// 주는 월요일에 시작한다.
export function weekStart(s) {
  const d = parseYmd(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ymd(d);
}
const WD = '일월화수목금토';
export function dateLabel(s, withYear = false) {
  const d = parseYmd(s);
  const y = withYear ? `${d.getFullYear()}년 ` : '';
  return `${y}${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`;
}
export function shortDate(s) {
  const d = parseYmd(s);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}
export function relLabel(s) {
  const t = todayStr();
  if (s === t) return '오늘';
  if (s === addDays(t, -1)) return '어제';
  const sameYear = s.slice(0, 4) === t.slice(0, 4);
  return dateLabel(s, !sameYear);
}
export function weekLabel(start) {
  const end = addDays(start, 6);
  return `${shortDate(start)} – ${shortDate(end)}`;
}

/** 입력 문자열에서 숫자만 남겨 정수로. */
export function digitsToInt(str) {
  const digits = String(str).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return 0;
  return Math.min(Number(digits.slice(0, 13)), MAX_AMOUNT);
}

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`).replace(/-/g, '');

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
