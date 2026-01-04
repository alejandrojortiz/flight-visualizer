/**
 * Flight Visualizer - Google Apps Script Backend
 * 
 * Serves trip data from Google Sheets as a web app.
 * 
 * Sheet Structure:
 * - Trips: trip_id, trip_name, start_date, end_date
 * - Legs: trip_id, leg_order, origin, destination, departure_date, arrival_date, mode
 */

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  TRIPS_SHEET: 'Trips',
  LEGS_SHEET: 'Legs',
  APP_TITLE: 'Flight Visualizer'  // Change this to customize your app title
};

// ============================================================================
// Custom Menu (appears when spreadsheet opens)
// ============================================================================

/**
 * Creates the Flight Visualizer menu when the spreadsheet opens.
 * This is an installable trigger that runs automatically.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Flight Visualizer')
    .addItem('📋 Initial Setup', 'showSetupDialog')
    .addItem('🔄 Refresh Airport Data', 'setupAirportData')
    .addSeparator()
    .addItem('➕ Add Sample Trips', 'createSampleData')
    .addItem('🗑️ Clear All Data', 'showClearDataDialog')
    .addSeparator()
    .addItem('🌐 Deploy Web App', 'showDeployInstructions')
    .addItem('❓ Help', 'showHelp')
    .addToUi();
}

/**
 * Shows the initial setup dialog and runs setup if confirmed.
 */
function showSetupDialog() {
  const ui = SpreadsheetApp.getUi();
  
  // Check if already set up
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const airportsSheet = ss.getSheetByName('_AirportsCache');
  const tripsSheet = ss.getSheetByName(CONFIG.TRIPS_SHEET);
  
  if (airportsSheet && tripsSheet) {
    const result = ui.alert(
      'Setup Already Complete',
      'It looks like Flight Visualizer is already set up.\n\n' +
      'Would you like to run setup again? This will refresh the airport database.',
      ui.ButtonSet.YES_NO
    );
    if (result !== ui.Button.YES) return;
  }
  
  // Run setup
  runInitialSetup();
}

/**
 * Runs the complete initial setup process.
 * Creates sheets and downloads airport data.
 */
function runInitialSetup() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Show progress
    SpreadsheetApp.getActiveSpreadsheet().toast('Setting up Flight Visualizer...', '🚀 Setup', -1);
    
    // Step 1: Create Trips and Legs sheets if they don't exist
    ensureDataSheets_();
    
    // Step 2: Download airport data
    setupAirportData();
    
    // Success!
    SpreadsheetApp.getActiveSpreadsheet().toast('Setup complete! You can now add trips.', '✅ Success', 5);
    
    ui.alert(
      '✅ Setup Complete!',
      'Flight Visualizer is ready to use.\n\n' +
      'Next steps:\n' +
      '1. Add your trips using the web app\n' +
      '2. Or click "Add Sample Trips" to see example data\n' +
      '3. Deploy as a Web App to access the globe visualization\n\n' +
      'Click "🚀 Flight Visualizer > Deploy Web App" for deployment instructions.',
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Setup failed: ' + error.toString(), '❌ Error', 10);
    throw error;
  }
}

/**
 * Creates the Trips and Legs sheets if they don't exist.
 * @private
 */
function ensureDataSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create Trips sheet
  let tripsSheet = ss.getSheetByName(CONFIG.TRIPS_SHEET);
  if (!tripsSheet) {
    tripsSheet = ss.insertSheet(CONFIG.TRIPS_SHEET);
    tripsSheet.appendRow(['trip_id', 'trip_name', 'start_date', 'end_date']);
    tripsSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    tripsSheet.setFrozenRows(1);
    Logger.log('Created Trips sheet');
  }
  
  // Create Legs sheet
  let legsSheet = ss.getSheetByName(CONFIG.LEGS_SHEET);
  if (!legsSheet) {
    legsSheet = ss.insertSheet(CONFIG.LEGS_SHEET);
    legsSheet.appendRow(['trip_id', 'leg_order', 'origin', 'destination', 'departure_date', 'arrival_date', 'mode']);
    legsSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    legsSheet.setFrozenRows(1);
    Logger.log('Created Legs sheet');
  }
}

