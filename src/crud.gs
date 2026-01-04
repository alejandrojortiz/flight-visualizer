/**
 * CRUD Operations for Trip Management
 * 
 * Provides create, update, delete functionality for trips and legs.
 * All functions return { success: true/false, ... } format for frontend use.
 */

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Creates a new trip with its legs.
 * 
 * @param {Object} tripData - Trip data object
 * @param {string} tripData.id - Unique trip ID (e.g., "2026-europe")
 * @param {string} tripData.name - Display name
 * @param {string} tripData.startDate - Start date (YYYY-MM-DD)
 * @param {string} tripData.endDate - End date (YYYY-MM-DD)
 * @param {Array} tripData.legs - Array of leg objects
 * @returns {Object} Result with success status and created trip data
 */
function createTrip(tripData) {
  // Validate required fields BEFORE acquiring lock
  if (!tripData) {
    return { success: false, error: 'Trip data is required' };
  }
  
  const id = tripData.id?.toString().trim();
  const name = tripData.name?.toString().trim();
  const startDate = tripData.startDate?.toString().trim();
  const endDate = tripData.endDate?.toString().trim();
  const legs = tripData.legs || [];
  
  if (!id) {
    return { success: false, error: 'Trip ID is required' };
  }
  if (!name) {
    return { success: false, error: 'Trip name is required' };
  }
  if (!startDate) {
    return { success: false, error: 'Start date is required' };
  }
  if (!endDate) {
    return { success: false, error: 'End date is required' };
  }
  
  // Validate all locations in legs (slow operation - do before lock)
  const locationValidation = validateLegLocations_(legs);
  if (!locationValidation.valid) {
    return { success: false, error: locationValidation.error };
  }
  
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  
  try {
    lock.waitLock(10000);
    lockAcquired = true;
    
    // Check that trip_id doesn't already exist (must be inside lock)
    if (findTripRow_(id) !== null) {
      return { success: false, error: 'Trip ID already exists' };
    }
    
    // Get spreadsheet and sheets
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tripsSheet = ss.getSheetByName(CONFIG.TRIPS_SHEET);
    const legsSheet = ss.getSheetByName(CONFIG.LEGS_SHEET);
    
    if (!tripsSheet || !legsSheet) {
      return { success: false, error: 'Required sheets not found' };
    }
    
    // Insert row into Trips sheet
    tripsSheet.appendRow([
      id,
      name,
      parseLocalDate_(startDate),
      parseLocalDate_(endDate)
    ]);
    
    // Insert rows into Legs sheet
    legs.forEach((leg, index) => {
      const mode = leg.mode?.toString().trim().toLowerCase() || 'flight';
      // For flights, uppercase the airport code; for other modes, preserve original
      const originValue = mode === 'flight' 
        ? leg.origin?.toString().trim().toUpperCase()
        : leg.origin?.toString().trim();
      const destValue = mode === 'flight'
        ? leg.destination?.toString().trim().toUpperCase()
        : leg.destination?.toString().trim();
      const departureDate = leg.departureDate?.toString().trim();
      const arrivalDate = leg.arrivalDate?.toString().trim() || '';
      
      legsSheet.appendRow([
        id,
        index + 1, // leg_order is 1-indexed
        originValue,
        destValue,
        departureDate ? parseLocalDate_(departureDate) : '',
        arrivalDate ? parseLocalDate_(arrivalDate) : '',
        mode
      ]);
    });
    
    // Release lock BEFORE building trip object (which does airport lookups)
    lock.releaseLock();
    lockAcquired = false;
    
    // Return the created trip with resolved coordinates
    const createdTrip = buildTripObject_(id, name, startDate, endDate, legs);
    return { success: true, trip: createdTrip };
    
  } catch (error) {
    Logger.log('Error in createTrip: ' + error.toString());
    return { success: false, error: 'Failed to create trip: ' + error.toString() };
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

// ============================================================================
// Update Operations
// ============================================================================

/**
 * Updates an existing trip and its legs.
 * Replaces all legs with the new set (simpler than partial updates).
 * 
 * @param {string} tripId - The trip ID to update
 * @param {Object} tripData - Updated trip data (same format as createTrip)
 * @returns {Object} Result with success status and updated trip data
 */
function updateTrip(tripId, tripData) {
  // Validate inputs BEFORE acquiring lock
  tripId = tripId?.toString().trim();
  if (!tripId) {
    return { success: false, error: 'Trip ID is required' };
  }
  
  if (!tripData) {
    return { success: false, error: 'Trip data is required' };
  }
  
  const name = tripData.name?.toString().trim();
  const startDate = tripData.startDate?.toString().trim();
  const endDate = tripData.endDate?.toString().trim();
  const legs = tripData.legs || [];
  
  if (!name) {
    return { success: false, error: 'Trip name is required' };
  }
  if (!startDate) {
    return { success: false, error: 'Start date is required' };
  }
  if (!endDate) {
    return { success: false, error: 'End date is required' };
  }
  
  // Validate all locations in legs (slow operation - do before lock)
  const locationValidation = validateLegLocations_(legs);
  if (!locationValidation.valid) {
    return { success: false, error: locationValidation.error };
  }
  
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  
  try {
    lock.waitLock(10000);
    lockAcquired = true;
    
    // Check that trip exists (must be inside lock)
    const tripRow = findTripRow_(tripId);
    if (tripRow === null) {
      return { success: false, error: 'Trip not found' };
    }
    
    // Get spreadsheet and sheets
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tripsSheet = ss.getSheetByName(CONFIG.TRIPS_SHEET);
    const legsSheet = ss.getSheetByName(CONFIG.LEGS_SHEET);
    
    if (!tripsSheet || !legsSheet) {
      return { success: false, error: 'Required sheets not found' };
    }
    
    // Update Trips row (tripId stays the same, update name and dates)
    tripsSheet.getRange(tripRow, 2).setValue(name);
    tripsSheet.getRange(tripRow, 3).setValue(parseLocalDate_(startDate));
    tripsSheet.getRange(tripRow, 4).setValue(parseLocalDate_(endDate));
    
    // Delete all existing legs for this trip
    deleteTripLegs_(tripId);
    
    // Insert new legs
    legs.forEach((leg, index) => {
      const mode = leg.mode?.toString().trim().toLowerCase() || 'flight';
      // For flights, uppercase the airport code; for other modes, preserve original
      const originValue = mode === 'flight' 
        ? leg.origin?.toString().trim().toUpperCase()
        : leg.origin?.toString().trim();
      const destValue = mode === 'flight'
        ? leg.destination?.toString().trim().toUpperCase()
        : leg.destination?.toString().trim();
      const departureDate = leg.departureDate?.toString().trim();
      const arrivalDate = leg.arrivalDate?.toString().trim() || '';
      
      legsSheet.appendRow([
        tripId,
        index + 1,
        originValue,
        destValue,
        departureDate ? parseLocalDate_(departureDate) : '',
        arrivalDate ? parseLocalDate_(arrivalDate) : '',
        mode
      ]);
    });
    
    // Release lock BEFORE building trip object (which does airport lookups)
    lock.releaseLock();
    lockAcquired = false;
    
    // Return updated trip with resolved coordinates
    const updatedTrip = buildTripObject_(tripId, name, startDate, endDate, legs);
    return { success: true, trip: updatedTrip };
    
  } catch (error) {
    Logger.log('Error in updateTrip: ' + error.toString());
    return { success: false, error: 'Failed to update trip: ' + error.toString() };
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Deletes a trip and all its legs.
 * 
 * @param {string} tripId - The trip ID to delete
 * @returns {Object} Result with success status
 */
function deleteTrip(tripId) {
  // Validate tripId BEFORE acquiring lock
  tripId = tripId?.toString().trim();
  if (!tripId) {
    return { success: false, error: 'Trip ID is required' };
  }
  
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  
  try {
    lock.waitLock(10000);
    lockAcquired = true;
    
    // Check that trip exists
    const tripRow = findTripRow_(tripId);
    if (tripRow === null) {
      return { success: false, error: 'Trip not found' };
    }
    
    // Get spreadsheet and sheets
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tripsSheet = ss.getSheetByName(CONFIG.TRIPS_SHEET);
    
    if (!tripsSheet) {
      return { success: false, error: 'Trips sheet not found' };
    }
    
    // Delete all legs for this trip from Legs sheet
    deleteTripLegs_(tripId);
    
    // Delete trip row from Trips sheet
    tripsSheet.deleteRow(tripRow);
    
    return { success: true };
    
  } catch (error) {
    Logger.log('Error in deleteTrip: ' + error.toString());
    return { success: false, error: 'Failed to delete trip: ' + error.toString() };
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

// ============================================================================
// Airport Operations
// ============================================================================

/**
 * Validates that an airport code exists in the database.
 * Useful for frontend validation before save.
 * 
 * @param {string} code - Airport code to validate
 * @returns {Object} Airport data if valid, null if not found
 */
function validateAirport(code) {
  return getAirport(code);
}

/**
 * Searches airports by code or name prefix.
 * Returns top N matches for autocomplete.
 * 
 * @param {string} query - Search query (code or name)
 * @param {number} limit - Max results to return (default 10)
 * @returns {Array} Matching airports [{code, name, lat, lng}, ...]
 */
// Cache for all airports data (avoids repeated sheet reads)
let allAirportsCache_ = null;

/**
 * Gets all airports, using in-memory cache within the same execution.
 * @returns {Array} Array of [code, name, lat, lng] arrays
 */
function getAllAirports_() {
  if (allAirportsCache_) {
    return allAirportsCache_;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(AIRPORTS_SHEET_NAME);
  
  if (!sheet) {
    Logger.log('Warning: _AirportsCache sheet not found');
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  allAirportsCache_ = data.length > 1 ? data.slice(1) : []; // Skip header
  return allAirportsCache_;
}

function searchAirports(query, limit) {
  try {
    if (!query) {
      return [];
    }
    
    // Normalize query
    const normalizedQuery = query.toString().trim().toUpperCase();
    if (normalizedQuery.length === 0) {
      return [];
    }
    
    limit = limit || 10;
    
    // Get cached airport data
    const airports = getAllAirports_();
    if (airports.length === 0) {
      return [];
    }
    
    const results = [];
    const queryLower = normalizedQuery.toLowerCase();
    
    // Search through all airports
    for (let i = 0; i < airports.length && results.length < limit; i++) {
      const [code, name, lat, lng] = airports[i];
      const codeStr = code?.toString().toUpperCase() || '';
      const nameStr = name?.toString() || '';
      const nameLower = nameStr.toLowerCase();
      
      // Match by code prefix OR name contains (case-insensitive)
      if (codeStr.startsWith(normalizedQuery) || nameLower.includes(queryLower)) {
        results.push({
          code: codeStr,
          name: nameStr,
          city: nameStr.split(',')[0] || nameStr,
          lat: lat,
          lng: lng
        });
      }
    }
    
    // Sort: exact code matches first, then by code alphabetically
    results.sort((a, b) => {
      const aExact = a.code === normalizedQuery;
      const bExact = b.code === normalizedQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      const aStartsWith = a.code.startsWith(normalizedQuery);
      const bStartsWith = b.code.startsWith(normalizedQuery);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      return a.code.localeCompare(b.code);
    });
    
    return results.slice(0, limit);
    
  } catch (error) {
    Logger.log('Error in searchAirports: ' + error.toString());
    return [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parses a date string (YYYY-MM-DD) as a local date, avoiding timezone issues.
 * 
 * Using `new Date("2026-02-02")` treats the string as UTC midnight, which can
 * shift to the previous day in western timezones. This function parses the
 * components and creates a Date at local midnight instead.
 * 
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} Date object at local midnight
 */
function parseLocalDate_(dateStr) {
  if (!dateStr) return null;
  
  const str = dateStr.toString().trim();
  const parts = str.split('-');
  
  if (parts.length !== 3) {
    // Fallback: try native parsing with time suffix to force local
    return new Date(str + 'T00:00:00');
  }
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
  const day = parseInt(parts[2], 10);
  
  return new Date(year, month, day);
}

/**
 * Generates a unique trip ID from the name and date.
 * @param {string} name - Trip name
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @returns {string} Generated trip ID
 */
function generateTripId_(name, startDate) {
  const year = new Date(startDate).getFullYear();
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${year}-${slug}`;
}

/**
 * Finds the row index of a trip by ID.
 * @param {string} tripId - Trip ID to find
 * @returns {number|null} Row number (1-indexed) or null if not found
 */
function findTripRow_(tripId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.TRIPS_SHEET);
  
  if (!sheet) {
    return null;
  }
  
  const finder = sheet.createTextFinder(tripId).matchEntireCell(true);
  const cell = finder.findNext();
  
  if (!cell) {
    return null;
  }
  
  // Verify this is in column A (trip_id column)
  if (cell.getColumn() !== 1) {
    return null;
  }
  
  return cell.getRow();
}

/**
 * Deletes all legs for a given trip ID.
 * @param {string} tripId - Trip ID whose legs should be deleted
 */
function deleteTripLegs_(tripId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.LEGS_SHEET);
  
  if (!sheet) {
    return;
  }
  
  // Find and delete all rows where trip_id matches
  // Work from bottom to top to avoid row index shifting issues
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  
  for (let i = 1; i < data.length; i++) { // Skip header row
    if (data[i][0]?.toString().trim() === tripId) {
      rowsToDelete.push(i + 1); // +1 because rows are 1-indexed
    }
  }
  
  // Delete from bottom to top
  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    sheet.deleteRow(rowsToDelete[i]);
  }
}

/**
 * Validates all locations in a legs array based on transport mode.
 * @param {Array} legs - Array of leg objects
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateLegLocations_(legs) {
  if (!Array.isArray(legs)) {
    return { valid: true }; // Empty legs is valid
  }
  
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const legNum = i + 1;
    const mode = (leg.mode || 'flight').toLowerCase();
    
    const origin = leg.origin?.toString().trim();
    const destination = leg.destination?.toString().trim();
    
    if (!origin) {
      return { valid: false, error: `Leg ${legNum}: Origin is required` };
    }
    if (!destination) {
      return { valid: false, error: `Leg ${legNum}: Destination is required` };
    }
    
    // Validate origin can be resolved
    const resolvedOrigin = resolveLocation(origin, mode);
    if (!resolvedOrigin) {
      if (mode === 'flight') {
        return { valid: false, error: `Leg ${legNum}: Unknown airport code "${origin.toUpperCase()}"` };
      } else {
        return { valid: false, error: `Leg ${legNum}: Could not find location "${origin}"` };
      }
    }
    
    // Validate destination can be resolved
    const resolvedDest = resolveLocation(destination, mode);
    if (!resolvedDest) {
      if (mode === 'flight') {
        return { valid: false, error: `Leg ${legNum}: Unknown airport code "${destination.toUpperCase()}"` };
      } else {
        return { valid: false, error: `Leg ${legNum}: Could not find location "${destination}"` };
      }
    }
    
    if (!leg.departureDate) {
      return { valid: false, error: `Leg ${legNum}: Departure date is required` };
    }
  }
  
  return { valid: true };
}

/**
 * Builds a trip object with resolved location coordinates.
 * Uses mode-aware resolution (airports for flights, geocoding for other modes).
 * @param {string} id - Trip ID
 * @param {string} name - Trip name
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {Array} legs - Array of leg objects
 * @returns {Object} Trip object with resolved coordinates
 */
function buildTripObject_(id, name, startDate, endDate, legs) {
  const formattedLegs = legs.map((leg, index) => {
    const mode = leg.mode?.toString().trim().toLowerCase() || 'flight';
    const originValue = leg.origin?.toString().trim();
    const destValue = leg.destination?.toString().trim();
    
    return {
      order: index + 1,
      origin: resolveLocation(originValue, mode),
      destination: resolveLocation(destValue, mode),
      departureDate: leg.departureDate?.toString().trim() || null,
      arrivalDate: leg.arrivalDate?.toString().trim() || null,
      mode: mode
    };
  });
  
  return {
    id: id,
    name: name,
    startDate: startDate,
    endDate: endDate,
    legs: formattedLegs
  };
}

// ============================================================================
// Test Functions
// ============================================================================

/**
 * Test function for createTrip
 */
function testCreateTrip() {
  const result = createTrip({
    id: 'test-trip',
    name: 'Test Trip',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    legs: [
      { origin: 'JFK', destination: 'LAX', departureDate: '2026-01-01', mode: 'flight' }
    ]
  });
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test function for updateTrip
 */
function testUpdateTrip() {
  const result = updateTrip('test-trip', {
    name: 'Updated Test Trip',
    startDate: '2026-01-01',
    endDate: '2026-01-07',
    legs: [
      { origin: 'JFK', destination: 'LAX', departureDate: '2026-01-01', mode: 'flight' },
      { origin: 'LAX', destination: 'JFK', departureDate: '2026-01-06', mode: 'flight' }
    ]
  });
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test function for deleteTrip
 */
function testDeleteTrip() {
  const result = deleteTrip('test-trip');
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test function for searchAirports
 */
function testSearchAirports() {
  Logger.log('Search "new":');
  Logger.log(JSON.stringify(searchAirports('new', 5), null, 2));
  
  Logger.log('Search "JFK":');
  Logger.log(JSON.stringify(searchAirports('JFK', 5), null, 2));
  
  Logger.log('Search "los":');
  Logger.log(JSON.stringify(searchAirports('los', 5), null, 2));
}

/**
 * Test function for validateAirport
 */
function testValidateAirport() {
  Logger.log('Validate "JFK":');
  Logger.log(JSON.stringify(validateAirport('JFK'), null, 2));
  
  Logger.log('Validate "XXX" (invalid):');
  Logger.log(JSON.stringify(validateAirport('XXX'), null, 2));
}

/**
 * Test creating a trip with mixed transport modes
 */
function testMixedModeTrip() {
  const result = createTrip({
    id: 'test-mixed-mode',
    name: 'Mixed Mode Test',
    startDate: '2026-06-01',
    endDate: '2026-06-10',
    legs: [
      { origin: 'JFK', destination: 'CDG', departureDate: '2026-06-01', mode: 'flight' },
      { origin: 'Paris, France', destination: 'Lyon, France', departureDate: '2026-06-03', mode: 'train' },
      { origin: 'Lyon, France', destination: 'Nice, France', departureDate: '2026-06-06', mode: 'car' },
      { origin: 'NCE', destination: 'JFK', departureDate: '2026-06-09', mode: 'flight' }
    ]
  });
  
  Logger.log('Create result: ' + JSON.stringify(result, null, 2));
  
  // Clean up
  if (result.success) {
    deleteTrip('test-mixed-mode');
    Logger.log('Cleaned up test trip');
  }
}

/**
 * Run all CRUD tests in sequence
 */
function testCrudOperations() {
  Logger.log('=== Testing CRUD Operations ===\n');
  
  Logger.log('1. Creating test trip...');
  testCreateTrip();
  
  Logger.log('\n2. Updating test trip...');
  testUpdateTrip();
  
  Logger.log('\n3. Deleting test trip...');
  testDeleteTrip();
  
  Logger.log('\n4. Testing airport search...');
  testSearchAirports();
  
  Logger.log('\n5. Testing airport validation...');
  testValidateAirport();
  
  Logger.log('\n6. Testing mixed mode trip...');
  testMixedModeTrip();
  
  Logger.log('\n=== All tests complete ===');
}

