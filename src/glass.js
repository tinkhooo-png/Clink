/**
 * 반투명 글래스 아이콘과 팝업 일러스트.
 * 꽉 찬 주황 도형(back) 위에 반투명 유리 도형(front)을 겹치고,
 * 겹친 부분에는 뒤 도형을 흐리게 비춰 유리처럼 보이게 한다.
 */
export const ICONS = {
  fuel: { label: '주유', back: "<rect x='7' y='9' width='20' height='31' rx='4'/><rect x='5' y='37' width='24' height='5' rx='2.5'/>", front: "<path d='M31 13C31 13 41 24.5 41 30.5A10 10 0 0 1 21 30.5C21 24.5 31 13 31 13Z'/>" },
  meal: { label: '식사', back: "<path d='M5 25H43A19 16 0 0 1 5 25Z'/><rect x='17' y='38' width='14' height='5' rx='2.5'/>", front: "<circle cx='24' cy='22' r='13'/>" },
  cafe: { label: '카페', back: "<path d='M10 16H34L31 40.5A2 2 0 0 1 29 42H15A2 2 0 0 1 13 40.5Z'/>", front: "<rect x='6' y='9' width='32' height='10' rx='5'/>" },
  transport: { label: '교통', back: "<rect x='6' y='7' width='30' height='30' rx='7'/><circle cx='13' cy='40' r='3.5'/><circle cx='29' cy='40' r='3.5'/>", front: "<rect x='13' y='14' width='30' height='13' rx='4'/>" },
  shopping: { label: '쇼핑', back: "<rect x='7' y='18' width='34' height='25' rx='6'/>", front: "<path d='M24 5A9 9 0 0 1 33 14V27H28V14A4 4 0 0 0 20 14V27H15V14A9 9 0 0 1 24 5Z'/>" },
  home: { label: '생활', back: "<path d='M21.6 6.9A4 4 0 0 1 26.4 6.9L43 19.5A1.5 1.5 0 0 1 42 22H6A1.5 1.5 0 0 1 5 19.5Z'/>", front: "<rect x='10' y='17' width='28' height='25' rx='4'/>" },
  etc: { label: '기타', back: "<circle cx='18' cy='18' r='12'/>", front: "<rect x='16' y='16' width='26' height='26' rx='8'/>" },
  income: { label: '수입', back: "<circle cx='18' cy='19' r='13'/>", front: "<circle cx='30' cy='29' r='13'/>" },
  check: { label: '완료', back: "<circle cx='21' cy='25' r='16'/>", front: "<path d='M11.5 24.5L16.5 19.5L21.5 24.5L35 10.5L40 15.5L21.5 34.5Z'/>" },
  receipt: { label: '영수증', back: "<path d='M9 5H33V42L29 39L25 42L21 39L17 42L13 39L9 42Z'/>", front: "<circle cx='33' cy='32' r='10'/>" },
  chart: { label: '통계', back: "<path d='M4 33L16 21L23 28L35 15L39.5 19.5L23 36L16 29L8.5 37.5Z'/>", front: "<rect x='14' y='8' width='28' height='33' rx='5'/>" },
  wallet: { label: '지갑', back: "<rect x='12' y='6' width='26' height='18' rx='4'/>", front: "<rect x='6' y='15' width='36' height='27' rx='6'/>" },
  cloud: { label: '동기화', back: "<circle cx='31' cy='17' r='11'/>", front: "<path d='M14 40H34A8 8 0 0 0 33.5 24A11 11 0 0 0 12.5 27.2A6.5 6.5 0 0 0 14 40Z'/>" },
  widget: { label: '위젯', back: "<rect x='5' y='5' width='17' height='17' rx='4.5'/><rect x='26' y='26' width='17' height='17' rx='4.5'/>", front: "<rect x='14' y='14' width='20' height='20' rx='5.5'/>" },
  export: { label: '내보내기', back: "<rect x='7' y='5' width='23' height='31' rx='4'/>", front: "<path d='M20 12H33L41 20V39A4 4 0 0 1 37 43H20A4 4 0 0 1 16 39V16A4 4 0 0 1 20 12Z'/>" },
  alert: { label: '알림', back: "<circle cx='24' cy='24' r='17'/>", front: "<rect x='20.5' y='9' width='7' height='20' rx='3.5'/><circle cx='24' cy='35.5' r='4'/>" },
  trash: { label: '삭제', back: "<path d='M11 17H37L34.2 40.4A2 2 0 0 1 32.2 42H15.8A2 2 0 0 1 13.8 40.4Z'/>", front: "<rect x='6' y='10' width='36' height='9' rx='4.5'/><rect x='18' y='5' width='12' height='7' rx='3.5'/>" },
  calendar: { label: '달력', back: "<rect x='6' y='7' width='36' height='14' rx='5'/><rect x='13' y='3' width='5' height='9' rx='2.5'/><rect x='30' y='3' width='5' height='9' rx='2.5'/>", front: "<rect x='6' y='15' width='36' height='28' rx='6'/>" },
  user: { label: '계정', back: "<path d='M5 43A19 17 0 0 1 43 43Z'/>", front: "<circle cx='24' cy='19' r='11'/>" },
  // 카테고리용 추가 아이콘
  medical: { label: '병원·약', back: "<rect x='6' y='10' width='36' height='30' rx='9'/>", front: "<path d='M19 12H29V20H37V30H29V38H19V30H11V20H19Z'/>" },
  pet: { label: '반려동물', back: "<circle cx='12' cy='19' r='5.5'/><circle cx='24' cy='13' r='5.5'/><circle cx='36' cy='19' r='5.5'/>", front: "<ellipse cx='24' cy='32' rx='13' ry='10.5'/>" },
  gift: { label: '선물', back: "<rect x='9' y='19' width='30' height='24' rx='5'/><rect x='21' y='8' width='6' height='35' rx='3'/>", front: "<rect x='6' y='13' width='36' height='11' rx='4.5'/>" },
  book: { label: '교육·책', back: "<path d='M6 10A2 2 0 0 1 8 8H22A4 4 0 0 1 26 12V42A4 4 0 0 0 22 38H8A2 2 0 0 1 6 36Z'/>", front: "<path d='M42 10A2 2 0 0 0 40 8H28A4 4 0 0 0 23 12V42A4 4 0 0 1 28 38H40A2 2 0 0 0 42 36Z'/>" },
  game: { label: '취미·게임', back: "<path d='M10 16H38A7 7 0 0 1 45 23L43.5 35A5 5 0 0 1 34.6 37.4L31 33H17L13.4 37.4A5 5 0 0 1 4.5 35L3 23A7 7 0 0 1 10 16Z'/>", front: "<circle cx='31' cy='24' r='8'/>" },
  phone: { label: '통신', back: "<rect x='9' y='4' width='22' height='40' rx='6'/>", front: "<rect x='19' y='15' width='24' height='19' rx='9.5'/>" },
  beauty: { label: '미용', back: "<circle cx='24' cy='18' r='13'/>", front: "<rect x='18.5' y='24' width='11' height='20' rx='5.5'/>" },
  travel: { label: '여행', back: "<rect x='15' y='5' width='18' height='14' rx='5'/>", front: "<rect x='6' y='13' width='36' height='30' rx='7'/>" },
  movie: { label: '문화', back: "<path d='M6 14A4 4 0 0 1 10 10H38A4 4 0 0 1 42 14V20A4 4 0 0 0 42 28V34A4 4 0 0 1 38 38H10A4 4 0 0 1 6 34V28A4 4 0 0 0 6 20Z'/>", front: "<path d='M24 13L27.3 19.7L34.6 20.7L29.3 25.9L30.6 33.2L24 29.7L17.4 33.2L18.7 25.9L13.4 20.7L20.7 19.7Z'/>" },
  fitness: { label: '운동', back: "<rect x='3' y='20' width='42' height='8' rx='4'/>", front: "<rect x='7' y='11' width='10' height='26' rx='4'/><rect x='31' y='11' width='10' height='26' rx='4'/>" },
  car: { label: '자동차', back: "<path d='M6 27L11 15.5A4 4 0 0 1 14.7 13H33.3A4 4 0 0 1 37 15.5L42 27V34A3 3 0 0 1 39 37H9A3 3 0 0 1 6 34Z'/>", front: "<circle cx='14.5' cy='37' r='6'/><circle cx='33.5' cy='37' r='6'/>" },
  drink: { label: '술·음료', back: "<path d='M11 7H37L34 25A10 10 0 0 1 14 25Z'/><rect x='21.5' y='30' width='5' height='10' rx='2'/><rect x='14' y='38' width='20' height='5' rx='2.5'/>", front: "<circle cx='32' cy='14' r='9'/>" },
  coins: { label: '저축', back: "<rect x='9' y='27' width='30' height='8' rx='4'/><rect x='9' y='35' width='30' height='8' rx='4'/>", front: "<circle cx='24' cy='17' r='12'/>" },
  clothes: { label: '의류', back: "<path d='M17 6L6 12.5L10.5 22L14.5 20V42H33.5V20L37.5 22L42 12.5L31 6A7 7 0 0 1 17 6Z'/>", front: "<rect x='19' y='21' width='14' height='14' rx='5'/>" },
  baby: { label: '육아', back: "<circle cx='24' cy='27' r='15'/>", front: "<circle cx='14' cy='11' r='7'/><circle cx='34' cy='11' r='7'/>" },
  card: { label: '카드·이체', back: "<rect x='4' y='12' width='34' height='24' rx='5'/>", front: "<rect x='14' y='20' width='30' height='20' rx='5'/>" },
};

