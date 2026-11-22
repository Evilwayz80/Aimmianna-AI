package com.aimmianna.app;

import android.app.Activity;
import android.app.Presentation;
import android.content.Context;
import android.hardware.display.*;
import android.os.*;
import android.service.wallpaper.WallpaperService;
import android.util.DisplayMetrics;
import android.view.*;
import android.webkit.*;

/** Live wallpaper: the same web app (index.html?mode=wallpaper) rendered into the
 *  wallpaper surface through a private VirtualDisplay + Presentation. Same storage,
 *  memory, skills and routine as the app. Taps go to the page; tapping her or Talk
 *  opens the full app (typing isn't possible on a wallpaper). */
public class AimmiannaWallpaper extends WallpaperService {
    @Override public Engine onCreateEngine() { return new WpEngine(); }

    class WpEngine extends Engine implements NativeBridge.Host {
        VirtualDisplay vd; Presentation pres; WebView web; NativeBridge bridge;
        int w, h; boolean visible;

        @Override public void onCreate(SurfaceHolder holder) { super.onCreate(holder); setTouchEventsEnabled(true); setOffsetNotificationsEnabled(true); }

        @Override public void onSurfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            super.onSurfaceChanged(holder, format, width, height);
            if (vd != null && width == w && height == h) return;
            w = width; h = height;
            DisplayMetrics dm = getResources().getDisplayMetrics();
            if (vd == null) {
                DisplayManager dmgr = getSystemService(DisplayManager.class);
                vd = dmgr.createVirtualDisplay("aimmianna-wallpaper", w, h, dm.densityDpi, holder.getSurface(), 0);
                pres = new Presentation(AimmiannaWallpaper.this, vd.getDisplay());
                web = new WebView(pres.getContext());
                bridge = new NativeBridge(AimmiannaWallpaper.this, web, this, true);
                WebSetup.configure(AimmiannaWallpaper.this, web, bridge);
                web.setWebChromeClient(new WebChromeClient());
                pres.setContentView(web);
                try { pres.show(); } catch (Exception e) { return; }
                web.loadUrl(WebSetup.BASE + "?mode=wallpaper");
            } else {
                vd.setSurface(holder.getSurface());
                vd.resize(w, h, dm.densityDpi);
            }
        }

        @Override public void onSurfaceCreated(SurfaceHolder holder) { super.onSurfaceCreated(holder); if (vd != null) vd.setSurface(holder.getSurface()); }
        @Override public void onSurfaceDestroyed(SurfaceHolder holder) { if (vd != null) vd.setSurface(null); super.onSurfaceDestroyed(holder); }

        @Override public void onVisibilityChanged(boolean v) {
            visible = v;
            if (web == null) return;
            if (v) { web.onResume(); web.evaluateJavascript("window.__aimmiannaResume&&window.__aimmiannaResume()", null); }
            else { web.evaluateJavascript("window.__aimmiannaHome&&window.__aimmiannaHome.flush()", null); web.onPause(); } // no rendering while hidden = no battery drain
        }

        @Override public void onTouchEvent(MotionEvent e) {
            if (web != null) { MotionEvent c = MotionEvent.obtain(e); web.dispatchTouchEvent(c); c.recycle(); }
        }

        @Override public void onOffsetsChanged(float xo, float yo, float xs, float ys, int xp, int yp) {
            // swiping home-screen pages pans the camera a little (parallax)
            if (web != null) web.evaluateJavascript("window.__aimmiannaOffset&&window.__aimmiannaOffset(" + xo + ")", null);
        }

        @Override public void onDestroy() {
            if (bridge != null) bridge.destroy();
            if (web != null) web.destroy();
            if (pres != null) try { pres.dismiss(); } catch (Exception ignored) {}
            if (vd != null) vd.release();
            super.onDestroy();
        }

        /* Host: no activity here — anything needing one opens the app */
        @Override public Activity activity() { return null; }
        @Override public void pickHomeFolder() { bridge.openApp("settingsSection"); }
        @Override public void requestPermission(String perm, Runnable granted) {
            if (checkSelfPermission(perm) == android.content.pm.PackageManager.PERMISSION_GRANTED) granted.run();
        }
    }
}
