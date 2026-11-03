package com.leo.simpleledger.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;

/** 위젯 상태 저장소 + Firestore REST 업로드 */
public final class WidgetStore {
    private static final String PREFS = "ledger_widget";
    public static final long MAX_AMOUNT = 999_999_999_999L;

    private WidgetStore() {}

    private static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /* ---------- 앱에서 받은 값 ---------- */
    public static void saveFromApp(Context c, JSONObject data) {
        SharedPreferences.Editor e = prefs(c).edit();
        JSONArray cats = data.optJSONArray("categories");
        e.putString("categories", cats == null ? "[]" : cats.toString());
        JSONObject summary = data.optJSONObject("summary");
        if (summary != null) e.putString("summary", summary.toString());
        JSONObject session = data.optJSONObject("session");
        String old = prefs(c).getString("session", null);
        if (session != null) {
            e.putString("session", session.toString());
            if (old == null || !old.equals(session.toString())) { e.remove("idToken"); e.remove("idTokenExp"); }
        } else {
            e.remove("session"); e.remove("idToken"); e.remove("idTokenExp");
        }
        e.apply();
    }

    public static JSONArray categories(Context c) {
        try { return new JSONArray(prefs(c).getString("categories", "[]")); } catch (Exception ex) { return new JSONArray(); }
    }

    public static JSONObject session(Context c) {
        String s = prefs(c).getString("session", null);
        if (s == null) return null;
        try { return new JSONObject(s); } catch (Exception ex) { return null; }
    }

    public static JSONObject summary(Context c) {
        try { return new JSONObject(prefs(c).getString("summary", "{}")); } catch (Exception ex) { return new JSONObject(); }
    }

    /* ---------- 키패드 금액 ---------- */
    public static long amount(Context c) { return prefs(c).getLong("amount", 0L); }
    public static void setAmount(Context c, long v) { prefs(c).edit().putLong("amount", v).apply(); }

    public static String status(Context c) { return prefs(c).getString("status", ""); }
    public static void setStatus(Context c, String s) { prefs(c).edit().putString("status", s).apply(); }

