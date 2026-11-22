package com.aimmianna.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.documentfile.provider.DocumentFile;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

/** Her home folder: one place for all of her.
 *   Aimmianna/aimmianna-data.json            always the latest save
 *   Aimmianna/backups/aimmianna-YYYY-MM-DD.json   one per day, last 14
 * Location: the folder you pick (Documents/Aimmianna — survives uninstall and
 * shows in Samsung My Files), otherwise the app's own folder
 * Android/data/com.aimmianna.app/files/Aimmianna until you pick one. */
public final class HomeStore {
    static final String FILE = "aimmianna-data.json";
    static final String PREFS = "aimmianna_home";
    private static final Object LOCK = new Object();

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static Uri tree(Context c) {
        String s = prefs(c).getString("tree", null);
        return s == null ? null : Uri.parse(s);
    }

    /** The picked folder, or null. Uses an "Aimmianna" subfolder unless the picked folder already is one. */
    static DocumentFile pickedDir(Context c) {
        Uri t = tree(c); if (t == null) return null;
        try {
            DocumentFile d = DocumentFile.fromTreeUri(c, t);
            if (d == null || !d.canWrite()) return null;
            if (d.getName() != null && d.getName().equalsIgnoreCase("Aimmianna")) return d;
            DocumentFile sub = d.findFile("Aimmianna");
            if (sub == null) sub = d.createDirectory("Aimmianna");
            return sub;
        } catch (Exception e) { return null; }
    }

    static File appDir(Context c) {
        File d = new File(c.getExternalFilesDir(null), "Aimmianna");
        //noinspection ResultOfMethodCallIgnored
        d.mkdirs();
        return d;
    }

    static String where(Context c) {
        DocumentFile d = pickedDir(c);
        if (d != null) {
            String p = d.getUri().getLastPathSegment();           // e.g. primary:Documents/Aimmianna
            if (p != null && p.contains(":")) p = p.substring(p.indexOf(':') + 1);
            return (p == null ? "Aimmianna" : p) + " (in your phone storage)";
        }
        return "Android/data/com.aimmianna.app/files/Aimmianna";
    }

    static boolean write(Context c, String text) {
        synchronized (LOCK) {
            byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
            String day = "aimmianna-" + new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()) + ".json";
            DocumentFile d = pickedDir(c);
            boolean ok = false;
            if (d != null) {
                try {
                    ok = writeDoc(c, d, FILE, bytes);
                    DocumentFile b = d.findFile("backups"); if (b == null) b = d.createDirectory("backups");
                    if (b != null) {
                        if (b.findFile(day) == null) writeDoc(c, b, day, bytes);
                        List<DocumentFile> olds = new ArrayList<>();
                        for (DocumentFile f : b.listFiles()) if (f.getName() != null && f.getName().matches("aimmianna-\\d{4}-\\d{2}-\\d{2}\\.json")) olds.add(f);
                        olds.sort(Comparator.comparing(DocumentFile::getName));
                        while (olds.size() > 14) olds.remove(0).delete();
                    }
                } catch (Exception e) { ok = false; }
            }
            // the app folder always keeps a copy too (fast restore, and the wallpaper can read it)
            try {
                File dir = appDir(c);
                writeFileAtomic(new File(dir, FILE), bytes);
                File b = new File(dir, "backups"); //noinspection ResultOfMethodCallIgnored
                b.mkdirs();
                File df = new File(b, day); if (!df.exists()) writeFileAtomic(df, bytes);
                File[] all = b.listFiles(); if (all != null && all.length > 14) { Arrays.sort(all); for (int i = 0; i < all.length - 14; i++) //noinspection ResultOfMethodCallIgnored
                    all[i].delete(); }
                if (d == null) ok = true;
            } catch (Exception ignored) {}
            return ok;
        }
    }

    /** Newest of the picked folder and the app folder. */
    static String read(Context c) {
        String best = null; long bestAt = -1;
        DocumentFile d = pickedDir(c);
        if (d != null) {
            DocumentFile f = d.findFile(FILE);
            if (f != null) { String t = readUri(c, f.getUri()); long at = savedAt(t); if (t != null && at > bestAt) { best = t; bestAt = at; } }
        }
        File af = new File(appDir(c), FILE);
        if (af.exists()) { try { String t = readStream(new FileInputStream(af)); long at = savedAt(t); if (t != null && at > bestAt) { best = t; bestAt = at; } } catch (Exception ignored) {} }
        return best == null ? "" : best;
    }

    static long savedAt(String t) {
        if (t == null) return -1;
        int i = t.indexOf("\"savedAt\":"); if (i < 0 || i > 200) return 0;
        int j = i + 10, k = j; while (k < t.length() && Character.isDigit(t.charAt(k))) k++;
        try { return Long.parseLong(t.substring(j, k)); } catch (Exception e) { return 0; }
    }

    private static boolean writeDoc(Context c, DocumentFile dir, String name, byte[] bytes) throws IOException {
        DocumentFile f = dir.findFile(name);
        if (f == null) f = dir.createFile("application/json", name);
        if (f == null) return false;
        // some providers append ".json" again — keep the exact name
        if (f.getName() != null && !f.getName().equals(name)) f.renameTo(name);
        try (OutputStream os = c.getContentResolver().openOutputStream(f.getUri(), "wt")) {
            if (os == null) return false; os.write(bytes); return true;
        }
    }

    private static void writeFileAtomic(File f, byte[] bytes) throws IOException {
        File tmp = new File(f.getParentFile(), f.getName() + ".tmp");
        try (FileOutputStream os = new FileOutputStream(tmp)) { os.write(bytes); os.getFD().sync(); }
        if (!tmp.renameTo(f)) { try (FileOutputStream os = new FileOutputStream(f)) { os.write(bytes); } //noinspection ResultOfMethodCallIgnored
            tmp.delete(); }
    }

    static String readUri(Context c, Uri u) { try { return readStream(c.getContentResolver().openInputStream(u)); } catch (Exception e) { return null; } }

    static String readStream(InputStream in) throws IOException {
        if (in == null) return null;
        try (InputStream is = in; ByteArrayOutputStream bo = new ByteArrayOutputStream()) {
            byte[] buf = new byte[65536]; int n; while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
            return bo.toString("UTF-8");
        }
    }

    /** "Save a copy" → Downloads/Aimmianna/<name> (visible in My Files → Downloads). */
    static String saveToDownloads(Context c, String name, String text) {
        try {
            byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver cr = c.getContentResolver();
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                v.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Aimmianna");
                Uri u = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (u == null) return null;
                try (OutputStream os = cr.openOutputStream(u)) { if (os != null) os.write(bytes); }
                return "Download/Aimmianna/" + name;
            } else {
                File d = new File(appDir(c), "copies"); //noinspection ResultOfMethodCallIgnored
                d.mkdirs();
                writeFileAtomic(new File(d, name), bytes);
                return where(c) + "/copies/" + name;
            }
        } catch (Exception e) { return null; }
    }
}