/** 카테고리에 고를 수 있는 아이콘 */
export const CATEGORY_ICONS = [
  'meal', 'cafe', 'drink', 'shopping', 'clothes', 'beauty',
  'fuel', 'car', 'transport', 'travel', 'home', 'phone',
  'medical', 'fitness', 'pet', 'baby', 'book', 'game',
  'movie', 'gift', 'card', 'coins', 'income', 'etc',
];

/** 이름으로 아이콘을 짐작한다 (아이콘이 없던 예전 카테고리용). */
export function guessIcon(name = '', type = 'expense') {
  const n = String(name);
  if (type === 'income' || /수입|월급|급여|용돈|이자|환급/.test(n)) return 'income';
  if (/주유|기름|충전/.test(n)) return 'fuel';
  if (/차량|자동차|정비|세차|보험료/.test(n)) return 'car';
  if (/카페|커피|디저트/.test(n)) return 'cafe';
  if (/술|맥주|음료|주류/.test(n)) return 'drink';
  if (/식|밥|점심|저녁|아침|배달|외식|음식|간식/.test(n)) return 'meal';
  if (/교통|버스|지하철|택시|기차|주차|통행/.test(n)) return 'transport';
  if (/여행|숙박|항공|호텔/.test(n)) return 'travel';
  if (/옷|의류|패션|신발/.test(n)) return 'clothes';
  if (/미용|화장|헤어|뷰티/.test(n)) return 'beauty';
  if (/쇼핑|구매|마트|생필품/.test(n)) return 'shopping';
  if (/병원|약|의료|건강/.test(n)) return 'medical';
  if (/운동|헬스|필라테스|요가|스포츠/.test(n)) return 'fitness';
  if (/반려|강아지|고양이|펫/.test(n)) return 'pet';
  if (/육아|아이|아기|유아/.test(n)) return 'baby';
  if (/교육|학원|책|도서|강의/.test(n)) return 'book';
  if (/게임|취미|여가/.test(n)) return 'game';
  if (/영화|공연|문화|구독|넷플/.test(n)) return 'movie';
  if (/선물|경조|축의|부의/.test(n)) return 'gift';
  if (/통신|휴대폰|핸드폰|인터넷/.test(n)) return 'phone';
  if (/카드|이체|송금|대출/.test(n)) return 'card';
  if (/생활|집|월세|관리비|공과금/.test(n)) return 'home';
  if (/저축|적금|투자/.test(n)) return 'coins';
  return 'etc';
}