    /* ---------- 날짜 ---------- */
    public static String today() { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()); }

    public static String won(long v) { return String.format(Locale.KOREA, "%,d원", v); }

    /* ---------- 새 기록 ---------- */
    public static JSONObject newEntry(long amount, String categoryId) {
        JSONObject o = new JSONObject();
        long now = System.currentTimeMillis();
        try {
            o.put("id", UUID.randomUUID().toString().replace("-", ""));
            o.put("amount", amount);
            o.put("categoryId", categoryId);
            o.put("date", today());
            o.put("memo", "");
            o.put("createdAt", now);
            o.put("updatedAt", now);
            o.put("source", "widget");
        } catch (Exception ignored) {
        }
        return o;
    }

    /** 앱이 다음에 열릴 때까지 위젯 요약을 바로 맞춰 둔다. */
    public static synchronized void addToSummary(Context c, long amount, boolean income) {
        JSONObject s = summary(c);
        String today = today();
        String month = today.substring(0, 7);
        try {
            if (!month.equals(s.optString("month"))) {
                s.put("month", month); s.put("monthExpense", 0); s.put("monthIncome", 0);
            }
            if (!today.equals(s.optString("today"))) { s.put("today", today); s.put("todayExpense", 0); }
            if (income) s.put("monthIncome", s.optLong("monthIncome") + amount);
            else {
                s.put("monthExpense", s.optLong("monthExpense") + amount);
                s.put("todayExpense", s.optLong("todayExpense") + amount);
            }
        } catch (Exception ignored) {
        }
        prefs(c).edit().putString("summary", s.toString()).apply();
    }

    /* ---------- 대기열 ---------- */
    private static JSONArray pending(Context c) {
        try { return new JSONArray(prefs(c).getString("pending", "[]")); } catch (Exception ex) { return new JSONArray(); }
    }

    public static synchronized void enqueue(Context c, JSONObject entry) {
        JSONArray arr = pending(c);
        arr.put(entry);
        prefs(c).edit().putString("pending", arr.toString()).commit();
    }

    public static synchronized void removePending(Context c, String id) {
        JSONArray arr = pending(c);
        JSONArray out = new JSONArray();
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.optJSONObject(i);
            if (o != null && !id.equals(o.optString("id"))) out.put(o);
        }
        prefs(c).edit().putString("pending", out.toString()).commit();
    }

    public static synchronized JSONArray takePending(Context c) {
        JSONArray arr = pending(c);
        prefs(c).edit().putString("pending", "[]").commit();
        return arr;
    }

    /* ---------- Firestore REST ---------- */
    /** 로그인 상태면 바로 서버에 올린다. 성공하면 true. 네트워크 스레드에서 호출할 것. */
    public static boolean upload(Context c, JSONObject entry) {
        JSONObject s = session(c);
        if (s == null) return false;
        try {
            String token = idToken(c, s);
            if (token == null) return false;
            String url = "https://firestore.googleapis.com/v1/projects/" + s.getString("projectId")
                    + "/databases/(default)/documents/users/" + s.getString("uid")
                    + "/entries?documentId=" + entry.getString("id");
            JSONObject fields = new JSONObject();
            fields.put("amount", new JSONObject().put("integerValue", String.valueOf(entry.getLong("amount"))));
            fields.put("categoryId", new JSONObject().put("stringValue", entry.getString("categoryId")));
            fields.put("date", new JSONObject().put("stringValue", entry.getString("date")));
            fields.put("memo", new JSONObject().put("stringValue", entry.optString("memo", "")));
            fields.put("createdAt", new JSONObject().put("integerValue", String.valueOf(entry.getLong("createdAt"))));
            fields.put("updatedAt", new JSONObject().put("integerValue", String.valueOf(entry.getLong("updatedAt"))));
            fields.put("source", new JSONObject().put("stringValue", "widget"));
            JSONObject body = new JSONObject().put("fields", fields);

            HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
            con.setRequestMethod("POST");
            con.setConnectTimeout(8000);
            con.setReadTimeout(8000);
            con.setDoOutput(true);
            con.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            con.setRequestProperty("Authorization", "Bearer " + token);
            try (OutputStream os = con.getOutputStream()) { os.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
            int code = con.getResponseCode();
            con.disconnect();
            if (code == 401 || code == 403) prefs(c).edit().remove("idToken").remove("idTokenExp").apply();
            return code == 200 || code == 409; // 409: 이미 올라간 기록
        } catch (Exception ex) {
            return false;
        }
    }

    private static String idToken(Context c, JSONObject s) throws Exception {
        SharedPreferences p = prefs(c);
        String cached = p.getString("idToken", null);
        long exp = p.getLong("idTokenExp", 0L);
        if (cached != null && exp - 60_000L > System.currentTimeMillis()) return cached;

        String url = "https://securetoken.googleapis.com/v1/token?key=" + URLEncoder.encode(s.getString("apiKey"), "UTF-8");
        String form = "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(s.getString("refreshToken"), "UTF-8");
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setRequestMethod("POST");
        con.setConnectTimeout(8000);
        con.setReadTimeout(8000);
        con.setDoOutput(true);
        con.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        try (OutputStream os = con.getOutputStream()) { os.write(form.getBytes(StandardCharsets.UTF_8)); }
        if (con.getResponseCode() != 200) { con.disconnect(); return null; }
        StringBuilder sb = new StringBuilder();
        try (InputStream in = con.getInputStream();
             BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String line;
            while ((line = r.readLine()) != null) sb.append(line);
        }
        con.disconnect();
        JSONObject res = new JSONObject(sb.toString());
        String token = res.getString("id_token");
        long ttl = Long.parseLong(res.optString("expires_in", "3600")) * 1000L;
        p.edit().putString("idToken", token).putLong("idTokenExp", System.currentTimeMillis() + ttl).apply();
        return token;
    }
}
