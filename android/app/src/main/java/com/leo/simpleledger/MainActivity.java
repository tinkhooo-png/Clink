package com.leo.simpleledger;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.leo.simpleledger.widget.LedgerWidgetPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LedgerWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