let uid = 0;
const hexRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '').trim()); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const BRAND = '#ff803d';

/** 글래스 아이콘. color를 주면 그 색으로 물든다(카테고리 색). */
export function glassIcon(key, size = 28, cls = '', color = null) {
  const ic = ICONS[key] ?? ICONS.etc;
  const id = `gi${++uid}`;
  const rgb = color && color.toLowerCase() !== BRAND ? hexRgb(color) : null;
  let defs = '', solid = 'url(#gSolid)', frost = 'url(#gFrost)';
  if (rgb) {
    const W = [255, 255, 255], K = [0, 0, 0];
    defs = `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hex(mix(rgb, W, 0.28))}"/><stop offset="1" stop-color="${hex(mix(rgb, K, 0.12))}"/></linearGradient>`
      + `<linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hex(mix(rgb, W, 0.88))}" stop-opacity=".74"/><stop offset="1" stop-color="${hex(mix(rgb, W, 0.66))}" stop-opacity=".56"/></linearGradient>`;
    solid = `url(#${id}s)`; frost = `url(#${id}f)`;
  }
  return `<svg class="gi ${cls}" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><defs>${defs}<clipPath id="${id}">${ic.front}</clipPath></defs><g fill="${solid}">${ic.back}</g><g clip-path="url(#${id})"><g fill="${solid}" filter="url(#fBlur)">${ic.back}</g></g><g fill="${frost}" stroke="#fff" stroke-opacity=".95" stroke-width=".7">${ic.front}</g></svg>`;
}

