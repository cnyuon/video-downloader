# MediaTools Chrome Extension

A simple browser extension to download videos from the current tab using MediaTools.

## Installation

1. Open Chrome/Edge and go to `chrome://extensions`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked**.
4. Select this `extension` folder.
5. The MediaTools icon should appear in your toolbar.

## usage
Navigate to a video page (TikTok, YouTube, X, Facebook) and click the extension icon. It will open MediaTools with the URL pre-filled.

## Configuration
By default, it points to `http://localhost:4321`.
To change this to your production URL:
1. Edit `popup.js`.
2. Change `const BASE_URL = 'http://localhost:4321';` to your actual domain.
3. Reload the extension in `chrome://extensions`.
