package com.officeAschi.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.view.ViewGroup;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        ViewGroup parent = (ViewGroup) webView.getParent();

        SwipeRefreshLayout swipeRefresh = new SwipeRefreshLayout(this);
        int index = parent.indexOfChild(webView);
        ViewGroup.LayoutParams params = webView.getLayoutParams();
        parent.removeView(webView);
        swipeRefresh.addView(webView, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        parent.addView(swipeRefresh, index, params);

        swipeRefresh.setOnRefreshListener(() -> {
            webView.evaluateJavascript("window.dispatchEvent(new Event('capacitor-pull-refresh'));", null);
            webView.reload();
            swipeRefresh.setRefreshing(false);
        });
    }
}
