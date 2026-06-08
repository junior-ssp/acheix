package br.com.acheix.app;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean isAdminApk() {
        return "br.com.acheix.admin".equals(getPackageName());
    }

    private void clearCookies() {
        try {
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.removeAllCookies(null);
            cookieManager.flush();
        } catch (Exception ignored) {
        }
    }

    private void clearAdminCookiesAndStorage() {
        if (!isAdminApk()) return;

        clearCookies();

        try {
            WebStorage.getInstance().deleteAllData();
        } catch (Exception ignored) {
        }
    }

    private void clearWebCacheAndStorage() {
        clearCookies();

        try {
            WebStorage.getInstance().deleteAllData();
        } catch (Exception ignored) {
        }

        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.clearCache(true);
                webView.clearFormData();
                webView.clearHistory();
            }
        } catch (Exception ignored) {
        }
    }

    private void clearAdminWebSession() {
        if (!isAdminApk()) return;

        clearWebCacheAndStorage();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        clearWebCacheAndStorage();
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(false);
        settings.setLoadWithOverviewMode(false);
        settings.setTextZoom(100);

        clearWebCacheAndStorage();
    }

    @Override
    public void onPause() {
        clearAdminWebSession();
        super.onPause();
    }

    @Override
    public void onStop() {
        clearAdminWebSession();
        super.onStop();
    }

    @Override
    public void onDestroy() {
        clearAdminWebSession();
        super.onDestroy();
    }
}
