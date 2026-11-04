// 2D 아이콘: 탐색·조작용. 탭 바는 채움형, 그 외 컨트롤은 선형(2px).
const line = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const solid = (d) => `<svg viewBox="0 0 28 28" fill="currentColor" aria-hidden="true">${d}</svg>`;

export const icons = {
  // 탭 바 (채움형)
  tabRecord: solid('<path fill-rule="evenodd" d="M14 2.5C7.65 2.5 2.5 7.65 2.5 14S7.65 25.5 14 25.5 25.5 20.35 25.5 14 20.35 2.5 14 2.5Zm1.4 6.6a1.4 1.4 0 1 0-2.8 0v3.5H9.1a1.4 1.4 0 1 0 0 2.8h3.5v3.5a1.4 1.4 0 1 0 2.8 0v-3.5h3.5a1.4 1.4 0 1 0 0-2.8h-3.5V9.1Z"/>'),
  tabCalendar: solid('<path fill-rule="evenodd" d="M9 2.5a1.5 1.5 0 0 1 1.5 1.5v1h7V4a1.5 1.5 0 0 1 3 0v1h.5A4.5 4.5 0 0 1 25.5 9.5v12A4.5 4.5 0 0 1 21 26H7a4.5 4.5 0 0 1-4.5-4.5v-12A4.5 4.5 0 0 1 7 5h.5V4A1.5 1.5 0 0 1 9 2.5ZM5.5 12v9.5A1.5 1.5 0 0 0 7 23h14a1.5 1.5 0 0 0 1.5-1.5V12h-17Zm3 2.5h3v3h-3v-3Zm5 0h3v3h-3v-3Z"/>'),
  tabStats: solid('<rect x="3.5" y="13" width="5.5" height="11.5" rx="2"/><rect x="11.25" y="4" width="5.5" height="20.5" rx="2"/><rect x="19" y="9" width="5.5" height="15.5" rx="2"/>'),
  tabMy: solid('<circle cx="14" cy="9" r="5.5"/><path d="M3.5 23.2c0-4.3 4.7-7.7 10.5-7.7s10.5 3.4 10.5 7.7c0 .99-.8 1.8-1.8 1.8H5.3c-1 0-1.8-.81-1.8-1.8Z"/>'),

  // 컨트롤 (선형)
  menu: line('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  left: line('<path d="m15 18-6-6 6-6"/>'),
  right: line('<path d="m9 18 6-6-6-6"/>'),
  down: line('<path d="m6 9 6 6 6-6"/>'),
  close: line('<path d="M18 6 6 18M6 6l12 12"/>'),
  clear: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m15 9-6 6m0-6 6 6" stroke="var(--canvas)" stroke-width="2" stroke-linecap="round"/></svg>`,
  sortDesc: line('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  sortAsc: line('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  updown: line('<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>'),
  up: line('<path d="m6 15 6-6 6 6"/>'),
  plus: line('<path d="M12 5v14M5 12h14"/>'),
  edit: line('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  eye: line('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: line('<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.6 6.6A18.4 18.4 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>'),
  download: line('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>'),
  widget: line('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
  logout: line('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>'),
};

export function orb(size = 40, label = '') {
  const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<span class="orb" style="width:${size}px;height:${size}px" ${aria}></span>`;
}