/** 문서에 한 번 넣는 공용 그라데이션·필터 */
export const GLASS_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="gSolid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFA15F"/><stop offset="1" stop-color="#F05A1C"/></linearGradient>
<linearGradient id="gFrost" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9DC" stop-opacity=".72"/><stop offset="1" stop-color="#FFC09A" stop-opacity=".55"/></linearGradient>
<linearGradient id="gFrostH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3EB" stop-opacity=".62"/><stop offset="1" stop-color="#FFC7A3" stop-opacity=".42"/></linearGradient>
<linearGradient id="gSide" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F98E4B"/><stop offset=".55" stop-color="#E5641F"/><stop offset="1" stop-color="#C64B10"/></linearGradient>
<linearGradient id="gTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC596"/><stop offset="1" stop-color="#FF8E4A"/></linearGradient>
<linearGradient id="gLeft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9A58"/><stop offset="1" stop-color="#F0712C"/></linearGradient>
<linearGradient id="gRight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7661F"/><stop offset="1" stop-color="#C64B10"/></linearGradient>
<filter id="fBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs></svg>`;

/* ---------------- 팝업 일러스트 (아이소메트릭 글래스, 160 박스) ---------------- */
const P = (x, y, z) => [80 + (x - y) * 0.866, 112 + (x + y) * 0.5 - z];
const pts = (a) => a.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
const pth = (a) => `M${a.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z`;
function box(x0, y0, w, d, z0, h, dx = 0) {
  const x1 = x0 + w, y1 = y0 + d, z1 = z0 + h;
  const Q = (x, y, z) => { const p = P(x, y, z); return [p[0] + dx, p[1]]; };
  return {
    top: [Q(x0, y0, z1), Q(x1, y0, z1), Q(x1, y1, z1), Q(x0, y1, z1)],
    right: [Q(x1, y0, z0), Q(x1, y1, z0), Q(x1, y1, z1), Q(x1, y0, z1)],
    left: [Q(x0, y1, z0), Q(x1, y1, z0), Q(x1, y1, z1), Q(x0, y1, z1)],
    sil: [Q(x0, y0, z1), Q(x1, y0, z1), Q(x1, y0, z0), Q(x1, y1, z0), Q(x0, y1, z0), Q(x0, y1, z1)],
    Q,
  };
}
const solidBox = (b) => `<polygon points="${pts(b.left)}" fill="url(#gLeft)"/><polygon points="${pts(b.right)}" fill="url(#gRight)"/><polygon points="${pts(b.top)}" fill="url(#gTop)"/>`;
function cyl(cx, cy, r, t) {
  const rx = +(r * 1.2247).toFixed(2), ry = +(r * 0.7071).toFixed(2);
  return {
    cx, cy, rx, ry, t,
    sil: `M${cx - rx} ${cy}A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}V${cy + t}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy + t}Z`,
    side: `M${cx - rx} ${cy}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}V${cy + t}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy + t}Z`,
    ell: (k = 1) => `<ellipse cx="${cx}" cy="${cy}" rx="${(rx * k).toFixed(1)}" ry="${(ry * k).toFixed(1)}"/>`,
  };
}
const solidCoin = (c, ring = true) => `<path d="${c.side}" fill="url(#gSide)"/><g fill="url(#gTop)">${c.ell()}</g>${ring ? `<g fill="none" stroke="#E2561C" stroke-opacity=".45" stroke-width="1.4">${c.ell(0.66)}</g>` : ''}`;
const glass = (d, inner = '', style = '', cls = '') =>
  `<div class="gl ${cls}" style="clip-path:path('${d}');${style}"><svg viewBox="0 0 160 160"><path d="${d}" fill="url(#gFrostH)" stroke="#fff" stroke-opacity=".95" stroke-width="1.8"/>${inner}</svg></div>`;
const star = (x, y, s) => `<path class="sp" d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z" fill="url(#gSolid)"/>`;
const BARS = [{ x: -30, h: 26 }, { x: -8, h: 42 }, { x: 14, h: 62 }];

