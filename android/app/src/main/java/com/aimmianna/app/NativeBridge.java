package com.aimmianna.app;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.speech.*;
import android.speech.tts.*;
import android.webkit.*;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import org.json.JSONObject;
import java.io.File;
import java.util.*;

/** window.AimmiannaNative — the same bridge for the app and the live wallpaper. */
public class NativeBridge {
    public interface Host {
        Activity activity();                         // null in the live wallpaper
        void pickHomeFolder();
        void requestPermission(String perm, Runnable granted);
    }

    final Context ctx; final WebView web; final Host host; final boolean wallpaper;
    final Handler ui = new Handler(Looper.getMainLooper());
    TextToSpeech tts; boolean ttsReady; SpeechRecognizer rec;

    NativeBridge(Context ctx, WebView web, Host host, boolean wallpaper) {
        this.ctx = ctx.getApplicationContext(); this.web = web; this.host = host; this.wallpaper = wallpaper;
        initTts();
    }

    void js(String code) { ui.post(() -> { try { web.evaluateJavascript(code, null); } catch (Exception ignored) {} }); }
    static String q(String s) { return JSONObject.quote(s == null ? "" : s); }

    /* ---------- voice: prefers Google's natural voices on Samsung, falls back to Samsung TTS ---------- */
    void initTts() {
        TextToSpeech.OnInitListener l = (st) -> {
            ttsReady = st == TextToSpeech.SUCCESS;
            if (!ttsReady) return;
            tts.setLanguage(Locale.US);
            pickVoice();
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) {}
                @Override public void onDone(String id) { js("window.__aimmiannaSpeakDone&&window.__aimmiannaSpeakDone()"); }
                @Override public void onError(String id) { js("window.__aimmiannaSpeakDone&&window.__aimmiannaSpeakDone()"); }
            });
        };
        boolean google = false;
        try { ctx.getPackageManager().getPackageInfo("com.google.android.tts", 0); google = true; } catch (Exception ignored) {}
        tts = google ? new TextToSpeech(ctx, l, "com.google.android.tts") : new TextToSpeech(ctx, l);
    }

    void pickVoice() {
        try {
            Voice best = null; int bestScore = -99;
            for (Voice v : tts.getVoices()) {
                String n = v.getName().toLowerCase(Locale.US);
                Locale lc = v.getLocale();
                if (lc == null || !"en".equals(lc.getLanguage())) continue;
                int s = 0;
                if ("US".equals(lc.getCountry())) s += 3;
                if (v.isNetworkConnectionRequired()) s += 1; else s += 2;
                if (v.getQuality() >= Voice.QUALITY_HIGH) s += 3;
                // Google female voices (sfg/tpf/iog/tpc/iob), Samsung female voices (SMTf..)
                if (n.matches(".*(sfg|tpf|iog|tpc|iob|smtf|female).*")) s += 10;
                if (n.matches(".*(iol|iom|tpd|smtm|\\bmale).*")) s -= 10;
                if (s > bestScore) { bestScore = s; best = v; }
            }
            if (best != null) tts.setVoice(best);
            tts.setPitch(1.08f);
        } catch (Exception ignored) {}
    }

    @JavascriptInterface public boolean speak(String text, String voice, String rate) {
        if (!ttsReady) return false;
        float r = 1f;
        try { if (rate != null && rate.endsWith("%")) r = 1f + Integer.parseInt(rate.replace("%", "").replace("+", "")) / 100f; } catch (Exception ignored) {}
        tts.setSpeechRate(Math.max(0.6f, Math.min(1.6f, r)));
        Bundle b = new Bundle();
        return tts.speak(text, TextToSpeech.QUEUE_FLUSH, b, "a" + System.nanoTime()) == TextToSpeech.SUCCESS;
    }
    @JavascriptInterface public void stopSpeaking() { if (tts != null) tts.stop(); }

    /* ---------- listening ---------- */
    @JavascriptInterface public void listen() {
        if (wallpaper) { openApp("chatSection"); return; }
        ui.post(() -> host.requestPermission(Manifest.permission.RECORD_AUDIO, this::startListening));
    }
    void startListening() {
        if (!SpeechRecognizer.isRecognitionAvailable(ctx)) { js("window.__aimmiannaHeard('')"); toast("Voice typing isn't available — install Google app or Samsung voice input."); return; }
        if (rec != null) rec.destroy();
        rec = SpeechRecognizer.createSpeechRecognizer(ctx);
        rec.setRecognitionListener(new RecognitionListener() {
            public void onResults(Bundle r) { ArrayList<String> m = r.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION); js("window.__aimmiannaHeard(" + q(m != null && !m.isEmpty() ? m.get(0) : "") + ")"); }
            public void onError(int e) { js("window.__aimmiannaHeard('')"); }
            public void onReadyForSpeech(Bundle b) {} public void onBeginningOfSpeech() {} public void onRmsChanged(float v) {}
            public void onBufferReceived(byte[] b) {} public void onEndOfSpeech() {} public void onPartialResults(Bundle b) {} public void onEvent(int t, Bundle b) {}
        });
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag());
        rec.startListening(i);
    }

    /* ---------- notifications + reminders ---------- */
    @JavascriptInterface public void notify(String title, String body) {
        ui.post(() -> { if (host.activity() != null && Build.VERSION.SDK_INT >= 33) host.requestPermission(Manifest.permission.POST_NOTIFICATIONS, () -> {}); });
        Reminders.notifyNow(ctx, (int) (System.currentTimeMillis() & 0xffffff), title, body);
    }
    @JavascriptInterface public void scheduleReminder(String id, double at, String title, String body) {
        ui.post(() -> { if (host.activity() != null && Build.VERSION.SDK_INT >= 33) host.requestPermission(Manifest.permission.POST_NOTIFICATIONS, () -> {}); });
        Reminders.schedule(ctx, id, (long) at, title, body);
    }
    @JavascriptInterface public void cancelReminder(String id) { Reminders.cancel(ctx, id); }
    @JavascriptInterface public void setDaily(String kind, String hhmm, String msg) { Reminders.setDaily(ctx, kind, hhmm, msg); }

    /** Samsung puts apps to sleep to save battery, which can delay her reminders. */
    @JavascriptInterface public boolean batteryOk() {
        PowerManager pm = ctx.getSystemService(PowerManager.class);
        return pm == null || pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
    }
    @JavascriptInterface public void keepAwake() {
        ui.post(() -> {
            Activity a = host.activity(); if (a == null) { openApp("settingsSection"); return; }
            try { a.startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + ctx.getPackageName()))); }
            catch (Exception e) { try { a.startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)); } catch (Exception ignored) {} }
            if (Build.VERSION.SDK_INT >= 31) {
                AlarmManager am = ctx.getSystemService(AlarmManager.class);
                if (!am.canScheduleExactAlarms()) try { a.startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + ctx.getPackageName()))); } catch (Exception ignored) {}
            }
        });
    }

    /* ---------- her home folder ---------- */
    @JavascriptInterface public String homeInfo() {
        try { return new JSONObject().put("where", HomeStore.where(ctx)).put("picked", HomeStore.pickedDir(ctx) != null).toString(); }
        catch (Exception e) { return "{}"; }
    }
    @JavascriptInterface public boolean homeWrite(String text) { return HomeStore.write(ctx, text); }
    @JavascriptInterface public String homeRead() { return HomeStore.read(ctx); }
    @JavascriptInterface public void homePick() { ui.post(() -> { if (host.activity() == null) openApp("settingsSection"); else host.pickHomeFolder(); }); }

    @JavascriptInterface public void saveFile(String name, String text) {
        String where = HomeStore.saveToDownloads(ctx, name, text);
        toast(where != null ? "Saved to " + where : "Couldn't save the copy.");
    }

    /* ---------- wallpaper, app, links ---------- */
    @JavascriptInterface public void setWallpaper() {
        ui.post(() -> {
            Activity a = host.activity(); if (a == null) return;
            try {
                a.startActivity(new Intent(android.app.WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER)
                    .putExtra(android.app.WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT, new ComponentName(ctx, AimmiannaWallpaper.class)));
            } catch (Exception e) {
                try { a.startActivity(new Intent(android.app.WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER)); } catch (Exception ignored) {}
            }
        });
    }
    @JavascriptInterface public void openApp(String panel) {
        Intent i = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("panel", panel == null ? "" : panel);
        ctx.startActivity(i);
    }
    @JavascriptInterface public void openExternal(String url) {
        ui.post(() -> {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
            } catch (Exception e) { toast("No app can open that link."); }
        });
    }
    @JavascriptInterface public boolean isWallpaper() { return wallpaper; }
    @JavascriptInterface public String getPref(String k) { return ctx.getSharedPreferences("aimmianna_shared", 0).getString(k, ""); }
    @JavascriptInterface public void setPref(String k, String v) { ctx.getSharedPreferences("aimmianna_shared", 0).edit().putString(k, v).apply(); }
    @JavascriptInterface public String deviceInfo() { return Build.MANUFACTURER + " " + Build.MODEL + " · Android " + Build.VERSION.RELEASE; }

    /* ---------- updates: download the new APK, then Android asks to install it ---------- */
    @JavascriptInterface public void installUpdate(String apkUrl) {
        ui.post(() -> {
            Activity a = host.activity(); if (a == null) { openApp("settingsSection"); return; }
            if (Build.VERSION.SDK_INT >= 26 && !ctx.getPackageManager().canRequestPackageInstalls()) {
                toast("Allow \"Install unknown apps\" for Aimmianna, then tap Update again.");
                a.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx.getPackageName())));
                return;
            }
            File dir = new File(ctx.getExternalFilesDir(null), "updates"); //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
            File out = new File(dir, "Aimmianna-update.apk"); //noinspection ResultOfMethodCallIgnored
            out.delete();
            DownloadManager dm = ctx.getSystemService(DownloadManager.class);
            DownloadManager.Request r = new DownloadManager.Request(Uri.parse(apkUrl))
                .setTitle("Aimmianna update").setDescription("Downloading her new version")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                .setDestinationUri(Uri.fromFile(out));
            long id = dm.enqueue(r);
            BroadcastReceiver done = new BroadcastReceiver() {
                @Override public void onReceive(Context c, Intent i) {
                    if (i.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1) != id) return;
                    try { ctx.unregisterReceiver(this); } catch (Exception ignored) {}
                    if (!out.exists() || out.length() < 100000) { toast("The update didn't download — try again later."); js("window.__aimmiannaUpdateFailed&&window.__aimmiannaUpdateFailed()"); return; }
                    Uri u = FileProvider.getUriForFile(ctx, "com.aimmianna.app.files", out);
                    Intent inst = new Intent(Intent.ACTION_VIEW).setDataAndType(u, "application/vnd.android.package-archive")
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(inst);
                }
            };
            IntentFilter f = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
            if (Build.VERSION.SDK_INT >= 33) ctx.registerReceiver(done, f, Context.RECEIVER_EXPORTED); else ctx.registerReceiver(done, f);
        });
    }

    void toast(String m) { ui.post(() -> Toast.makeText(ctx, m, Toast.LENGTH_LONG).show()); }
    void destroy() { try { if (tts != null) tts.shutdown(); if (rec != null) rec.destroy(); } catch (Exception ignored) {} }
}
