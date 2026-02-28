/**
 * IFB Upload Handler — Netlify Serverless Function
 *
 * Handles secure client document uploads for onboarding.
 * Supports two storage backends (configured via env vars):
 *   1. Google Drive  — set GOOGLE_SERVICE_ACCOUNT_JSON + GOOGLE_DRIVE_FOLDER_ID
 *   2. OneDrive      — set ONEDRIVE_CLIENT_ID + ONEDRIVE_CLIENT_SECRET + ONEDRIVE_TENANT_ID + ONEDRIVE_FOLDER_PATH
 *
 * If neither is configured, files are stored in Netlify Blobs (temporary download links).
 *
 * Other env vars:
 *   UPLOAD_ACCESS_CODE        — access code clients must enter (required)
 *   NOTIFICATION_EMAIL        — where to send upload notifications
 *   SENDGRID_API_KEY          — for email notifications via SendGrid
 */

const crypto = require('crypto');

// --- CORS headers ---
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action } = body;

    switch (action) {
      case 'verify':  return handleVerify(body);
      case 'init':    return handleInit(body);
      case 'upload':  return handleUpload(body);
      case 'complete': return handleComplete(body);
      default:
        return respond(400, { error: 'Unknown action' });
    }
  } catch (err) {
    console.error('Upload handler error:', err);
    return respond(500, { error: 'Internal server error. Please try again.' });
  }
};

// ========================
// ACTION: Verify access code
// ========================
function handleVerify({ code }) {
  const expected = process.env.UPLOAD_ACCESS_CODE || 'IFB2026';
  const valid = code && code.trim() === expected;
  return respond(200, { valid });
}

// ========================
// ACTION: Initialize upload session
// ========================
async function handleInit(body) {
  const { clientName, clientEmail, clientCompany, clientPhone, isCompany, notes } = body;
  if (!clientName || !clientEmail) {
    return respond(400, { error: 'Name and email are required.' });
  }

  const sessionId = 'IFB-' + dateStamp() + '-' + crypto.randomBytes(4).toString('hex');
  const folderName = `${dateStamp()} — ${clientName}${clientCompany ? ' (' + clientCompany + ')' : ''}`;

  let folderId = null;

  // Create folder in storage backend
  if (googleConfigured()) {
    const token = await getGoogleAccessToken();
    const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1Zlp7fSMnVRiWbkRSYCoVB9-UwxmmJIgH';
    folderId = await createGoogleFolder(token, folderName, parentId);
  } else if (onedriveConfigured()) {
    folderId = await createOneDriveFolder(folderName);
  } else {
    // Fallback: use session ID as virtual folder
    folderId = sessionId;
  }

  // Store session metadata (in memory for this invocation; complete action will re-derive)
  console.log(`[INIT] Session ${sessionId} for ${clientName} <${clientEmail}>`);

  return respond(200, { sessionId, folderId });
}

// ========================
// ACTION: Upload a single file
// ========================
async function handleUpload(body) {
  const { sessionId, folderId, docType, fileName, mimeType, fileData } = body;
  if (!sessionId || !folderId || !docType || !fileName || !fileData) {
    return respond(400, { error: 'Missing required upload fields.' });
  }

  // Validate file type
  const ext = fileName.split('.').pop().toLowerCase();
  if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
    return respond(400, { error: 'Invalid file type.' });
  }

  // Sanitize file name: prepend doc type for clarity
  const docLabels = {
    'account-opening-form': '01_Account_Opening_Form',
    'passport': '02_Passport',
    'proof-of-residence': '03_Proof_of_Residence',
    'company-documents': '04_Company_Documents',
    'source-of-funds': '05_Source_of_Funds',
    'additional-documents': '06_Additional',
    // PEP-specific document types
    'representative-documents': '02_Representative_Authority',
    'primary-id': '03_Primary_Identification',
    'secondary-id': '04_Secondary_Identification',
    'proof-of-address': '05_Proof_of_Address',
    'source-of-wealth': '06_Source_of_Wealth',
    'trust-documents': '07_Trust_Documents'
  };
  const prefix = docLabels[docType] || docType;
  const safeName = `${prefix}_${sanitizeFilename(fileName)}`;
  const fileBuffer = Buffer.from(fileData, 'base64');

  if (googleConfigured()) {
    const token = await getGoogleAccessToken();
    await uploadToGoogle(token, folderId, safeName, mimeType, fileBuffer);
  } else if (onedriveConfigured()) {
    await uploadToOneDrive(folderId, safeName, mimeType, fileBuffer);
  } else {
    // Fallback: store in Netlify Blobs
    try {
      const { getStore } = require('@netlify/blobs');
      const store = getStore('client-uploads');
      await store.set(`${folderId}/${safeName}`, fileBuffer);
    } catch (e) {
      console.log('[FALLBACK] Netlify Blobs not available, file logged only. Size:', fileBuffer.length);
    }
  }

  console.log(`[UPLOAD] ${safeName} (${fileBuffer.length} bytes) → folder ${folderId}`);
  return respond(200, { success: true, fileName: safeName });
}

