# Contributing to Flight Visualizer

Thanks for your interest in contributing! 🎉

## Ways to Contribute

- 🐛 **Report bugs** — Open an issue describing the problem
- 💡 **Suggest features** — Open an issue with your idea
- 📖 **Improve docs** — Fix typos, add examples, clarify instructions
- 🔧 **Submit code** — Fix bugs or implement features

## Development Setup

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/flight-visualizer.git
   cd flight-visualizer
   ```

2. **Install clasp** (Google Apps Script CLI):
   ```bash
   npm install -g @google/clasp
   clasp login
   ```

3. **Create your own Apps Script project**:
   ```bash
   clasp create --title "Flight Visualizer Dev" --type sheets --rootDir ./src
   ```

4. **Push and test**:
   ```bash
   clasp push
   clasp open  # Opens the Apps Script editor
   ```

## Submitting Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test locally

3. Commit with a clear message (we prefer [Conventional Commits](https://www.conventionalcommits.org/)):
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug with X"
   git commit -m "docs: update README"
   ```

4. Push and open a Pull Request:
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style

- Use meaningful variable and function names
- Add JSDoc comments for functions
- Keep functions focused and small
- Handle errors gracefully (no silent failures)

## Project Structure

```
src/
├── Code.gs              # Main entry point, menu, web app
├── airports.gs          # Airport IATA lookups
├── locations.gs         # Geocoding for cities
├── crud.gs              # Create, update, delete operations
├── index.html           # Main HTML template
├── app.js.html          # App state and data loading
├── globe.js.html        # 3D globe rendering
├── animations.js.html   # Arc animations
├── ui.js.html           # UI rendering and modals
├── styles.html          # Custom CSS
└── setup/
    ├── setupAirports.gs # Airport database setup
    └── setupTrips.gs    # Sample data
```

## Questions?

Open an issue or start a discussion. We're happy to help!

