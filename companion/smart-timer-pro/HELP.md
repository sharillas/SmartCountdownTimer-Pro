# Smart Timer Pro - Companion Module

Bitfocus Companion module to control **Smart Timer Pro** stage timer from an Elgato Stream Deck.

## Features

- **GO / Pause** -- Start/pause buttons with GO and PAUSE icons
- **Smart Timer Button** -- Toggle start/pause with live time display and auto-coloring border (green=running, orange=warning <2min, red=expired)
- **Timer Display** -- Read-only HH / MM / SS display across 3 big buttons
- **Reset Time** -- Reset to last set time
- **Display Modes** -- Switch between Countdown, Count-Up, Time of Day, and Idle/Logo
- **Quick Messages** -- 5 instant triggers for pre-configured messages
- **Quick Times** -- Reset to 1m, 5m, 10m, 15m, 30m, 60m with one button
- **Manual Adjustments** -- +1min / -1min on the fly
- **Toggle Message** -- Show/hide message on the presenter screen
- **Design** -- Black buttons with white text and colored borders, with large white Google Material icons

## Installation

### Method 1: Companion Developer Mode

1. Enable Developer Mode in Companion (Settings gear icon > Enable Developer Mode)
2. Choose a folder for developer modules
3. Copy this module folder to your developer modules directory
4. Restart Companion

### Method 2: Import Package (.tgz)

1. In Companion: Modules > Import Module Package
2. Select the `companion-module-smart-timer-pro-1.4.0.tgz` file

### Method 3: Manual Install (Companion Pi)

```bash
# Copy module to developer folder
sudo mkdir -p /opt/companion-module-dev/smart-timer-pro
sudo cp -r ./* /opt/companion-module-dev/smart-timer-pro/

# Install dependencies
cd /opt/companion-module-dev/smart-timer-pro
sudo npm install @companion-module/base@^1.8.0

# Fix permissions and restart
sudo chown -R companion:companion /opt/companion-module-dev/smart-timer-pro
sudo systemctl restart companion
```

## Configuration

1. Open Companion Web UI
2. Go to Connections
3. Add new connection: search "Smart Timer Pro"
4. Enter the IP address of the PC running Smart Timer Pro
5. Port: 3000 (default)
6. Click Save

## Presets

| Category | Presets |
|---|---|
| Timer Display | Hours (HH), Minutes (MM), Seconds (SS) -- big read-only display buttons |
| Smart Controls | Smart Timer Button (toggle + time), GO (start), Pause, Reset Time, Toggle Message |
| Quick Messages | Instant triggers for slots 1-5 |
| Display Modes | Countdown, Count-Up, Time of Day, Idle/Logo |
| Quick Times | Reset to 1m, 5m, 10m, 15m, 30m, 60m |
| Manual Adjustments | +1 Minute, -1 Minute |

## Variables

| Variable | Description |
|---|---|
| `$(smart-timer-pro:time)` | Current timer display (MM:SS) |
| `$(smart-timer-pro:raw_seconds)` | Raw seconds value |
| `$(smart-timer-pro:over_time)` | Overtime string (+MM:SS) |
| `$(smart-timer-pro:mode)` | Current mode |
| `$(smart-timer-pro:hours)` | Hours (HH, zero-padded) |
| `$(smart-timer-pro:minutes)` | Minutes (MM, zero-padded) |
| `$(smart-timer-pro:seconds)` | Seconds (SS, zero-padded) |
| `$(smart-timer-pro:sign)` | "-" when the timer is in overtime |
| `$(smart-timer-pro:msg_1)` through `$(smart-timer-pro:msg_5)` | Quick message text |

## Requirements

- Smart Timer Pro v1.4.0 or later running on the same network
- Bitfocus Companion v3.4 or later (for colored button borders)
- Elgato Stream Deck

## Support

For issues or feature requests, contact smartchoice.
