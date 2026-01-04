/**
 * Location Resolution Functions
 * 
 * Resolves locations to coordinates based on transport mode:
 * - flight: Uses airport code lookup
 * - train/car/ferry: Uses Google Maps geocoding with sheet-based caching
 */

const LOCATIONS_CACHE_SHEET = '_LocationsCache';

// ============================================================================
// Main Resolution Functions
// ============================================================================

/**
 * Resolves a location to coordinates based on transport mode.
 * 
 * @param {string} location - Airport code (for flights) OR city/address (for other modes)
 * @param {string} mode - Transport mode: 'flight', 'train', 'car', 'ferry'
 * @returns {Object|null} Location object { code?, name, lat, lng } or null if not found
 */
function resolveLocation(location, mode) {
  if (!location || !location.trim()) return null;
  
  const trimmed = location.trim();
  
  if (mode === 'flight') {
    // Use existing airport lookup
    const airport = getAirport(trimmed.toUpperCase());
    if (airport) {
      return {
        code: airport.code,
        name: airport.name,
        lat: airport.lat,
        lng: airport.lng
      };
    }
    return null;
  }
  
  // For other modes (train, car, ferry), use geocoding with cache
  return geocodeLocation(trimmed);
}

/**
 * Geocodes an address or city name using Google Maps.
 * Uses sheet-based caching to minimize API calls.
 * 
 * @param {string} address - City name, station name, or address
 * @returns {Object|null} Location object { name, lat, lng } or null if not found
 */
function geocodeLocation(address) {
  if (!address || address.trim() === '') return null;
  
  const normalizedAddress = address.trim();
  
  // 1. Check cache first
  const cached = getLocationFromCache_(normalizedAddress);
  if (cached) {
    return cached;
  }
  
  // 2. Not in cache - call Google Maps API
  try {
    const response = Maps.newGeocoder().geocode(normalizedAddress);
    
    if (response.status === 'OK' && response.results && response.results.length > 0) {
      const result = response.results[0];
      const location = {
        name: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      };
      
      // 3. Save to cache for future use
      saveLocationToCache_(normalizedAddress, location);
      
      return location;
    }
    
    Logger.log('Geocoding returned no results for: ' + address);
    return null;
    
  } catch (error) {
    Logger.log('Geocoding error for "' + address + '": ' + error.toString());
    return null;
  }
}

/**
 * Validates that a location can be resolved for the given mode.
 * 
 * @param {string} location - Location string
 * @param {string} mode - Transport mode
 * @returns {boolean} True if location is valid
 */
function validateLocation(location, mode) {
  return resolveLocation(location, mode) !== null;
}

/**
 * Searches for locations based on mode.
 * For flights: searches airports
 * For other modes: uses Google Maps autocomplete-style search
 * 
 * @param {string} query - Search query
 * @param {string} mode - Transport mode
 * @param {number} limit - Max results (default 5)
 * @returns {Array} Array of location suggestions
 */
function searchLocations(query, mode, limit) {
  limit = limit || 5;
  
  if (!query || query.trim().length < 2) return [];
  
  if (mode === 'flight') {
    // Use existing airport search
    return searchAirports(query, limit);
  }
  
  // For other modes, geocode the query and return the top result
  // Note: Google Maps Geocoder doesn't have a true autocomplete API in Apps Script
  // We'll return a single geocoded result as a suggestion
  const result = geocodeLocation(query);
  
  if (result) {
    return [{
      name: result.name,
      lat: result.lat,
      lng: result.lng,
      display: result.name
    }];
  }
  
  return [];
}

// ============================================================================
// Location Cache (Sheet-based)
// ============================================================================

/**
 * Gets or creates the locations cache sheet.
 * @private
 */
function getLocationsCacheSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(LOCATIONS_CACHE_SHEET);
  
  if (!sheet) {
    // Create the cache sheet with headers
    sheet = ss.insertSheet(LOCATIONS_CACHE_SHEET);
    sheet.appendRow(['query', 'name', 'lat', 'lng', 'cached_at']);
    sheet.hideSheet();  // Keep it hidden like _AirportsCache
    Logger.log('Created _LocationsCache sheet');
  }
  
  return sheet;
}

/**
 * Looks up a location in the cache by query string.
 * @private
 */
function getLocationFromCache_(query) {
  const sheet = getLocationsCacheSheet_();
  const normalizedQuery = query.toLowerCase().trim();
  
  // Search for the query in the first column
  const finder = sheet.createTextFinder(normalizedQuery)
    .matchEntireCell(true)
    .matchCase(false);
  const cell = finder.findNext();
  
  if (!cell) return null;
  
  const row = cell.getRow();
  const [, name, lat, lng] = sheet.getRange(row, 1, 1, 4).getValues()[0];
  
  return {
    name: name,
    lat: lat,
    lng: lng
  };
}

/**
 * Saves a geocoded location to the cache.
 * @private
 */
function saveLocationToCache_(query, location) {
  const sheet = getLocationsCacheSheet_();
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check if already exists (avoid duplicates)
  const finder = sheet.createTextFinder(normalizedQuery)
    .matchEntireCell(true)
    .matchCase(false);
  
  if (finder.findNext()) {
    // Already cached
    return;
  }
  
  // Append new row
  sheet.appendRow([
    normalizedQuery,
    location.name,
    location.lat,
    location.lng,
    new Date().toISOString()
  ]);
}

/**
 * Clears the location cache. Useful for testing or if data is stale.
 */
function clearLocationCache() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(LOCATIONS_CACHE_SHEET);
  
  if (sheet) {
    // Keep header row, delete data
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
    Logger.log('Location cache cleared');
  }
}

// ============================================================================
// Test Functions
// ============================================================================

/**
 * Test location resolution for different modes
 */
function testResolveLocation() {
  // Test flight mode (airport)
  const jfk = resolveLocation('JFK', 'flight');
  Logger.log('JFK (flight): ' + JSON.stringify(jfk));
  
  // Test train mode (city)
  const paris = resolveLocation('Paris, France', 'train');
  Logger.log('Paris (train): ' + JSON.stringify(paris));
  
  // Test car mode (address)
  const london = resolveLocation('London, UK', 'car');
  Logger.log('London (car): ' + JSON.stringify(london));
  
  // Test invalid airport
  const invalid = resolveLocation('XYZ', 'flight');
  Logger.log('XYZ (flight): ' + JSON.stringify(invalid));
  
  // Test geocoding failure
  const nonsense = resolveLocation('asdfghjkl12345', 'train');
  Logger.log('Nonsense (train): ' + JSON.stringify(nonsense));
}

/**
 * Test that caching works (second call should be faster and use cache)
 */
function testLocationCache() {
  const address = 'Berlin, Germany';
  
  // First call - should hit Google Maps API
  const start1 = Date.now();
  const result1 = geocodeLocation(address);
  const time1 = Date.now() - start1;
  Logger.log(`First call (${time1}ms): ${JSON.stringify(result1)}`);
  
  // Second call - should hit cache (faster)
  const start2 = Date.now();
  const result2 = geocodeLocation(address);
  const time2 = Date.now() - start2;
  Logger.log(`Second call (${time2}ms): ${JSON.stringify(result2)}`);
  
  // Verify cache was used (second call should be significantly faster)
  Logger.log(`Cache speedup: ${time1 - time2}ms faster`);
  
  // Verify results are the same
  Logger.log(`Results match: ${JSON.stringify(result1) === JSON.stringify(result2)}`);
}