// ========================
// ACTION: Complete submission
// ========================
async function handleComplete(body) {
  const { sessionId, folderId, clientName, clientEmail, clientCompany, clientPhone, isCompany, notes } = body;

  let folderLink = null;

  // Generate client info summary text file
  const infoContent = buildClientInfoText({
    sessionId, clientName, clientEmail, clientCompany, clientPhone, isCompany, notes
  });

  if (googleConfigured()) {
    const token = await getGoogleAccessToken();
    folderLink = `https://drive.google.com/drive/folders/${folderId}`;

    // Upload client info text file to the folder
    try {
      const infoBuffer = Buffer.from(infoContent, 'utf-8');
      await uploadToGoogle(token, folderId, '00_Client_Information.txt', 'text/plain', infoBuffer);
    } catch (e) {
      console.error('Failed to upload client info file:', e.message);
    }

    // Set sharing permission so internal team can access
    try {
      await setGoogleFolderSharing(token, folderId);
    } catch (e) {
      console.error('Failed to set sharing:', e.message);
    }
  } else if (onedriveConfigured()) {
    folderLink = folderId; // OneDrive folder path
    // Upload client info text file to OneDrive
    try {
      const infoBuffer = Buffer.from(infoContent, 'utf-8');
      await uploadToOneDrive(folderId, '00_Client_Information.txt', 'text/plain', infoBuffer);
    } catch (e) {
      console.error('Failed to upload client info file to OneDrive:', e.message);
    }
  } else {
    // Fallback: store in Netlify Blobs
    try {
      const { getStore } = require('@netlify/blobs');
      const store = getStore('client-uploads');
      await store.set(`${folderId}/00_Client_Information.txt`, infoContent);
    } catch (e) {
      console.log('[FALLBACK] Netlify Blobs not available for client info file.');
    }
  }

  // Send notification email
  if (process.env.SENDGRID_API_KEY && process.env.NOTIFICATION_EMAIL) {
    await sendNotificationEmail({
      clientName,
      clientEmail,
      sessionId,
      folderLink
    });
  }

  console.log(`[COMPLETE] Session ${sessionId} — ${clientName} <${clientEmail}> — folder: ${folderLink || folderId}`);

  return respond(200, {
    success: true,
    sessionId,
    folderLink
  });
}

// ============================================================
// GOOGLE DRIVE INTEGRATION
// ============================================================

function googleConfigured() {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
}

/** Create a JWT and exchange it for a Google access token */
async function getGoogleAccessToken() {
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));

  const signInput = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign.sign(sa.private_key, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${header}.${payload}.${signature}`;

  const fetch = (await import('node-fetch')).default;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Google auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function createGoogleFolder(token, name, parentId) {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    })
  });
  const data = await res.json();
  if (!data.id) throw new Error('Failed to create Google folder: ' + JSON.stringify(data));
  return data.id;
}

async function uploadToGoogle(token, folderId, fileName, mimeType, fileBuffer) {
  const fetch = (await import('node-fetch')).default;
  const boundary = '----IFBUpload' + Date.now();
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });

  const bodyParts = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`,
    fileBuffer.toString('base64'),
    `\r\n--${boundary}--`
  ];

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: bodyParts.join('')
  });
  const data = await res.json();
  if (!data.id) throw new Error('Google upload failed: ' + JSON.stringify(data));
  return data.id;
}

async function setGoogleFolderSharing(token, folderId) {
  const fetch = (await import('node-fetch')).default;
  // Set "anyone with the link" can view — so admins can access via link
  // You can change this to specific email permission for tighter security
  await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone'
    })
  });
}

