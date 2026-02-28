/**
 * IFB Upload Portal — Google Apps Script Backend
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Go to https://script.google.com and create a new project
 * 2. Replace the default Code.gs content with this entire file
 * 3. Update CONFIG below with your Google Drive folder ID and notification emails
 * 4. Click Deploy → New deployment
 * 5. Type: "Web app"
 * 6. Execute as: "Me"
 * 7. Who has access: "Anyone"
 * 8. Click Deploy and authorize when prompted
 * 9. Copy the Web App URL and paste it into upload-app.js (the GAS_URL constant)
 *
 * REQUIRED PERMISSIONS:
 * - Google Drive (to create folders and upload files)
 * - Gmail (to send notification emails)
 *
 * HOW IT WORKS:
 * - The frontend sends POST requests with JSON body
 * - action: "init"     → creates a client folder in your Drive
 * - action: "upload"   → uploads a file (base64) into that folder
 * - action: "complete" → sends email notification with folder link
 */

// =============================================
// CONFIGURATION — UPDATE THESE VALUES
// =============================================
var CONFIG = {
  // The Google Drive folder ID where client subfolders will be created.
  // Find it in the folder's URL: https://drive.google.com/drive/folders/THIS_PART
  PARENT_FOLDER_ID: '1Zlp7fSMnVRiWbkRSYCoVB9-UwxmmJIgH',

  // Email addresses that receive upload notifications (array)
  NOTIFICATION_EMAILS: [
    'legal@infiba.com',
    'legal@bafiin.com',
    'admin@intfiba.com'
  ],

  // Display name for notification emails
  FROM_NAME: 'IFB Upload Portal'
};

// =============================================
// REQUEST HANDLERS
// =============================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    switch (action) {
      case 'init':
        return handleInit(data);
      case 'upload':
        return handleUpload(data);
      case 'complete':
        return handleComplete(data);
      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    Logger.log('Error: ' + err.message + '\n' + err.stack);
    return jsonResponse({ error: 'Server error: ' + err.message });
  }
}

function doGet(e) {
  return jsonResponse({ status: 'ok', message: 'IFB Upload API is running' });
}

// =============================================
// ACTION: Initialize upload session
// =============================================
function handleInit(data) {
  var clientName = data.clientName;
  var clientEmail = data.clientEmail;
  var clientCompany = data.clientCompany || '';

  if (!clientName || !clientEmail) {
    return jsonResponse({ error: 'Name and email are required.' });
  }

  // Generate session ID
  var sessionId = 'IFB-' + formatDate(new Date()) + '-' + Utilities.getUuid().substring(0, 8);

  // Create folder name: "2026-02-27 — John Doe (Company Ltd.)"
  var folderName = formatDate(new Date()) + ' — ' + clientName;
  if (clientCompany) {
    folderName += ' (' + clientCompany + ')';
  }

  // Create folder in Google Drive
  var parentFolder = DriveApp.getFolderById(CONFIG.PARENT_FOLDER_ID);
  var newFolder = parentFolder.createFolder(folderName);
  var folderId = newFolder.getId();

  // Store session info for the complete step
  var props = PropertiesService.getScriptProperties();
  props.setProperty(sessionId, JSON.stringify({
    folderId: folderId,
    folderName: folderName,
    clientName: clientName,
    clientEmail: clientEmail,
    clientCompany: clientCompany,
    clientPhone: data.clientPhone || '',
    isCompany: data.isCompany || false,
    notes: data.notes || '',
    createdAt: new Date().toISOString()
  }));

  Logger.log('[INIT] Session ' + sessionId + ' for ' + clientName + ' <' + clientEmail + '>');

  return jsonResponse({ sessionId: sessionId, folderId: folderId });
}

// =============================================
// ACTION: Upload a single file
// =============================================
function handleUpload(data) {
  var folderId = data.folderId;
  var docType = data.docType;
  var fileName = data.fileName;
  var mimeType = data.mimeType || 'application/octet-stream';
  var fileData = data.fileData; // base64 string

  if (!folderId || !docType || !fileName || !fileData) {
    return jsonResponse({ error: 'Missing required upload fields.' });
  }

  // Validate file extension
  var ext = fileName.split('.').pop().toLowerCase();
  if (['pdf', 'jpg', 'jpeg', 'png'].indexOf(ext) === -1) {
    return jsonResponse({ error: 'Invalid file type. Allowed: PDF, JPG, PNG.' });
  }

  // Prefix filename with document type for organization
  var docLabels = {
    'account-opening-form': '01_Account_Opening_Form',
    'passport': '02_Passport',
    'proof-of-residence': '03_Proof_of_Residence',
    'company-documents': '04_Company_Documents',
    'source-of-funds': '05_Source_of_Funds',
    'additional-documents': '06_Additional'
  };
  var prefix = docLabels[docType] || docType;
  var safeName = prefix + '_' + fileName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);

  // Decode base64 and upload to Drive
  var decoded = Utilities.base64Decode(fileData);
  var blob = Utilities.newBlob(decoded, mimeType, safeName);
  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob);

  Logger.log('[UPLOAD] ' + safeName + ' (' + decoded.length + ' bytes) → folder ' + folderId);

  return jsonResponse({ success: true, fileName: safeName, fileId: file.getId() });
}

