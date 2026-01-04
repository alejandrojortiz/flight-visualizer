/**
 * Airport Lookup Functions
 * 
 * Provides airport coordinate lookups from the _AirportsCache sheet.
 * Uses CacheService for performance.
 * 
 * Run setupAirportData() (in setup/setupAirports.gs) to populate the sheet.
 */

const AIRPORTS_SHEET_NAME = '_AirportsCache';
const CACHE_PREFIX = 'airport_';
const CACHE_DURATION = 21600; // 6 hours (max allowed)

/**
 * Looks up an airport by its IATA code.
 * 
 * @param {string} code - The IATA airport code (e.g., "JFK")
 * @returns {Object|null} Airport object with code, name, lat, lng or null if not found
 */
function getAirport(code) {
  if (!code) return null;
  
  const normalizedCode = code.toString().trim().toUpperCase();
  
  // Check cache first
  const cache = CacheService.getScriptCache();
  const cacheKey = CACHE_PREFIX + normalizedCode;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    if (cached === 'null') return null;
    try {
      return JSON.parse(cached);
    } catch (e) {
      // Invalid cache, fall through to sheet lookup
    }
  }
  
  // Look up in sheet
  const airport = lookupAirportInSheet_(normalizedCode);
  
  // Cache the result
  if (airport) {
    cache.put(cacheKey, JSON.stringify(airport), CACHE_DURATION);
  } else {
    cache.put(cacheKey, 'null', CACHE_DURATION);
  }
  
  return airport;
}

/**
 * Looks up a single airport in the cache sheet.
 * @private
 */
function lookupAirportInSheet_(code) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(AIRPORTS_SHEET_NAME);
  
  if (!sheet) {
    Logger.log('Warning: _AirportsCache sheet not found. Run setupAirportData() first.');
    return null;
  }
  
  const finder = sheet.createTextFinder(code).matchEntireCell(true).matchCase(true);
  const cell = finder.findNext();
  
  if (!cell) {
    Logger.log(`Warning: Airport code "${code}" not found`);
    return null;
  }
  
  const row = cell.getRow();
  const [foundCode, name, lat, lng] = sheet.getRange(row, 1, 1, 4).getValues()[0];
  
  return {
    code: foundCode,
    name: name,
    lat: lat,
    lng: lng
  };
}

/**
 * Checks if an airport code exists.
 * 
 * @param {string} code - The IATA airport code
 * @returns {boolean} True if the airport exists
 */
function hasAirport(code) {
  return getAirport(code) !== null;
}
