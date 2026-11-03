import { Capacitor } from '@capacitor/core';

export const platform = Capacitor.getPlatform(); // web | android | ios

/** CSV 파일 저장(PC·웹) 또는 공유 시트(모바일) */
export async function saveTextFile(filename, text) {
  const withBom = '﻿' + text; // 엑셀에서 한글이 깨지지 않도록
  if (platform === 'android' || platform === 'ios') {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const res = await Filesystem.writeFile({ path: filename, data: withBom, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: filename, url: res.uri });
    return;
  }
  const blob = new Blob([withBom], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export async function onBackButton(handler) {
  if (platform !== 'android') return;
  const { App } = await import('@capacitor/app');
  App.addListener('backButton', () => { if (!handler()) App.minimizeApp(); });
}

export async function onResume(handler) {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') handler(); });
  if (platform === 'android' || platform === 'ios') {
    const { App } = await import('@capacitor/app');
    App.addListener('resume', handler);
  }
}
