/**
 * Trip Data Setup
 * 
 * Run createSampleData() to populate the Trips and Legs sheets with example data.
 * This is useful for testing the app before adding your own travel data.
 */

/**
 * Creates sample data in the spreadsheet.
 * Run this once to populate the sheets with test data.
 * WARNING: This will overwrite existing data in Trips and Legs sheets!
 */
function createSampleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create or get Trips sheet
  let tripsSheet = ss.getSheetByName('Trips');
  if (!tripsSheet) {
    tripsSheet = ss.insertSheet('Trips');
  } else {
    tripsSheet.clear();
  }
  
  // Create or get Legs sheet
  let legsSheet = ss.getSheetByName('Legs');
  if (!legsSheet) {
    legsSheet = ss.insertSheet('Legs');
  } else {
    legsSheet.clear();
  }
  
  // Populate Trips
  const tripsHeaders = ['trip_id', 'trip_name', 'start_date', 'end_date'];
  const tripsData = [
    tripsHeaders,
    ['2026-argentina', 'Argentina Adventure', new Date(2026, 2, 15), new Date(2026, 2, 28)],
    ['2026-japan', 'Japan Cherry Blossoms', new Date(2026, 3, 1), new Date(2026, 3, 14)],
    ['2026-iceland', 'Iceland Northern Lights', new Date(2026, 8, 20), new Date(2026, 8, 27)]
  ];
  tripsSheet.getRange(1, 1, tripsData.length, tripsHeaders.length).setValues(tripsData);
  
  // Format date columns
  tripsSheet.getRange(2, 3, tripsData.length - 1, 2).setNumberFormat('yyyy-mm-dd');
  
  // Populate Legs
  const legsHeaders = ['trip_id', 'leg_order', 'origin', 'destination', 'departure_date', 'arrival_date', 'mode'];
  const legsData = [
    legsHeaders,
    // Argentina trip: JFK → EZE → BRC → EZE → JFK
    ['2026-argentina', 1, 'JFK', 'EZE', new Date(2026, 2, 15), new Date(2026, 2, 16), 'flight'],
    ['2026-argentina', 2, 'EZE', 'BRC', new Date(2026, 2, 17), new Date(2026, 2, 17), 'flight'],
    ['2026-argentina', 3, 'BRC', 'EZE', new Date(2026, 2, 25), new Date(2026, 2, 25), 'flight'],
    ['2026-argentina', 4, 'EZE', 'JFK', new Date(2026, 2, 27), new Date(2026, 2, 28), 'flight'],
    // Japan trip: LAX → NRT → KIX → NRT → LAX
    ['2026-japan', 1, 'LAX', 'NRT', new Date(2026, 3, 1), new Date(2026, 3, 2), 'flight'],
    ['2026-japan', 2, 'NRT', 'KIX', new Date(2026, 3, 5), new Date(2026, 3, 5), 'flight'],
    ['2026-japan', 3, 'KIX', 'NRT', new Date(2026, 3, 10), new Date(2026, 3, 10), 'flight'],
    ['2026-japan', 4, 'NRT', 'LAX', new Date(2026, 3, 13), new Date(2026, 3, 13), 'flight'],
    // Iceland trip: JFK → KEF → JFK
    ['2026-iceland', 1, 'JFK', 'KEF', new Date(2026, 8, 20), new Date(2026, 8, 20), 'flight'],
    ['2026-iceland', 2, 'KEF', 'JFK', new Date(2026, 8, 26), new Date(2026, 8, 27), 'flight']
  ];
  legsSheet.getRange(1, 1, legsData.length, legsHeaders.length).setValues(legsData);
  
  // Format date columns
  legsSheet.getRange(2, 5, legsData.length - 1, 2).setNumberFormat('yyyy-mm-dd');
  
  // Auto-resize columns
  tripsSheet.autoResizeColumns(1, tripsHeaders.length);
  legsSheet.autoResizeColumns(1, legsHeaders.length);
  
  Logger.log('SUCCESS: Sample data created in Trips and Legs sheets!');
}

/**
 * Test function to verify the data retrieval works correctly.
 * Run this from the Apps Script editor to check your sheet setup.
 */
function testGetTripData() {
  const data = getTripData();
  Logger.log(JSON.stringify(data, null, 2));
  return data;
}

