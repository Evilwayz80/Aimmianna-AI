package com.aimmianna.app;

import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.JSONObject;
import java.util.*;

/** Exact reminders + daily bedtime/alarm, kept in prefs so they survive reboots and updates. */
public final class Reminders {
    static final String CH = "aimmianna_reminders";
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("aimmianna_reminders", Context.MODE_PRIVATE); }

    static void channel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CH) == null) {
            NotificationChannel ch = new NotificationChannel(CH, "Aimmianna reminders & messages", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Reminders, alarms and messages from Aimmianna");
            ch.enableVibration(true);
            nm.createNotificationChannel(ch);
        }
    }

    static void notifyNow(Context c, int id, String title, String body) {
        channel(c);
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CH) : new Notification.Builder(c);
        b.setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle(title).setContentText(body)
         .setStyle(new Notification.BigTextStyle().bigText(body)).setAutoCancel(true).setContentIntent(pi)
         .setColor(0xFFA55EEA);
        try { c.getSystemService(NotificationManager.class).notify(id, b.build()); } catch (SecurityException ignored) {}
    }

    private static PendingIntent pi(Context c, String key, String title, String body, String daily) {
        Intent i = new Intent(c, ReminderReceiver.class).setAction("com.aimmianna.REMIND." + key)
            .putExtra("key", key).putExtra("title", title).putExtra("body", body).putExtra("daily", daily);
        return PendingIntent.getBroadcast(c, key.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void setAlarm(Context c, long at, PendingIntent p) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
        else am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
    }

    static void schedule(Context c, String id, long at, String title, String body) {
        if (at <= System.currentTimeMillis()) return;
        try {
            JSONObject o = new JSONObject().put("at", at).put("title", title).put("body", body);
            prefs(c).edit().putString("r:" + id, o.toString()).apply();
        } catch (Exception ignored) {}
        setAlarm(c, at, pi(c, "r:" + id, title, body, ""));
    }

    static void cancel(Context c, String id) {
        prefs(c).edit().remove("r:" + id).apply();
        c.getSystemService(AlarmManager.class).cancel(pi(c, "r:" + id, "", "", ""));
    }

    /** kind = bedtime | alarm; hhmm "" turns it off. */
    static void setDaily(Context c, String kind, String hhmm, String msg) {
        String key = "d:" + kind;
        if (hhmm == null || hhmm.isEmpty()) { prefs(c).edit().remove(key).apply(); c.getSystemService(AlarmManager.class).cancel(pi(c, key, "", "", "")); return; }
        prefs(c).edit().putString(key, hhmm + "|" + msg).apply();
        setAlarm(c, nextDaily(hhmm), pi(c, key, "Aimmianna", msg, hhmm));
    }

    static long nextDaily(String hhmm) {
        String[] p = hhmm.split(":");
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, Integer.parseInt(p[0])); cal.set(Calendar.MINUTE, Integer.parseInt(p[1]));
        cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis() + 1000) cal.add(Calendar.DAY_OF_MONTH, 1);
        return cal.getTimeInMillis();
    }

    static void restoreAll(Context c) {
        for (Map.Entry<String, ?> e : prefs(c).getAll().entrySet()) {
            String k = e.getKey(), v = String.valueOf(e.getValue());
            try {
                if (k.startsWith("r:")) {
                    JSONObject o = new JSONObject(v);
                    long at = o.getLong("at");
                    if (at > System.currentTimeMillis()) setAlarm(c, at, pi(c, k, o.optString("title"), o.optString("body"), ""));
                    else prefs(c).edit().remove(k).apply();
                } else if (k.startsWith("d:")) {
                    String[] p = v.split("\\|", 2);
                    setAlarm(c, nextDaily(p[0]), pi(c, k, "Aimmianna", p.length > 1 ? p[1] : "", p[0]));
                }
            } catch (Exception ignored) {}
        }
    }
}