/**
 * Shows deployment instructions in a dialog.
 */
function showDeployInstructions() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; line-height: 1.6; }
      h2 { color: #1a73e8; margin-top: 0; }
      ol { padding-left: 20px; }
      li { margin-bottom: 12px; }
      code { background: #f1f3f4; padding: 2px 6px; border-radius: 4px; }
      .note { background: #e8f0fe; padding: 12px; border-radius: 8px; margin-top: 16px; }
    </style>
    <h2>🌐 Deploy as Web App</h2>
    <ol>
      <li>Click <strong>Extensions → Apps Script</strong> in the menu bar above</li>
      <li>In the Apps Script editor, click <strong>Deploy → New deployment</strong></li>
      <li>Click the gear ⚙️ next to "Select type" and choose <strong>Web app</strong></li>
      <li>Set the description (e.g., "Flight Visualizer v1")</li>
      <li>Under "Who has access", select:
        <ul>
          <li><strong>Only myself</strong> - for private use</li>
          <li><strong>Anyone</strong> - to share with others</li>
        </ul>
      </li>
      <li>Click <strong>Deploy</strong></li>
      <li>Click <strong>Authorize access</strong> and grant permissions</li>
      <li>Copy the <strong>Web app URL</strong> - this is your Flight Visualizer!</li>
    </ol>
    <div class="note">
      <strong>💡 Tip:</strong> Bookmark the Web app URL for easy access. 
      You can also share this URL with others if you selected "Anyone" access.
    </div>
  `)
    .setWidth(500)
    .setHeight(450);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Deploy Web App');
}

/**
 * Shows a confirmation dialog before clearing all data.
 */
function showClearDataDialog() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    '⚠️ Clear All Data?',
    'This will delete ALL trips and legs from your spreadsheet.\n\n' +
    'This action cannot be undone!\n\n' +
    'Are you sure you want to continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    clearAllData_();
    ui.alert('Data Cleared', 'All trips and legs have been removed.', ui.ButtonSet.OK);
  }
}

/**
 * Clears all data from Trips and Legs sheets (keeps headers).
 * @private
 */
function clearAllData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const tripsSheet = ss.getSheetByName(CONFIG.TRIPS_SHEET);
  if (tripsSheet && tripsSheet.getLastRow() > 1) {
    tripsSheet.deleteRows(2, tripsSheet.getLastRow() - 1);
  }
  
  const legsSheet = ss.getSheetByName(CONFIG.LEGS_SHEET);
  if (legsSheet && legsSheet.getLastRow() > 1) {
    legsSheet.deleteRows(2, legsSheet.getLastRow() - 1);
  }
  
  Logger.log('All data cleared');
}

/**
 * Shows help information.
 */
function showHelp() {
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; line-height: 1.6; }
      h2 { color: #1a73e8; margin-top: 0; }
      h3 { color: #5f6368; margin-bottom: 8px; }
      p { margin-top: 0; }
      a { color: #1a73e8; }
    </style>
    <h2>❓ Flight Visualizer Help</h2>
    
    <h3>Getting Started</h3>
    <p>1. Run "Initial Setup" to download airport data<br>
    2. Deploy as a Web App to view the 3D globe<br>
    3. Add trips using the web interface</p>
    
    <h3>Adding Trips</h3>
    <p>Use the web app to add trips with multiple legs. Each leg can be a flight 
    (use airport codes like JFK, LAX) or ground transport (use city names).</p>
    
    <h3>Transport Modes</h3>
    <p>✈️ Flight - Uses airport codes (3 letters)<br>
    🚂 Train - Uses city/station names<br>
    🚗 Car - Uses city names<br>
    ⛴️ Ferry - Uses port/city names</p>
    
    <h3>Need More Help?</h3>
    <p><a href="https://github.com/alejandrojortiz/flight-visualizer" target="_blank">View documentation on GitHub</a></p>
  `)
    .setWidth(450)
    .setHeight(400);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Help');
}

// ============================================================================
// Web App Entry Point
// ============================================================================

/**
 * Handles GET requests to the web app.
 * 
 * @param {Object} e - Event object containing request parameters
 * @returns {HtmlOutput|TextOutput} HTML page or JSON data
 */
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getData') {
    const data = getTripData();
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return HtmlService
    .createTemplateFromFile('index')
    .evaluate()
    .setTitle(CONFIG.APP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Returns the app title for use in the frontend.
 * @returns {string} The configured app title
 */
function getAppTitle() {
  return CONFIG.APP_TITLE;
}

/**
 * Include HTML files as templates (for modular code organization)
 * @param {string} filename - Name of the HTML file to include (without .html extension)
 * @returns {string} The content of the HTML file
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================================
// Data Access
// ============================================================================

/**
 * Retrieves all trip data from the spreadsheet.
 * 
 * @returns {Object} Object containing trips array with nested legs
 */
function getTripData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const tripsSheet = ss.getSheetByName(CONFIG.TRIPS_SHEET);
    if (!tripsSheet) {
      Logger.log('Warning: Trips sheet not found');
      return { trips: [] };
    }
    
    const tripsData = getSheetData_(tripsSheet);
    const legsSheet = ss.getSheetByName(CONFIG.LEGS_SHEET);
    const legsData = legsSheet ? getSheetData_(legsSheet) : [];
    
    const trips = buildTripsWithLegs_(tripsData, legsData);
    
    return { trips: trips };
    
  } catch (error) {
    Logger.log('Error in getTripData: ' + error.toString());
    return { trips: [], error: error.toString() };
  }
}

