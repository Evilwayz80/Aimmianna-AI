# Aimmianna 3D — v2.1

Your gothic AI companion in a 4-room 3D apartment (bedroom, living room, kitchen, bathroom).
One codebase runs on **iPhone** (Safari / Home Screen app), **Android phones and tablets** (APK + live wallpaper) and **computers**.

## Her home folder — where everything lives

All of her lives in **one file inside one folder**:

```
Aimmianna/
  aimmianna-data.json          <- memories, rules, skills, bond, notes, calendar,
                                  reminders, wardrobe, album photos, settings, keys
  backups/
    aimmianna-2026-11-22.json  <- one dated copy per day, last 14 days
```

| Device | Where the folder is | How |
|---|---|---|
| Samsung / Android | **Documents › Aimmianna** (My Files › Internal storage › Documents › Aimmianna) | Settings › Her home folder › **Use Documents/Aimmianna**, pick or create the folder once. Saves automatically. It stays there if the app is uninstalled. Until you pick it, she uses `Android/data/com.aimmianna.app/files/Aimmianna`. |
| iPhone | **Files › iCloud Drive (or On My iPhone) › Aimmianna** | Safari can't write to a folder by itself. Tap **Save to Files** and choose the Aimmianna folder. For automatic saving, turn on **server sync**. |
| Computer (Chrome/Edge) | Any folder you pick, e.g. `Documents/Aimmianna` | **Choose her folder** once. She saves automatically. |
| Her server | `aimmianna-home/` next to `server.py` | Settings › Sync through her server: type the same private home key on every device and they all share one Aimmianna. |

To move her to a new device, open Settings › Her home folder › **Restore from folder** (or **Load a copy** and pick `aimmianna-data.json`).
The file contains your API keys, so keep it private.

## Running her

```bash
pip install fastapi uvicorn edge-tts     # aiohttp comes with edge-tts
python3 server.py                         # http://localhost:8000
```

`server.py` serves the app and provides:
- `/api/tts` — free natural neural voice (Microsoft Jenny / Aria / Ava … via edge-tts)
- `/api/fish` — Fish Audio proxy (key + voice ID set in Settings)
- `/api/home` — her home-folder sync (private; protected by your home key)

Static hosts such as GitHub Pages can run the app but **not** `server.py`. On those she falls back to the device voice, and server sync is off.

## Android (Samsung) — install + live wallpaper

1. Copy `Aimmianna.apk` to the phone or tablet and tap it. Allow "Install unknown apps" for My Files or Chrome when asked.
2. Open her → More › Settings:
   - **Use Documents/Aimmianna** (her home folder)
   - **Don't let battery saving put her to sleep**, so Samsung doesn't delay reminders
   - **Set her as my live wallpaper**, then choose **Home screen**. One UI only allows photo and video wallpapers on the lock screen.
3. On the wallpaper you can tap rooms, devices, the wardrobe and games. Tapping her or Talk opens the full app, since a wallpaper can't take typing. It's the same memory, skills and routine.

Build it yourself (the project is in the `android/` folder; put your own `aimmianna-release.jks` in `android/app/`, it is never committed):

```bash
cp -r index.html app.js world3d.js styles.css sw.js SAYINGS.json manifest.webmanifest version.json vendor assets \
      android/app/src/main/assets/www/
mkdir -p android/app/src/main/assets/www  # (run the cp after this)
cd android && ./gradlew assembleRelease
# -> app/build/outputs/apk/release/app-release.apk
```

**Keep `aimmianna-release.jks` safe.** Android only installs an update over the old app (keeping her data) if it's signed with the same key.

## Updates

- `version.json` holds `{ "version", "build", "notes", "apk" }`.
- Web / iPhone: she checks once a day, and the service worker brings in the new files. You'll see a **Reload** prompt.
- Android: she reads `version.json` from `https://raw.githubusercontent.com/Evilwayz80/Aimmianna-AI/main/version.json`. If `build` is higher than hers, she downloads `apk` (the GitHub release asset `Aimmianna.apk`) and Android asks you to install it. Her data is kept.
- Releasing an update:
  1. Bump `APP_BUILD` in `app.js`, `versionCode` in `app/build.gradle` and `build` in `version.json`.
  2. Build.
  3. Attach `Aimmianna.apk` to a new GitHub Release.
  4. Push `version.json`.

## Music + video

- **Spotify:** links and the mood buttons work with no setup. To enable search, your playlists and Spotify Connect (Premium):
  1. Go to developer.spotify.com › Dashboard › Create app.
  2. Set the Redirect URI to the exact app URL shown in Settings.
  3. Copy the Client ID into Settings › Spotify. Sign-in uses PKCE, so no secret is stored.

  The embedded player plays 30-second previews unless you're signed in to Spotify inside the player.
- **YouTube:** links work right away. For search, add a YouTube Data API v3 key; your Gemini key's project works if that API is enabled. Your playlists need an OAuth Web client ID, and Google blocks that sign-in inside the Android app, so use it in a browser.
- **Your photos and videos:** the pickers open your phone's own chooser:
  - iPhone: Photos/iCloud and Files (iCloud Drive, Google Drive, OneDrive)
  - Android: Google Photos, the Gallery, Drive and My Files

  You can also paste Google Drive, Dropbox or direct `.mp4` links to play on her TV.

## Her avatar (future 3D model)

The avatar is a module in `world3d.js`. The current one is a layered billboard: outfit base, hair through a hair mask, then makeup through face masks (`assets/masks/`), composited in `composeLook()` (`app.js`) and handed to `world.setLook(canvas)`.
To swap in a GLB or VRM model later:
1. Replace the avatar class in `world3d.js`, keeping the same interface: `object3d`, `setLook()`, `update(dt, t, camera, pose)`, `headHeight`, `pickMesh`.
2. Map wardrobe IDs to materials or meshes.

Nothing else needs to change.

## Learning to code with her — a beginner path

1. **Change a line she says.** Open `SAYINGS.json`, edit one greeting, reload. That's the whole loop of coding: edit, save, look.
2. **Restyle something.** In `styles.css`, find `--gold` and change the colour. Every gold accent changes.
3. **Read one feature end to end.** Search `app.js` for `brewCoffee` to see a button tap, an animation in `world3d.js`, a sound and her spoken reaction.
4. **Add an outfit.** Add an image in `assets/outfits/` and one line to the `OUTFITS` list in `app.js`.
5. **Learn the tools:**
   - HTML/CSS/JavaScript: MDN Web Docs (developer.mozilla.org)
   - 3D: threejs.org/manual
   - Git: GitHub Skills (skills.github.com)

## Files

| File | What it is |
|---|---|
| `index.html` / `styles.css` | Screens, panels, dock, settings |
| `app.js` | Her brain: Gemini chat + function calling, memory, rules, skills, wardrobe, routine, devices, media, home folder, updates |
| `world3d.js` | The Three.js apartment, devices, avatar, camera, gyro |
| `SAYINGS.json` | Her personality lines |
| `server.py` | Voice + home-folder backend |
| `sw.js` / `manifest.webmanifest` | Offline + Home Screen app |
| `version.json` | Update info |
