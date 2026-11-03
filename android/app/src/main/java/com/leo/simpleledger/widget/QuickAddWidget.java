package com.leo.simpleledger.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

import org.json.JSONArray;
import org.json.JSONObject;

/** 위젯 1: 키패드로 금액을 누르고 카테고리를 누르면 바로 기록 */
public class QuickAddWidget extends AppWidgetProvider {
    public static final String ACTION_KEY = "com.leo.simpleledger.widget.KEY";
    public static final String ACTION_CAT = "com.leo.simpleledger.widget.CAT";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, WidgetRender.quick(c));
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        String action = intent.getAction();
        String v = intent.getStringExtra("v");
        if (ACTION_KEY.equals(action) && v != null) {
            onKey(c, v);
            WidgetRender.updateAll(c);
        } else if (ACTION_CAT.equals(action) && v != null) {
            onCategory(c, Integer.parseInt(v));
        }
    }

    private void onKey(Context c, String key) {
        long amt = WidgetStore.amount(c);
        long next;
        if ("back".equals(key)) next = amt / 10;
        else if ("00".equals(key)) next = amt * 100;
        else next = amt * 10 + Integer.parseInt(key);
        if (next > WidgetStore.MAX_AMOUNT || next < 0) next = amt;
        WidgetStore.setAmount(c, next);
        WidgetStore.setStatus(c, "");
    }

    private void onCategory(Context c, int slot) {
        JSONArray cats = WidgetStore.categories(c);
        JSONObject cat = cats.optJSONObject(slot);
        if (cat == null) return;
        long amt = WidgetStore.amount(c);
        if (amt <= 0) {
            WidgetStore.setStatus(c, "금액을 먼저 눌러 주세요");
            WidgetRender.updateAll(c);
            return;
        }
        final String name = cat.optString("name");
        final boolean income = "income".equals(cat.optString("type"));
        final JSONObject entry = WidgetStore.newEntry(amt, cat.optString("id"));
        final String label = name + " " + WidgetStore.won(amt);

        // 1) 먼저 기기에 남긴다(절대 잃지 않도록) 2) 로그인 상태면 서버로 바로 올린다
        WidgetStore.enqueue(c, entry);
        WidgetStore.addToSummary(c, amt, income);
        WidgetStore.setAmount(c, 0);

        final Context app = c.getApplicationContext();
        if (WidgetStore.session(c) == null) {
            WidgetStore.setStatus(c, label + " 기록했어요");
            WidgetRender.updateAll(c);
            return;
        }
        WidgetStore.setStatus(c, label + " 올리는 중…");
        WidgetRender.updateAll(c);
        final PendingResult pr = goAsync();
        new Thread(() -> {
            try {
                if (WidgetStore.upload(app, entry)) {
                    WidgetStore.removePending(app, entry.optString("id"));
                    WidgetStore.setStatus(app, label + " 기록했어요");
                } else {
                    WidgetStore.setStatus(app, label + " 저장했어요 · 연결되면 올라가요");
                }
                WidgetRender.updateAll(app);
            } finally {
                pr.finish();
            }
        }).start();
    }
}
