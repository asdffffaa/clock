# Fullscreen Stopwatch PWA

Minimal fullscreen stopwatch for iPhone, designed for landscape use.

## Controls

- Single tap anywhere: Start / Pause
- Double tap anywhere: Restart from 00:00:00
- Rotate iPhone horizontally for the full clock interface

## What is included

- Fullscreen black flip-clock style
- Hours / Minutes / Seconds
- Persistent stopwatch state
- Keeps accurate elapsed time even after iOS suspends the app
- Offline support after first successful load
- PWA manifest and iPhone home-screen icon
- Screen Wake Lock request when the stopwatch is running (when supported)

## Test on Windows

### Option A — VS Code Live Server

1. Install Visual Studio Code.
2. Open this folder in VS Code.
3. Install the extension "Live Server" by Ritwick Dey.
4. Right-click `index.html`.
5. Click `Open with Live Server`.

Important: installing the PWA on an iPhone requires an HTTPS website. Live Server is for testing on your PC.

## Put it online for free with GitHub Pages

1. Create a GitHub account if you do not have one.
2. Create a new public repository, for example:
   `fullscreen-stopwatch`
3. Upload all files from this project to the repository.
4. In GitHub open:
   `Settings -> Pages`
5. Under `Build and deployment` choose:
   `Deploy from a branch`
6. Branch:
   `main`
7. Folder:
   `/ (root)`
8. Click `Save`.
9. Wait for GitHub to show the published HTTPS address.

## Install on iPhone

1. Open the published HTTPS address in Safari.
2. Tap Share.
3. Tap `Add to Home Screen`.
4. If iOS offers `Open as Web App`, enable it.
5. Tap `Add`.
6. Launch `Stopwatch` from the iPhone Home Screen.
7. Rotate the iPhone horizontally.

## Note about landscape orientation

The web app requests landscape orientation in its manifest, but iOS may still follow the phone's Orientation Lock setting.
If the screen does not rotate, disable Portrait Orientation Lock in Control Center.