// =============================================
// ACTION: Complete submission — send notification
// =============================================
function handleComplete(data) {
  var sessionId = data.sessionId;
  var folderId = data.folderId;
  var clientName = data.clientName;
  var clientEmail = data.clientEmail;
  var clientCompany = data.clientCompany || '';
  var clientPhone = data.clientPhone || '';
  var isCompany = data.isCompany || false;
  var notes = data.notes || '';

  // Try to get extra info from stored session data (fallback)
  try {
    var props = PropertiesService.getScriptProperties();
    var sessionJson = props.getProperty(sessionId);
    if (sessionJson) {
      var session = JSON.parse(sessionJson);
      if (!clientCompany) clientCompany = session.clientCompany || '';
      if (!clientPhone) clientPhone = session.clientPhone || '';
      if (!notes) notes = session.notes || '';
      if (!isCompany) isCompany = session.isCompany || false;
    }
  } catch (e) { /* ignore */ }

  var folderLink = 'https://drive.google.com/drive/folders/' + folderId;

  // Create and upload client info summary text file
  try {
    var infoText = buildClientInfoText(sessionId, clientName, clientEmail, clientCompany, clientPhone, isCompany, notes);
    var blob = Utilities.newBlob(infoText, 'text/plain', '00_Client_Information.txt');
    var folder = DriveApp.getFolderById(folderId);
    folder.createFile(blob);
    Logger.log('[INFO FILE] Client info text file created in folder ' + folderId);
  } catch (infoErr) {
    Logger.log('Failed to create client info file: ' + infoErr.message);
  }

  // Build notification email
  var htmlBody =
    '<div style="font-family:Arial,sans-serif;max-width:600px;">' +
    '<h2 style="color:#1a2744;border-bottom:2px solid #c9a84c;padding-bottom:8px;">New Client Document Submission</h2>' +
    '<table style="border-collapse:collapse;width:100%;">' +
    '<tr><td style="padding:8px 12px;font-weight:bold;color:#1a2744;width:120px;">Client:</td><td style="padding:8px 12px;">' + escHtml(clientName) + '</td></tr>' +
    '<tr><td style="padding:8px 12px;font-weight:bold;color:#1a2744;">Email:</td><td style="padding:8px 12px;"><a href="mailto:' + escHtml(clientEmail) + '">' + escHtml(clientEmail) + '</a></td></tr>' +
    '<tr><td style="padding:8px 12px;font-weight:bold;color:#1a2744;">Reference:</td><td style="padding:8px 12px;">' + sessionId + '</td></tr>' +
    '<tr><td style="padding:8px 12px;font-weight:bold;color:#1a2744;">Documents:</td><td style="padding:8px 12px;"><a href="' + folderLink + '">Open in Google Drive</a></td></tr>' +
    '</table>' +
    '<p style="margin-top:16px;color:#666;">Please review the submitted documents at your earliest convenience.</p>' +
    '<hr style="border:none;border-top:1px solid #dde1e7;margin-top:24px;">' +
    '<p style="font-size:12px;color:#999;">International Finance Bank LTD — Secure Upload Portal</p>' +
    '</div>';

  var subject = 'New Document Submission — ' + clientName + ' [' + sessionId + ']';

  // Send to all notification emails
  for (var i = 0; i < CONFIG.NOTIFICATION_EMAILS.length; i++) {
    try {
      MailApp.sendEmail({
        to: CONFIG.NOTIFICATION_EMAILS[i],
        subject: subject,
        htmlBody: htmlBody,
        name: CONFIG.FROM_NAME
      });
    } catch (emailErr) {
      Logger.log('Failed to send email to ' + CONFIG.NOTIFICATION_EMAILS[i] + ': ' + emailErr.message);
    }
  }

  // Clean up stored session data
  try {
    PropertiesService.getScriptProperties().deleteProperty(sessionId);
  } catch (e) { /* ignore */ }

  Logger.log('[COMPLETE] Session ' + sessionId + ' — ' + clientName + ' <' + clientEmail + '> — folder: ' + folderLink);

  return jsonResponse({ success: true, sessionId: sessionId, folderLink: folderLink });
}

// =============================================
// UTILITIES
// =============================================

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildClientInfoText(sessionId, clientName, clientEmail, clientCompany, clientPhone, isCompany, notes) {
  var lines = [
    '============================================',
    '  CLIENT INFORMATION SUMMARY',
    '============================================',
    '',
    'Reference:      ' + (sessionId || 'N/A'),
    'Date:           ' + formatDate(new Date()),
    '',
    '--- Contact Details ---',
    'Full Name:      ' + (clientName || 'N/A'),
    'Email:          ' + (clientEmail || 'N/A'),
    'Phone:          ' + (clientPhone || 'Not provided'),
    'Company:        ' + (clientCompany || 'Not provided'),
    'Account Type:   ' + (isCompany ? 'Company / Entity' : 'Individual'),
    '',
    '--- Account Purpose / Notes ---',
    notes || 'No additional notes provided.',
    '',
    '============================================',
    '  Generated: ' + new Date().toISOString(),
    '============================================',
    ''
  ];
  return lines.join('\n');
}
