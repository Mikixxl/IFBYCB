/* === IFB Upload Portal — Frontend Logic === */
(function () {
  'use strict';

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

  // ===== BACKEND CONFIGURATION =====
  // Set your Google Apps Script Web App URL here after deployment.
  // Leave empty to fall back to the Netlify function backend.
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbz5f_4yNT6EhUglvUTpfXh615VnPmQTNbqyuqpzA0nC28sgtCPYxaXD_PwcsOHCCCG3/exec';
  const NETLIFY_URL = '/.netlify/functions/upload-handler';
  const API_URL = GAS_URL || NETLIFY_URL;

  // State
  const state = {
    accessVerified: false,
    sessionId: null,
    folderId: null,
    files: {},       // { docType: [File, ...] }
    uploading: false
  };

  // DOM references
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const elGate       = $('#access-gate');
  const elMain       = $('#upload-main');
  const elGateName   = $('#gate-name');
  const elGateCompany= $('#gate-company');
  const elGateEmail  = $('#gate-email');
  const elAccessBtn  = $('#btn-access');
  const elAccessErr  = $('#access-error');
  const elSubmitBtn  = $('#btn-submit');
  const elConsent    = $('#consent-check');
  const elIsCompany  = $('#is-company');
  const elCompanySec = $('#company-docs-section');
  const elProgress   = $('#upload-progress');
  const elFill       = $('#progress-fill');
  const elProgressTx = $('#progress-text');
  const elSubmitErr  = $('#submit-error');
  const elSuccess    = $('#success-state');
  const elSofHeading = $('#sof-heading');
  const elAddHeading = $('#additional-heading');

  // --- Access Gate (Name / Company / Email) ---
  elAccessBtn.addEventListener('click', verifyClient);
  elGateEmail.addEventListener('keydown', (e) => { if (e.key === 'Enter') verifyClient(); });

  function verifyClient() {
    elAccessErr.hidden = true;
    const name = elGateName.value.trim();
    const company = elGateCompany.value.trim();
    const email = elGateEmail.value.trim();

    if (!name) { showError(elAccessErr, 'Please enter your full name.'); return; }
    if (!email) { showError(elAccessErr, 'Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError(elAccessErr, 'Please enter a valid email address.');
      return;
    }

    // Pass values into the main form hidden fields
    $('#client-name').value = name;
    $('#client-email').value = email;
    $('#client-company').value = company;

    // Show summary in the main form
    const summary = $('#client-summary');
    summary.innerHTML =
      '<div class="summary-row"><strong>' + escHtml(name) + '</strong></div>' +
      (company ? '<div class="summary-row">' + escHtml(company) + '</div>' : '') +
      '<div class="summary-row">' + escHtml(email) + '</div>';

    state.accessVerified = true;
    elGate.hidden = true;
    elMain.hidden = false;
  }

  // --- Company toggle ---
  elIsCompany.addEventListener('change', () => {
    const isCompany = elIsCompany.checked;
    elCompanySec.hidden = !isCompany;
    // Re-number headings dynamically
    elSofHeading.textContent = isCompany ? '5. Source of Funds Declaration' : '4. Source of Funds Declaration';
    elAddHeading.textContent = isCompany ? '6. Additional Information' : '5. Additional Information';
  });

  // --- Consent toggle ---
  elConsent.addEventListener('change', updateSubmitState);
  function updateSubmitState() {
    elSubmitBtn.disabled = !elConsent.checked || state.uploading;
  }

  // --- Upload Zones ---
  $$('.upload-zone').forEach(initUploadZone);

  function initUploadZone(zone) {
    const docType = zone.dataset.doc;
    const input = zone.querySelector('.file-input');
    const content = zone.querySelector('.upload-zone-content');
    const preview = zone.querySelector('.file-preview');
    const isMultiple = input.hasAttribute('multiple');

    // Click to browse
    zone.addEventListener('click', (e) => {
      if (e.target.closest('.file-remove')) return;
      input.click();
    });

    // Drag events
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });

    // File input change
    input.addEventListener('change', () => handleFiles(input.files));

    function handleFiles(fileList) {
      const files = Array.from(fileList);
      const valid = [];
      for (const f of files) {
        const ext = '.' + f.name.split('.').pop().toLowerCase();
        if (!ALLOWED_TYPES.includes(f.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
          alert(`"${f.name}" is not an accepted file type. Please use PDF, JPG, or PNG.`);
          continue;
        }
        if (f.size > MAX_FILE_SIZE) {
          alert(`"${f.name}" exceeds the 10 MB size limit.`);
          continue;
        }
        valid.push(f);
      }
      if (!valid.length) return;

      if (isMultiple) {
        state.files[docType] = (state.files[docType] || []).concat(valid);
      } else {
        state.files[docType] = [valid[0]];
      }
      renderPreview();
    }

    function renderPreview() {
      const fileArr = state.files[docType] || [];
      if (fileArr.length === 0) {
        zone.classList.remove('has-file');
        content.hidden = false;
        preview.hidden = true;
        preview.innerHTML = '';
        return;
      }
      zone.classList.add('has-file');
      content.hidden = true;
      preview.hidden = false;
      preview.innerHTML = fileArr.map((f, i) => `
        <div class="file-item" data-idx="${i}">
          <span class="file-name">${escHtml(f.name)}</span>
          <span class="file-size">${formatSize(f.size)}</span>
          <span class="file-status" data-doc="${docType}" data-fidx="${i}"></span>
          <button class="file-remove" title="Remove">&times;</button>
        </div>
      `).join('');

      // Remove handlers
      preview.querySelectorAll('.file-remove').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.parentElement.dataset.idx);
          state.files[docType].splice(idx, 1);
          if (!state.files[docType].length) delete state.files[docType];
          renderPreview();
        });
      });
    }
  }

  // --- Submit ---
  elSubmitBtn.addEventListener('click', submitDocuments);

  async function submitDocuments() {
    // Validate client info
    const clientName = $('#client-name').value.trim();
    const clientEmail = $('#client-email').value.trim();
    if (!clientName || !clientEmail) {
      showError(elSubmitErr, 'Please fill in your name and email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      showError(elSubmitErr, 'Please enter a valid email address.');
      return;
    }

    // Validate required files
    const required = ['account-opening-form', 'passport', 'proof-of-residence', 'source-of-funds'];
    const missing = required.filter((d) => !state.files[d] || !state.files[d].length);
    if (missing.length) {
      const labels = {
        'account-opening-form': 'Account Opening Form',
        'passport': 'Passport Copy',
        'proof-of-residence': 'Proof of Residence',
        'source-of-funds': 'Source of Funds Declaration'
      };
      showError(elSubmitErr, 'Please upload: ' + missing.map((m) => labels[m]).join(', '));
      return;
    }

    if (elIsCompany.checked && (!state.files['company-documents'] || !state.files['company-documents'].length)) {
      showError(elSubmitErr, 'Please upload your Company Documents.');
      return;
    }

    // Begin upload
    state.uploading = true;
    elSubmitBtn.disabled = true;
    elSubmitErr.hidden = true;
    elProgress.hidden = false;
    elFill.style.width = '0%';

    try {
      // Step 1: Init session
      elProgressTx.textContent = 'Initializing secure session...';
      const initRes = await apiCall('init', {
        clientName,
        clientEmail,
        clientCompany: $('#client-company').value.trim(),
        clientPhone: $('#client-phone').value.trim(),
        isCompany: elIsCompany.checked,
        notes: $('#additional-notes').value.trim()
      });
      state.sessionId = initRes.sessionId;
      state.folderId = initRes.folderId;

      // Step 2: Upload files one by one
      const allFiles = [];
      for (const [docType, files] of Object.entries(state.files)) {
        for (let i = 0; i < files.length; i++) {
          allFiles.push({ docType, file: files[i], idx: i });
        }
      }

      for (let i = 0; i < allFiles.length; i++) {
        const { docType, file, idx } = allFiles[i];
        const pct = Math.round(((i) / allFiles.length) * 80) + 10;
        elFill.style.width = pct + '%';
        elProgressTx.textContent = `Uploading ${file.name} (${i + 1}/${allFiles.length})...`;

        // Update file status in UI
        const statusEl = document.querySelector(`.file-status[data-doc="${docType}"][data-fidx="${idx}"]`);
        if (statusEl) { statusEl.textContent = 'Uploading...'; statusEl.className = 'file-status uploading'; }

        const base64 = await fileToBase64(file);
        await apiCall('upload', {
          sessionId: state.sessionId,
          folderId: state.folderId,
          docType,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileData: base64
        });

        if (statusEl) { statusEl.textContent = 'Uploaded'; statusEl.className = 'file-status done'; }
      }

      // Step 3: Complete
      elFill.style.width = '95%';
      elProgressTx.textContent = 'Finalizing submission...';

      const completeRes = await apiCall('complete', {
        sessionId: state.sessionId,
        folderId: state.folderId,
        clientName,
        clientEmail
      });

      elFill.style.width = '100%';
      elProgressTx.textContent = 'Complete!';

      // Show success
      setTimeout(() => {
        elMain.querySelectorAll('.card:not(#success-state)').forEach((c) => c.hidden = true);
        elProgress.hidden = true;
        elSuccess.hidden = false;
        $('#submission-ref').textContent = 'Reference: ' + (state.sessionId || '').toUpperCase();
      }, 600);

    } catch (err) {
      showError(elSubmitErr, err.message || 'Upload failed. Please try again or contact support.');
      state.uploading = false;
      elSubmitBtn.disabled = false;
      elProgress.hidden = true;
      updateSubmitState();
    }
  }

  // --- Helpers ---
  async function apiCall(action, data) {
    const payload = JSON.stringify({ action, ...data });

    // Use Google Apps Script directly — no fallback to avoid double submissions
    if (GAS_URL) {
      return await gasCall(payload);
    }
    return await netlifyCall(payload);
  }

  async function gasCall(payload) {
    let res;
    try {
      res = await fetch(GAS_URL, {
        method: 'POST',
        body: payload
      });
    } catch (networkErr) {
      throw new Error('Network error connecting to server. Please check your connection and try again.');
    }

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch (_) {
      console.error('GAS raw response:', text.substring(0, 500));
      throw new Error('Unexpected server response. Please try again.');
    }

    if (json.error) throw new Error(json.error);
    return json;
  }

  async function netlifyCall(payload) {
    const res = await fetch(NETLIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch (_) {
      console.error('Netlify raw response:', res.status, text.substring(0, 500));
      throw new Error('Server error (' + res.status + '). Please try again.');
    }

    if (json.error) throw new Error(json.error);
    return json;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.hidden = false;
  }
})();
