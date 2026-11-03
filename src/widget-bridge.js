// 안드로이드 홈 화면 위젯과 앱 사이 다리. 다른 플랫폼에서는 아무 일도 하지 않는다.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { todayStr } from './format.js';

const isAndroid = Capacitor.getPlatform() === 'android';
const Native = isAndroid ? registerPlugin('LedgerWidget') : null;

export const widgetSupported = isAndroid;
export const WIDGET_SLOTS = 6;

let timer = null;
/** 카테고리·이번 달 요약·세션을 위젯에 전달한다(짧게 모아서). */
export function syncWidget(store) {
  if (!Native) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const s = store.state;
    const catMap = store.catMap;
    const today = todayStr();
    const month = today.slice(0, 7);
    let monthExpense = 0, todayExpense = 0, monthIncome = 0;
    for (const e of s.entries) {
      if (!e.date.startsWith(month)) continue;
      const income = catMap.get(e.categoryId)?.type === 'income';
      if (income) monthIncome += e.amount;
      else { monthExpense += e.amount; if (e.date === today) todayExpense += e.amount; }
    }
    const categories = store.sortedCategories
      .filter((c) => !c.hidden)
      .slice(0, WIDGET_SLOTS)
      .map(({ id, name, type, color }) => ({ id, name, type, color }));
    Native.sync({
      categories,
      summary: { month, today, monthExpense, todayExpense, monthIncome },
      session: s.mode === 'cloud' ? store.widgetSession() : null,
    }).catch(() => {});
  }, 300);
}

/** 위젯에서 저장했지만 아직 올라가지 않은 기록을 앱으로 가져온다. */
export async function importWidgetEntries(store) {
  if (!Native) return 0;
  try {
    const { entries = [] } = await Native.takePending();
    for (const e of entries) {
      store.addEntry({ ...e, source: 'widget' });
    }
    return entries.length;
  } catch { return 0; }
}
