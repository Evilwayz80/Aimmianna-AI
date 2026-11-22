package com.aimmianna.app;

import android.annotation.SuppressLint;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.Message;
import android.webkit.*;
import androidx.webkit.WebViewAssetLoader;

/** Shared WebView setup. Her web app is bundled in assets/www and served from
 *  https://appassets.androidplatform.net/assets/www/ (a real https origin, so
 *  storage, audio and WebGL behave like Chrome). App and wallpaper share storage. */
final class WebSetup {
    static final String BASE = "https://appassets.androidplatform.net/assets/www/index.html";

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    static WebViewAssetLoader configure(Context ctx, WebView w, NativeBridge bridge) {
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(ctx)).build();
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setUserAgentString(s.getUserAgentString() + " AimmiannaApp/2.1");
        w.setBackgroundColor(Color.BLACK);
        w.addJavascriptInterface(bridge, "AimmiannaNative");
        CookieManager.getInstance().setAcceptThirdPartyCookies(w, true); // Spotify/YouTube players
        w.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return loader.shouldInterceptRequest(r.getUrl()); }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl(); String host = u.getHost() == null ? "" : u.getHost();
                if (host.equals("appassets.androidplatform.net")) return false;
                if (host.endsWith("accounts.spotify.com")) return false;          // Spotify sign-in stays inside, returns to her
                bridge.openExternal(u.toString());                                  // everything else: Spotify/YouTube apps, browser
                return true;
            }
        });
        return loader;
    }

    /** target=_blank / window.open → the right app (Spotify, YouTube, browser). */
    static boolean openWindow(WebView view, Message resultMsg, NativeBridge bridge) {
        WebView tmp = new WebView(view.getContext());
        tmp.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { bridge.openExternal(r.getUrl().toString()); v.destroy(); return true; }
        });
        ((WebView.WebViewTransport) resultMsg.obj).setWebView(tmp);
        resultMsg.sendToTarget();
        return true;
    }
}
