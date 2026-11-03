package com.leo.simpleledger.widget;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

/** 웹앱 ↔ 홈 화면 위젯 다리 */
@CapacitorPlugin(name = "LedgerWidget")
public class LedgerWidgetPlugin extends Plugin {

    /** 카테고리, 이번 달 요약, 로그인 세션을 위젯에 넘긴다. */
    @PluginMethod
    public void sync(PluginCall call) {
        WidgetStore.saveFromApp(getContext(), call.getData());
        WidgetRender.updateAll(getContext());
        call.resolve();
    }

    /** 위젯에서 저장했지만 아직 서버에 올라가지 않은 기록을 꺼낸다. */
    @PluginMethod
    public void takePending(PluginCall call) {
        JSONArray entries = WidgetStore.takePending(getContext());
        JSObject ret = new JSObject();
        try {
            ret.put("entries", entries);
        } catch (Exception ignored) {
        }
        call.resolve(ret);
    }
}