export const HERO = {
  first() {
    const c1 = cyl(80, 108, 34, 10), c2 = cyl(82, 97, 34, 10), c3 = cyl(78, 84, 34, 10);
    const inner = `<g fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.2">${c3.ell()}</g><g fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2">${c3.ell(0.66)}</g>`;
    return `<svg class="ly" viewBox="0 0 160 160">${solidCoin(c1)}${solidCoin(c2)}</svg>${glass(c3.sil, inner, '', 'coin')}<svg class="ly" viewBox="0 0 160 160">${star(34, 46, 8)}${star(128, 56, 6)}${star(116, 26, 9)}</svg>`;
  },
  delete() {
    const body = cyl(80, 72, 26, 50), lid = cyl(80, 60, 30, 6), knob = cyl(80, 52, 8, 6);
    const inner = `<g fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.2">${lid.ell()}${knob.ell()}</g>`;
    const ox = (80 + lid.rx).toFixed(1), oy = lid.cy + lid.t;
    return `<svg class="ly" viewBox="0 0 160 160">${solidCoin(body, false)}<ellipse cx="80" cy="72" rx="${(body.rx * 0.86).toFixed(1)}" ry="${(body.ry * 0.86).toFixed(1)}" fill="#B8430C"/><g fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2"><path d="M66 100v26M80 103v28M94 100v26"/></g></svg>${glass(lid.sil + knob.sil, inner, `transform-origin:${ox}px ${oy}px`, 'lid')}`;
  },
  sync() {
    const plat = box(-30, -30, 60, 60, 0, 8);
    const cloud = 'M50 82H110A15 15 0 0 0 109.5 52A23 23 0 0 0 66 57A13 13 0 0 0 50 82Z';
    return `<svg class="ly" viewBox="0 0 160 160">${solidBox(plat)}<ellipse cx="80" cy="104" rx="30" ry="11" fill="#B8430C" opacity=".28"/><circle cx="104" cy="44" r="20" fill="url(#gSolid)"/></svg>
      <div class="cloud" style="position:absolute;inset:0">${glass(cloud, '')}</div>
      <svg class="ly badge" viewBox="0 0 160 160" style="transform-origin:116px 86px"><circle cx="116" cy="86" r="14" fill="url(#gSolid)" stroke="var(--canvas)" stroke-width="3"/><path d="M109.5 86l4.5 4.5 8.5-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  },
  report() {
    const card = box(-46, 8, 58, 4, 2, 42, -8);
    const Q = card.Q;
    const ln = (z, x2) => `M${pts([Q(-40, 12, z)]).replace(',', ' ')}L${pts([Q(x2, 12, z)]).replace(',', ' ')}`;
    const inner = `<polygon points="${pts(card.left)}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1"/><path d="${ln(34, -10)} ${ln(26, 4)} ${ln(18, -18)}" stroke="#fff" stroke-opacity=".9" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    return `<svg class="ly bars" viewBox="0 0 160 160">${BARS.map((b, i) => `<g data-bar="${i}">${solidBox(box(b.x, -30, 16, 16, 0, b.h, -8))}</g>`).join('')}</svg>${glass(pth(card.sil), inner, '', 'card')}`;
  },
  widget() {
    const t1 = box(-25, -25, 50, 50, 0, 8), t2 = box(-25, -25, 50, 50, 16, 8), t3 = box(-25, -25, 50, 50, 32, 8);
    const Q = t3.Q;
    const sq = (x, y) => `<polygon points="${pts([Q(x, y, 40), Q(x + 16, y, 40), Q(x + 16, y + 16, 40), Q(x, y + 16, 40)])}"/>`;
    const inner = `<polygon points="${pts(t3.top)}" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.1"/><g fill="#fff" fill-opacity=".55">${sq(-19, -19)}${sq(3, -19)}${sq(-19, 3)}</g>`;
    return `<svg class="ly t1" viewBox="0 0 160 160">${solidBox(t1)}</svg><svg class="ly t2" viewBox="0 0 160 160">${solidBox(t2)}</svg>${glass(pth(t3.sil), inner, '', 't3')}`;
  },
};

/** 막대 높이를 다시 그린다(리포트 일러스트 성장 모션용) */
export function drawReportBar(svg, i, h) {
  const g = svg.querySelector(`[data-bar="${i}"]`);
  if (g) g.innerHTML = h < 0.5 ? '' : solidBox(box(BARS[i].x, -30, 16, 16, 0, h, -8));
}
export const REPORT_BARS = BARS;