// ============================================================
// ONEDRIVE / MICROSOFT GRAPH INTEGRATION
// ============================================================

function onedriveConfigured() {
  return !!(process.env.ONEDRIVE_CLIENT_ID &&
            process.env.ONEDRIVE_CLIENT_SECRET &&
            process.env.ONEDRIVE_TENANT_ID);
}

async function getOneDriveToken() {
  const fetch = (await import('node-fetch')).default;
  const tenantId = process.env.ONEDRIVE_TENANT_ID;
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.ONEDRIVE_CLIENT_ID,
      client_secret: process.env.ONEDRIVE_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    }).toString()
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('OneDrive auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function createOneDriveFolder(folderName) {
  const fetch = (await import('node-fetch')).default;
  const token = await getOneDriveToken();
  const basePath = process.env.ONEDRIVE_FOLDER_PATH || '/ClientUploads';
  const driveId = process.env.ONEDRIVE_DRIVE_ID || '';

  const endpoint = driveId
    ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${basePath}:/children`
    : `https://graph.microsoft.com/v1.0/me/drive/root:${basePath}:/children`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename'
    })
  });
  const data = await res.json();
  if (!data.id) throw new Error('OneDrive folder creation failed: ' + JSON.stringify(data));
  return data.id;
}

async function uploadToOneDrive(folderId, fileName, mimeType, fileBuffer) {
  const fetch = (await import('node-fetch')).default;
  const token = await getOneDriveToken();
  const driveId = process.env.ONEDRIVE_DRIVE_ID || '';

  const endpoint = driveId
    ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}:/${fileName}:/content`
    : `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${fileName}:/content`;

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': mimeType
    },
    body: fileBuffer
  });
  const data = await res.json();
  if (!data.id) throw new Error('OneDrive upload failed: ' + JSON.stringify(data));
  return data.id;
}

// ============================================================
// EMAIL NOTIFICATION (SendGrid)
// ============================================================

async function sendNotificationEmail({ clientName, clientEmail, sessionId, folderLink }) {
  const fetch = (await import('node-fetch')).default;
  const to = process.env.NOTIFICATION_EMAIL;
  const apiKey = process.env.SENDGRID_API_KEY;

  const html = `
    <h2>New Client Document Submission</h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px;font-weight:bold;">Client:</td><td>${escHtml(clientName)}</td></tr>
      <tr><td style="padding:4px 12px;font-weight:bold;">Email:</td><td>${escHtml(clientEmail)}</td></tr>
      <tr><td style="padding:4px 12px;font-weight:bold;">Reference:</td><td>${sessionId}</td></tr>
      ${folderLink ? `<tr><td style="padding:4px 12px;font-weight:bold;">Documents:</td><td><a href="${folderLink}">${folderLink}</a></td></tr>` : ''}
    </table>
    <p style="margin-top:16px;">Please review the submitted documents at your earliest convenience.</p>
  `;

  // Send to all admin emails (comma-separated)
  const toAddresses = to.split(',').map((e) => ({ email: e.trim() }));

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: toAddresses }],
      from: { email: process.env.SENDGRID_FROM_EMAIL || 'noreply@infiba.com', name: 'IFB Upload Portal' },
      subject: `New Document Submission — ${clientName} [${sessionId}]`,
      content: [{ type: 'text/html', value: html }]
    })
  });
}

// ============================================================
// UTILITIES
// ============================================================

function buildClientInfoText({ sessionId, clientName, clientEmail, clientCompany, clientPhone, isCompany, notes }) {
  const lines = [
    '============================================',
    '  CLIENT INFORMATION SUMMARY',
    '============================================',
    '',
    `Reference:      ${sessionId || 'N/A'}`,
    `Date:           ${new Date().toISOString().slice(0, 10)}`,
    '',
    '--- Contact Details ---',
    `Full Name:      ${clientName || 'N/A'}`,
    `Email:          ${clientEmail || 'N/A'}`,
    `Phone:          ${clientPhone || 'Not provided'}`,
    `Company:        ${clientCompany || 'Not provided'}`,
    `Account Type:   ${isCompany ? 'Company / Entity' : 'Individual'}`,
    '',
    '--- Account Purpose / Notes ---',
    notes || 'No additional notes provided.',
    '',
    '============================================',
    `  Generated: ${new Date().toISOString()}`,
    '============================================',
    ''
  ];
  return lines.join('\n');
}

function respond(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
