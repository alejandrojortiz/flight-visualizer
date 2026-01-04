/**
 * Airport Data Setup
 * 
 * Run setupAirportData() to fetch airports from OpenFlights and populate the cache sheet.
 * This should be run once during initial setup, and again whenever you want to refresh.
 * 
 * Source: https://github.com/jpatokal/openflights
 */

const OPENFLIGHTS_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';

/**
 * SETUP FUNCTION - Run this manually to populate/refresh airport data.
 * 
 * Fetches ~6,000 airports from OpenFlights and saves to the _AirportsCache sheet.
 * @throws {Error} If airport data cannot be fetched
 */
function setupAirportData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Downloading airport database...', '✈️ Airports', -1);
  
  Logger.log('Fetching airport data from OpenFlights...');
  
  const airports = fetchAirportsFromOpenFlights_();
  const count = Object.keys(airports).length;
  
  if (count === 0) {
    ss.toast('Failed to download airport data. Check your internet connection.', '❌ Error', 10);
    throw new Error('Failed to fetch airport data from OpenFlights. The network request may have failed or been blocked.');
  }
  
  saveAirportsToSheet_(airports);
  
  // Clear any cached "not found" results from previous failed lookups
  clearAirportLookupCache_();
  
  ss.toast(`Loaded ${count} airports!`, '✅ Airports', 3);
  Logger.log(`SUCCESS: Loaded ${count} airports into the _AirportsCache sheet.`);
}

/**
 * Clears all cached airport lookups.
 * This is important after refreshing airport data to clear any stale "not found" entries.
 * @private
 */
function clearAirportLookupCache_() {
  try {
    // CacheService doesn't have a "clear all" method, but we can remove known keys
    // The cache entries expire after 6 hours anyway, but clearing common codes helps
    const cache = CacheService.getScriptCache();
    const commonCodes = [
      'JFK', 'LAX', 'ORD', 'DFW', 'DEN', 'SFO', 'SEA', 'LAS', 'MCO', 'EWR',
      'LHR', 'CDG', 'AMS', 'FRA', 'MAD', 'FCO', 'MUC', 'ZRH', 'VIE', 'BRU',
      'NRT', 'HND', 'ICN', 'SIN', 'HKG', 'BKK', 'SYD', 'MEL', 'AKL', 'DXB',
      'EZE', 'GRU', 'MEX', 'BOG', 'LIM', 'SCL', 'BRC', 'KIX', 'KEF', 'NCE'
    ];
    const keys = commonCodes.map(code => 'airport_' + code);
    cache.removeAll(keys);
    Logger.log('Cleared airport lookup cache for ' + keys.length + ' common codes');
  } catch (e) {
    Logger.log('Warning: Could not clear airport cache: ' + e.toString());
  }
}

/**
 * Fetches and parses airport data from OpenFlights.
 * @private
 * @throws {Error} If the network request fails
 */
function fetchAirportsFromOpenFlights_() {
  const airports = {};
  
  Logger.log('Fetching airports from OpenFlights...');
  Logger.log('URL: ' + OPENFLIGHTS_URL);
  
  // Attempt fetch - don't catch, let errors bubble up
  const response = UrlFetchApp.fetch(OPENFLIGHTS_URL, {
    muteHttpExceptions: true,
    followRedirects: true
  });
  
  const responseCode = response.getResponseCode();
  Logger.log('Response code: ' + responseCode);
  
  if (responseCode !== 200) {
    throw new Error('Failed to fetch airports: HTTP ' + responseCode);
  }
  
  const csv = response.getContentText();
  const lines = csv.split('\n');
  Logger.log('Received ' + lines.length + ' lines of data');
  
  for (const line of lines) {
    const fields = parseCSVLine_(line);
    
    if (fields.length < 8) continue;
    
    const iata = fields[4].replace(/"/g, '').trim();
    const name = fields[1].replace(/"/g, '').trim();
    const city = fields[2].replace(/"/g, '').trim();
    const lat = parseFloat(fields[6]);
    const lng = parseFloat(fields[7]);
    
    // Only include airports with valid IATA codes (3 letters)
    if (iata && iata.length === 3 && iata !== '\\N' && !isNaN(lat) && !isNaN(lng)) {
      airports[iata] = {
        name: city ? `${city} ${name}`.substring(0, 50) : name.substring(0, 50),
        lat: lat,
        lng: lng
      };
    }
  }
  
  Logger.log(`Parsed ${Object.keys(airports).length} airports from OpenFlights`);
  
  return airports;
}

/**
 * Saves airport data to the cache sheet.
 * @private
 */
function saveAirportsToSheet_(airports) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = '_AirportsCache';
  
  // Create or clear the cache sheet
  let cacheSheet = ss.getSheetByName(sheetName);
  if (!cacheSheet) {
    cacheSheet = ss.insertSheet(sheetName);
    cacheSheet.hideSheet();
  } else {
    cacheSheet.clear();
  }
  
  // Build data array
  const rows = [['code', 'name', 'lat', 'lng']];
  for (const [code, data] of Object.entries(airports)) {
    rows.push([code, data.name, data.lat, data.lng]);
  }
  
  // Write all at once
  cacheSheet.getRange(1, 1, rows.length, 4).setValues(rows);
  
  // Sort by code for faster lookups
  cacheSheet.getRange(2, 1, rows.length - 1, 4).sort(1);
  
  Logger.log(`Saved ${rows.length - 1} airports to cache sheet`);
}

/**
 * Parses a CSV line handling quoted fields with commas.
 * @private
 */
function parseCSVLine_(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  
  return fields;
}

/**
 * Test function to verify airport lookup works.
 */
function testAirportLookup() {
  const testCodes = ['JFK', 'LAX', 'LHR', 'NRT', 'SYD', 'INVALID'];
  
  for (const code of testCodes) {
    const start = Date.now();
    const airport = getAirport(code);
    const elapsed = Date.now() - start;
    Logger.log(`${code} (${elapsed}ms): ${airport ? JSON.stringify(airport) : 'NOT FOUND'}`);
  }
}