/**
 * Reads sheet data as array of objects.
 * @private
 */
function getSheetData_(sheet) {
  const data = sheet.getDataRange().getValues();
  
  if (data.length < 2) return [];
  
  const headers = data[0].map(h => h.toString().trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }
  
  return rows;
}

/**
 * Builds trips array with nested legs.
 * @private
 */
function buildTripsWithLegs_(tripsData, legsData) {
  const legsByTrip = {};
  legsData.forEach(leg => {
    const tripId = leg.trip_id?.toString().trim();
    if (!tripId) return;
    if (!legsByTrip[tripId]) legsByTrip[tripId] = [];
    legsByTrip[tripId].push(leg);
  });
  
  const trips = tripsData.map(trip => {
    const tripId = trip.trip_id?.toString().trim();
    if (!tripId) return null;
    
    const tripLegs = (legsByTrip[tripId] || [])
      .sort((a, b) => (Number(a.leg_order) || 0) - (Number(b.leg_order) || 0))
      .map(leg => formatLeg_(leg))
      .filter(leg => leg !== null);
    
    return {
      id: tripId,
      name: trip.trip_name?.toString().trim() || tripId,
      startDate: formatDate_(trip.start_date),
      endDate: formatDate_(trip.end_date),
      legs: tripLegs
    };
  }).filter(trip => trip !== null);
  
  return trips;
}

/**
 * Formats a leg with resolved coordinates.
 * Uses airport lookup for flights, geocoding for other modes.
 * @private
 */
function formatLeg_(leg) {
  const originLocation = leg.origin?.toString().trim();
  const destLocation = leg.destination?.toString().trim();
  const mode = (leg.mode?.toString().trim().toLowerCase()) || 'flight';
  
  if (!originLocation || !destLocation) {
    Logger.log('Warning: Leg missing origin or destination');
    return null;
  }
  
  // Resolve locations based on mode
  const origin = resolveLocation(originLocation, mode);
  const destination = resolveLocation(destLocation, mode);
  
  if (!origin) {
    Logger.log(`Warning: Could not resolve origin "${originLocation}" for mode "${mode}"`);
    return null;
  }
  
  if (!destination) {
    Logger.log(`Warning: Could not resolve destination "${destLocation}" for mode "${mode}"`);
    return null;
  }
  
  const formattedLeg = {
    order: Number(leg.leg_order) || 1,
    origin: origin,
    destination: destination,
    departureDate: formatDate_(leg.departure_date),
    mode: mode
  };
  
  if (leg.arrival_date) {
    formattedLeg.arrivalDate = formatDate_(leg.arrival_date);
  }
  
  return formattedLeg;
}

/**
 * Formats a date to YYYY-MM-DD.
 * @private
 */
function formatDate_(dateValue) {
  if (!dateValue) return null;
  
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  
  if (isNaN(date.getTime())) return null;
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
