package com.aimmianna.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.*;
import android.provider.DocumentsContract;
import android.view.*;
import android.webkit.*;
import androidx.documentfile.provider.DocumentFile;
import java.util.*;

public class MainActivity extends Activity implements NativeBridge.Host {
    static final int REQ_FILE = 11, REQ_HOME = 12, REQ_PERM = 13;
    WebView web; NativeBridge bridge;
    ValueCallback<Uri[]> fileCb;
    final Map<String, Runnable> permWaiters = new HashMap<>();

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        Window win = getWindow();
        win.addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        if (Build.VERSION.SDK_INT >= 28) win.getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        setContentView(web);
        bridge = new NativeBridge(this, web, this, false);
        WebSetup.configure(this, web, bridge);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                Intent i = p.createIntent();
                if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                // the system picker lists Gallery, Google Photos, Drive, My Files, etc.
                try { startActivityForResult(Intent.createChooser(i, "Choose"), REQ_FILE); } catch (Exception e) { fileCb = null; return false; }
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest r) {
                runOnUiThread(() -> {
                    boolean mic = Arrays.asList(r.getResources()).contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                    if (mic) requestPermission(Manifest.permission.RECORD_AUDIO, () -> r.grant(r.getResources()));
                    else r.grant(r.getResources());
                });
            }
            @Override public boolean onCreateWindow(WebView v, boolean dialog, boolean user, Message m) { return WebSetup.openWindow(v, m, bridge); }
            @Override public void onShowCustomView(View view, CustomViewCallback cb) { full = view; fullCb = cb; ((ViewGroup) getWindow().getDecorView()).addView(view, new ViewGroup.LayoutParams(-1, -1)); }
            @Override public void onHideCustomView() { if (full != null) ((ViewGroup) getWindow().getDecorView()).removeView(full); if (fullCb != null) fullCb.onCustomViewHidden(); full = null; fullCb = null; }
        });
        web.loadUrl(startUrl(getIntent()));
        Reminders.channel(this);
        Reminders.restoreAll(this);
    }
    View full; WebChromeClient.CustomViewCallback fullCb;

    String startUrl(Intent i) {
        String panel = i == null ? null : i.getStringExtra("panel");
        return WebSetup.BASE + "?skipIntro=1" + (panel != null && !panel.isEmpty() ? "&panel=" + Uri.encode(panel) : "");
    }

    @Override protected void onNewIntent(Intent i) {
        super.onNewIntent(i); setIntent(i);
        String panel = i.getStringExtra("panel");
        if (panel != null && !panel.isEmpty()) web.evaluateJavascript("window.__aimmiannaResume&&window.__aimmiannaResume();setTimeout(function(){try{document.querySelector('[data-goto=\"" + panel.replaceAll("[^A-Za-z]", "") + "\"]').click()}catch(e){}},300)", null);
    }
    @Override protected void onResume() { super.onResume(); web.onResume(); web.evaluateJavascript("window.__aimmiannaResume&&window.__aimmiannaResume()", null); }
    @Override protected void onPause() { web.evaluateJavascript("window.__aimmiannaHome&&window.__aimmiannaHome.flush()", null); web.onPause(); super.onPause(); }
    @Override protected void onDestroy() { bridge.destroy(); web.destroy(); super.onDestroy(); }

    @Override public void onBackPressed() {
        // close an open panel first, then leave the app
        web.evaluateJavascript("(function(){var s=document.getElementById('sheet');if(s&&s.classList.contains('open')){document.getElementById('sheetClose').click();return 1}return 0})()",
            (r) -> { if (!"1".equals(r)) { if (web.canGoBack()) web.goBack(); else moveTaskToBack(true); } });
    }

    /* ---- Host ---- */
    @Override public Activity activity() { return this; }
    @Override public void requestPermission(String perm, Runnable granted) {
        if (checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED) { granted.run(); return; }
        permWaiters.put(perm, granted);
        requestPermissions(new String[]{perm}, REQ_PERM);
    }
    @Override public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        for (int i = 0; i < perms.length; i++) { Runnable r = permWaiters.remove(perms[i]); if (r != null && res[i] == PackageManager.PERMISSION_GRANTED) r.run(); }
    }
    @Override public void pickHomeFolder() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        if (Build.VERSION.SDK_INT >= 26) i.putExtra(DocumentsContract.EXTRA_INITIAL_URI, DocumentsContract.buildDocumentUri("com.android.externalstorage.documents", "primary:Documents"));
        bridge.toast("Open Documents, make a folder named Aimmianna (or pick it), then tap \"Use this folder\".");
        startActivityForResult(i, REQ_HOME);
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_FILE) {
            Uri[] out = null;
            if (res == RESULT_OK && data != null) {
                if (data.getClipData() != null) { int n = data.getClipData().getItemCount(); out = new Uri[n]; for (int i = 0; i < n; i++) out[i] = data.getClipData().getItemAt(i).getUri(); }
                else if (data.getData() != null) out = new Uri[]{data.getData()};
            }
            if (fileCb != null) fileCb.onReceiveValue(out); fileCb = null;
        } else if (req == REQ_HOME && res == RESULT_OK && data != null && data.getData() != null) {
            Uri tree = data.getData();
            try { getContentResolver().takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION); } catch (Exception ignored) {}
            HomeStore.prefs(this).edit().putString("tree", tree.toString()).apply();
            DocumentFile d = HomeStore.pickedDir(this);
            bridge.toast(d != null ? "Her home folder: " + HomeStore.where(this) : "Couldn't use that folder — try Documents.");
            web.evaluateJavascript("window.__homePicked&&window.__homePicked(" + NativeBridge.q(bridge.homeInfo()) + ")", null);
        }
    }
}
