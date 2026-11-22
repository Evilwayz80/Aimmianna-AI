package com.aimmianna.app;

import android.content.*;

public class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i) {
        String key = i.getStringExtra("key"); if (key == null) return;
        Reminders.notifyNow(c, key.hashCode(), i.getStringExtra("title"), i.getStringExtra("body"));
        String daily = i.getStringExtra("daily");
        if (daily != null && !daily.isEmpty()) Reminders.restoreAll(c);      // book tomorrow's
        else Reminders.prefs(c).edit().remove(key).apply();
    }
}
