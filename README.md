# ✈️ Flight Visualizer

A beautiful 3D globe visualization for your travel history. Track flights, train journeys, road trips, and ferry crossings — all rendered on an interactive globe.

<!-- TODO: Add screenshot once deployed -->

## ✨ Features

- 🌍 **Interactive 3D Globe** — Powered by Globe.gl with smooth animations
- ✈️ **Multi-modal Transport** — Flights, trains, cars, and ferries
- 📝 **Full CRUD** — Add, edit, and delete trips directly in the app
- 🎬 **Year in Review** — Animated playback of all your travels
- 📱 **Responsive Design** — Works on desktop and mobile
- 🆓 **100% Free** — No hosting costs, runs entirely on Google infrastructure

## 🚀 Quick Start (5 minutes)

### Step 1: Copy the Template

1. **[Click here to copy the Flight Visualizer template](https://docs.google.com/spreadsheets/d/1vm8wZf7FH3WMfYeNDxa8WRwiQqLckuUmUz70FmudV_Q/copy)**
2. Click **"Make a copy"** when prompted
3. Your copy opens automatically

### Step 2: Run Initial Setup

1. Wait for the **🚀 Flight Visualizer** menu to appear (takes ~5 seconds)
2. Click **🚀 Flight Visualizer → 📋 Initial Setup**
3. Click **"Continue"** to authorize the script
4. Review permissions and click **"Allow"**
5. Wait for setup to complete (~30 seconds)

> ⚠️ **"This app hasn't been verified by Google"** — This warning is normal for personal Apps Script projects. Click **"Advanced"** → **"Go to Flight Visualizer (unsafe)"** to proceed. The app only accesses your own spreadsheet.

### Step 3: Deploy as Web App

1. Click **🚀 Flight Visualizer → 🌐 Deploy Web App**
2. Follow the instructions in the dialog
3. Copy your Web App URL — this is your Flight Visualizer!

### Step 4: Add Your Trips

1. Open your Web App URL
2. Click the **+** button to add a trip
3. Enter your trip details and legs
4. Watch them appear on the globe! 🌍

## 📸 Screenshots

<!-- TODO: Add screenshots -->
<!-- | Globe View | Add Trip | Year in Review |
|------------|----------|----------------|
| ![Globe](screenshots/globe.png) | ![Add Trip](screenshots/add-trip.png) | ![Review](screenshots/review.png) | -->

## 🎨 Customization

### Change the App Title

1. Open your spreadsheet
2. Click **Extensions → Apps Script**
3. In `Code.gs`, find the `CONFIG` object:
   ```javascript
   const CONFIG = {
     TRIPS_SHEET: 'Trips',
     LEGS_SHEET: 'Legs',
     APP_TITLE: 'Flight Visualizer'  // ← Change this!
   };
   ```
4. Save and redeploy

### Change Colors

Edit `src/index.html` and modify the Tailwind config colors:
```javascript
colors: {
  space: '#0a0a1a',           // Background
  'route-active': '#f4a261',  // Route color
  accent: '#2a9d8f'           // Accent color
}
```

## 🛠️ Developer Setup (Using Clasp)

For developers who want to modify the code locally:

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [clasp](https://github.com/google/clasp) (`npm install -g @google/clasp`)

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/alejandrojortiz/flight-visualizer.git
   cd flight-visualizer
   ```

2. Login to clasp:
   ```bash
   clasp login
   ```

3. Create a new Google Apps Script project:
   ```bash
   clasp create --title "Flight Visualizer" --type sheets --rootDir ./src
   ```

4. Push the code:
   ```bash
   clasp push
   ```

5. Open in browser:
   ```bash
   clasp open
   ```

### Development Workflow

```bash
# Push local changes to Apps Script
clasp push

# Pull remote changes to local
clasp pull

# Watch for changes and auto-push
clasp push --watch

# Deploy a new version
clasp deploy --description "v1.1"
```

## 📁 Project Structure

```
flight-visualizer/
├── src/
│   ├── Code.gs              # Main entry point, menu, web app
│   ├── airports.gs          # Airport IATA code lookups
│   ├── locations.gs         # Geocoding for cities (train/car/ferry)
│   ├── crud.gs              # Create, update, delete operations
│   ├── index.html           # Main HTML template
│   ├── app.js.html          # App state and data loading
│   ├── globe.js.html        # 3D globe rendering
│   ├── animations.js.html   # Arc animations
│   ├── ui.js.html           # UI rendering and modals
│   ├── styles.html          # Custom CSS
│   ├── appsscript.json      # Apps Script manifest
│   └── setup/
│       ├── setupAirports.gs # Downloads airport database
│       └── setupTrips.gs    # Sample trip data
├── .clasp.json.example      # Clasp config template
├── .claspignore             # Files to exclude from push
└── README.md
```

## 🗺️ Transport Modes

| Mode | Input Format | Example |
|------|--------------|---------|
| ✈️ Flight | IATA airport code (3 letters) | `JFK`, `LAX`, `NRT` |
| 🚂 Train | City or station name | `Paris, France` |
| 🚗 Car | City name | `San Francisco, CA` |
| ⛴️ Ferry | Port or city name | `Dover, UK` |

Flight legs use the [OpenFlights](https://openflights.org/data.html) database (~6,000 airports).
Other transport modes use Google Maps geocoding.

## ❓ FAQ

### Why Google Apps Script?

- **Free hosting** — Google hosts your app at no cost
- **Free geocoding** — No API keys or billing setup required
- **Familiar data layer** — Your trips live in a Google Sheet you own
- **Easy sharing** — Just share the Web App URL

### Can I use this without a Google account?

The app must be deployed from a Google account, but you can share the Web App URL with anyone (if you set access to "Anyone").

### How do I update to a new version?

If you cloned the template, you'll need to manually update by copying the new code. For developers using clasp, just `git pull` and `clasp push`.

### My airport code isn't recognized

Make sure you're using a valid 3-letter IATA code. You can search the [OpenFlights database](https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat) to verify. Small regional airports may not have IATA codes.

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 🙏 Credits

- [Globe.gl](https://globe.gl/) — 3D globe visualization
- [OpenFlights](https://openflights.org/data.html) — Airport database
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Leaflet](https://leafletjs.com/) — 2D map for short legs

