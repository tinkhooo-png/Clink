package com.leo.simpleledger.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import com.leo.simpleledger.MainActivity;
import com.leo.simpleledger.R;

import org.json.JSONArray;
import org.json.JSONObject;

/** 두 위젯의 화면을 그린다. */
public final class WidgetRender {
    private WidgetRender() {}

    static final String[] KEYS = {"1", "2", "3", "back", "4", "5", "6", "00", "7", "8", "9", "0"};
    static final int[] KEY_IDS = {
            R.id.k1, R.id.k2, R.id.k3, R.id.kback,
            R.id.k4, R.id.k5, R.id.k6, R.id.k00,
            R.id.k7, R.id.k8, R.id.k9, R.id.k0,
    };
    static final int[] CAT_IDS = {R.id.cat0, R.id.cat1, R.id.cat2, R.id.cat3, R.id.cat4, R.id.cat5};
    static final int[] CAT_NAME_IDS = {R.id.cat0_name, R.id.cat1_name, R.id.cat2_name, R.id.cat3_name, R.id.cat4_name, R.id.cat5_name};
    static final int[] CAT_DOT_IDS = {R.id.cat0_dot, R.id.cat1_dot, R.id.cat2_dot, R.id.cat3_dot, R.id.cat4_dot, R.id.cat5_dot};

    public static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int id : m.getAppWidgetIds(new ComponentName(c, QuickAddWidget.class))) {
            m.updateAppWidget(id, quick(c));
        }
        for (int id : m.getAppWidgetIds(new ComponentName(c, SummaryWidget.class))) {
            m.updateAppWidget(id, summary(c));
        }
    }

    private static PendingIntent openApp(Context c) {
        Intent i = new Intent(c, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, 100, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent broadcast(Context c, String action, String extra, int req) {
        Intent i = new Intent(c, QuickAddWidget.class);
        i.setAction(action);
        i.putExtra("v", extra);
        i.setData(Uri.parse("ledger://widget/" + action + "/" + extra)); // 인텐트마다 구분
        return PendingIntent.getBroadcast(c, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /* ---------- 빠른 기록 위젯 ---------- */
    static RemoteViews quick(Context c) {
        RemoteViews rv = new RemoteViews(c.getPackageName(), R.layout.widget_quick);
        long amt = WidgetStore.amount(c);
        rv.setTextViewText(R.id.amount, WidgetStore.won(amt));
        rv.setTextColor(R.id.amount, c.getColor(amt == 0 ? R.color.widget_placeholder : R.color.widget_fg));

        JSONArray cats = WidgetStore.categories(c);
        String status = WidgetStore.status(c);
        if (status.isEmpty()) {
            status = cats.length() == 0 ? "앱에서 카테고리를 먼저 만들어 주세요" : "금액을 누르고 카테고리를 고르면 기록돼요";
        }
        rv.setTextViewText(R.id.status, status);
        rv.setOnClickPendingIntent(R.id.header, openApp(c));

        for (int i = 0; i < KEYS.length; i++) {
            rv.setOnClickPendingIntent(KEY_IDS[i], broadcast(c, QuickAddWidget.ACTION_KEY, KEYS[i], 200 + i));
        }
        int n = Math.min(cats.length(), CAT_IDS.length);
        for (int i = 0; i < CAT_IDS.length; i++) {
            if (i < n) {
                JSONObject cat = cats.optJSONObject(i);
                String name = cat == null ? "" : cat.optString("name");
                if (cat != null && "income".equals(cat.optString("type"))) name = name + " +";
                rv.setViewVisibility(CAT_IDS[i], View.VISIBLE);
                rv.setTextViewText(CAT_NAME_IDS[i], name);
                int color;
                try { color = Color.parseColor(cat == null ? "#8b95a1" : cat.optString("color", "#8b95a1")); }
                catch (Exception e) { color = Color.GRAY; }
                rv.setInt(CAT_DOT_IDS[i], "setColorFilter", color);
                rv.setOnClickPendingIntent(CAT_IDS[i], broadcast(c, QuickAddWidget.ACTION_CAT, String.valueOf(i), 300 + i));
            } else {
                rv.setViewVisibility(CAT_IDS[i], View.INVISIBLE);
            }
        }
        rv.setViewVisibility(R.id.cat_row1, n > 0 ? View.VISIBLE : View.GONE);
        rv.setViewVisibility(R.id.cat_row2, n > 3 ? View.VISIBLE : View.GONE);
        return rv;
    }

    /* ---------- 이번 달 요약 위젯 ---------- */
    static RemoteViews summary(Context c) {
        RemoteViews rv = new RemoteViews(c.getPackageName(), R.layout.widget_summary);
        JSONObject s = WidgetStore.summary(c);
        String today = WidgetStore.today();
        String month = today.substring(0, 7);
        boolean sameMonth = month.equals(s.optString("month"));
        long monthExpense = sameMonth ? s.optLong("monthExpense") : 0;
        long todayExpense = today.equals(s.optString("today")) ? s.optLong("todayExpense") : 0;
        long monthIncome = sameMonth ? s.optLong("monthIncome") : 0;
        int m = Integer.parseInt(month.substring(5, 7));

        rv.setTextViewText(R.id.s_label, m + "월 지출");
        rv.setTextViewText(R.id.s_month, WidgetStore.won(monthExpense));
        String sub = "오늘 " + WidgetStore.won(todayExpense);
        if (monthIncome > 0) sub += " · 수입 +" + WidgetStore.won(monthIncome);
        rv.setTextViewText(R.id.s_today, sub);
        rv.setOnClickPendingIntent(R.id.s_root, openApp(c));
        rv.setOnClickPendingIntent(R.id.s_add, openApp(c));
        return rv;
    }
}
