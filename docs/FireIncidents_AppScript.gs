/**
 * Fire Incidents Sheet Functions
 * Add this code to your existing Google Apps Script (Code.gs)
 * 
 * This adds support for:
 * - FireIncidents sheet
 * - CRUD operations for fire incident logs
 */

// ================= FIRE INCIDENTS =================

/**
 * Get all fire incidents
 */
function getFireIncidents() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('FireIncidents');
  
  // Create sheet if not exists
  if (!sheet) {
    sheet = ss.insertSheet('FireIncidents');
    // Add headers
    sheet.getRange(1, 1, 1, 12).setValues([[
      'id', 'date', 'areaName', 'alertSource', 'responseType', 
      'time', 'locationName', 'utmCoords', 'personnelCount', 
      'areaDamaged', 'linkedHotspotId', 'remark'
    ]]);
    // Format header row
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#f97316').setFontColor('#ffffff');
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Only headers
  
  const incidents = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    incidents.push({
      id: row[0],
      date: row[1],
      areaName: row[2],
      alertSource: row[3],
      responseType: row[4],
      time: row[5] || undefined,
      locationName: row[6] || undefined,
      location: row[7] ? { utm: row[7] } : undefined,
      personnelCount: row[8] || 0,
      areaDamaged: row[9] || 0,
      linkedHotspotId: row[10] || undefined,
      remark: row[11] || undefined
    });
  }
  
  return incidents;
}

/**
 * Save a fire incident (create or update)
 */
function saveFireIncident(incident, isUpdate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('FireIncidents');
  
  // Create sheet if not exists
  if (!sheet) {
    sheet = ss.insertSheet('FireIncidents');
    sheet.getRange(1, 1, 1, 12).setValues([[
      'id', 'date', 'areaName', 'alertSource', 'responseType', 
      'time', 'locationName', 'utmCoords', 'personnelCount', 
      'areaDamaged', 'linkedHotspotId', 'remark'
    ]]);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#f97316').setFontColor('#ffffff');
  }
  
  const rowData = [
    incident.id,
    incident.date,
    incident.areaName,
    incident.alertSource,
    incident.responseType,
    incident.time || '',
    incident.locationName || '',
    incident.location?.utm || '',
    incident.personnelCount || 0,
    incident.areaDamaged || 0,
    incident.linkedHotspotId || '',
    incident.remark || ''
  ];
  
  if (isUpdate) {
    // Find and update existing row
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === incident.id) {
        sheet.getRange(i + 1, 1, 1, 12).setValues([rowData]);
        return { status: 'success', action: 'updated', id: incident.id };
      }
    }
  }
  
  // Append new row
  sheet.appendRow(rowData);
  return { status: 'success', action: 'created', id: incident.id };
}

/**
 * Delete a fire incident
 */
function deleteFireIncident(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('FireIncidents');
  
  if (!sheet) {
    return { status: 'error', message: 'FireIncidents sheet not found' };
  }
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { status: 'success', action: 'deleted', id: id };
    }
  }
  
  return { status: 'error', message: 'Incident not found' };
}

/**
 * Batch save multiple fire incidents
 */
function saveFireIncidentsBatch(incidents) {
  const results = [];
  for (const incident of incidents) {
    const result = saveFireIncident(incident, false);
    results.push(result);
  }
  return { status: 'success', action: 'batch_created', count: results.length };
}


// ================= UPDATE doPost FUNCTION =================

/**
 * Add these cases to your existing doPost function in Code.gs
 * 
 * case 'getFireIncidents':
 *   responseData = getFireIncidents();
 *   break;
 * 
 * case 'saveFireIncident':
 *   responseData = saveFireIncident(payload.data, payload.isUpdate);
 *   break;
 * 
 * case 'saveFireIncidentsBatch':
 *   responseData = saveFireIncidentsBatch(payload.data);
 *   break;
 * 
 * case 'deleteFireIncident':
 *   responseData = deleteFireIncident(payload.id);
 *   break;
 */


// ================= FULL doPost WITH FIRE INCIDENTS =================
// Replace your existing doPost with this version if you want fire incidents support

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    let responseData;
    
    switch (action) {
      // Existing actions...
      case 'getActivities':
        responseData = getActivities();
        break;
      case 'saveActivity':
        responseData = saveActivity(payload.data, payload.isUpdate);
        break;
      case 'deleteActivity':
        responseData = deleteActivity(payload.id);
        break;
      case 'getHotspots':
        responseData = getHotspots();
        break;
      case 'saveHotspot':
        responseData = saveHotspot(payload.data);
        break;
      case 'deleteHotspot':
        responseData = deleteHotspot(payload.id);
        break;
      case 'getSettings':
        responseData = getSettings();
        break;
      case 'saveSettings':
        responseData = saveSettings(payload.data);
        break;
      case 'factoryReset':
        responseData = factoryReset();
        break;
        
      // NEW: Fire Incident actions
      case 'getFireIncidents':
        responseData = getFireIncidents();
        break;
      case 'saveFireIncident':
        responseData = saveFireIncident(payload.data, payload.isUpdate);
        break;
      case 'saveFireIncidentsBatch':
        responseData = saveFireIncidentsBatch(payload.data);
        break;
      case 'deleteFireIncident':
        responseData = deleteFireIncident(payload.id);
        break;
        
      default:
        responseData = { status: 'error', message: 'Unknown action: ' + action };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', data: responseData }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
