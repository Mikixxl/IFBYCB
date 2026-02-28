/* === IFB PEP Upload Portal — Frontend Logic === */
(function () {
  'use strict';

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

  // ===== BACKEND CONFIGURATION =====
  // Same backend as the standard upload portal
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

  const elGate            = $('#access-gate');
  const elMain            = $('#upload-main');
  const elGateName        = $('#gate-name');
  const elGateCompany     = $('#gate-company');
  const elGateEmail       = $('#gate-email');
  const elAccessBtn       = $('#btn-access');
  const elAccessErr       = $('#access-error');
  const elSubmitBtn       = $('#btn-submit');
  const elConsent         = $('#consent-check');
  const elIsCompany       = $('#is-company');
  const elIsRepresentative= $('#is-representative');
  const elCompanySec      = $('#company-docs-section');
  const elRepSec          = $('#representative-docs-section');
  const elTrustSec        = $('#trust-docs-section');
  const elProgress        = $('#upload-progress');
  const elFill            = $('#progress-fill');
  const elProgressTx      = $('#progress-text');
  const elSubmitErr       = $('#submit-error');
  const elSuccess         = $('#success-state');

  // --- Access Gate ---
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

    $('#client-name').value = name;
    $('#client-email').value = email;
    $('#client-company').value = company;

    const summary = $('#client-summary');
    summary.innerHTML =
      '<div class="summary-row"><strong>' + escHtml(name) + '</strong></div>' +
      (company ? '<div class="summary-row">' + escHtml(company) + '</div>' : '') +
      '<div class="summary-row">' + escHtml(email) + '</div>';

    state.accessVerified = true;
    elGate.hidden = true;
    elMain.hidden = false;
  }

  // --- Conditional section toggles ---
  elIsCompany.addEventListener('change', renumberSections);
  elIsRepresentative.addEventListener('change', () => {
    elRepSec.hidden = !elIsRepresentative.checked;
    renumberSections();
  });

  // Trust docs checkbox — show if company or representative is checked
  // (trust structures are common in PEP setups)
  function updateTrustVisibility() {
    // Trust section is always visible for PEPs — they can optionally upload
    elTrustSec.hidden = false;
  }

  // --- Dynamic section numbering ---
  function renumberSections() {
    elCompanySec.hidden = !elIsCompany.checked;
    elRepSec.hidden = !elIsRepresentative.checked;
    updateTrustVisibility();

    // Renumber all visible section headings
    let num = 1; // Section 1 is always "Your Information"
    const allSections = elMain.querySelectorAll('section.card:not(#success-state):not(.intro-card):not(.submit-card)');
    allSections.forEach((section) => {
      if (section.hidden) return;
      const numSpan = section.querySelector('.section-num');
      if (numSpan) {
        numSpan.textContent = num;
      }
      num++;
    });
  }

  // Initialize: show trust section by default for PEPs
  updateTrustVisibility();
  renumberSections();

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

    function isDuplicate(file) {
      const existing = state.files[docType] || [];
      return existing.some((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
    }

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
        if (isDuplicate(f)) {
          alert(`"${f.name}" has already been added to this section.`);
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

    // PEP category is required
    const pepCategory = $('#pep-category').value;
    if (!pepCategory) {
      showError(elSubmitErr, 'Please select your PEP category.');
      return;
    }

    // Validate required files
    const required = ['account-opening-form', 'primary-id', 'proof-of-address', 'source-of-wealth'];
    const missing = required.filter((d) => !state.files[d] || !state.files[d].length);
    if (missing.length) {
      const labels = {
        'account-opening-form': 'Account Opening Form',
        'primary-id': 'Primary Identification (Passport / National ID)',
        'proof-of-address': 'Proof of Address',
        'source-of-wealth': 'Source of Wealth & Funds'
      };
      showError(elSubmitErr, 'Please upload: ' + missing.map((m) => labels[m]).join(', '));
      return;
    }

    // Conditional required: representative docs
    if (elIsRepresentative.checked && (!state.files['representative-documents'] || !state.files['representative-documents'].length)) {
      showError(elSubmitErr, 'Please upload your Authorised Representative Documents (Power of Attorney, etc.).');
      return;
    }

    // Conditional required: company docs
    if (elIsCompany.checked && (!state.files['company-documents'] || !state.files['company-documents'].length)) {
      showError(elSubmitErr, 'Please upload your Company / Entity Documents.');
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
      const pepPosition = $('#pep-position').value.trim();
      const pepCountry = $('#pep-country').value.trim();
      const pepCategoryLabel = $('#pep-category').selectedOptions[0].text;
      const notes = $('#additional-notes').value.trim();

      // Build enhanced notes with PEP-specific info
      const pepNotes = [
        '[PEP SUBMISSION]',
        'PEP Category: ' + pepCategoryLabel,
        pepPosition ? 'Political Position: ' + pepPosition : '',
        pepCountry ? 'Country of Exposure: ' + pepCountry : '',
        elIsRepresentative.checked ? 'Submitted by: Authorised Representative' : 'Submitted by: PEP directly',
        '',
        notes || ''
      ].filter(Boolean).join('\n');

      const initRes = await apiCall('init', {
        clientName,
        clientEmail,
        clientCompany: $('#client-company').value.trim(),
        clientPhone: $('#client-phone').value.trim(),
        isCompany: elIsCompany.checked,
        notes: pepNotes
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
        clientEmail,
        clientCompany: $('#client-company').value.trim(),
        clientPhone: $('#client-phone').value.trim(),
        isCompany: elIsCompany.checked,
        notes: pepNotes
      });

      elFill.style.width = '100%';
      elProgressTx.textContent = 'Complete!';

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

  // --- API Helpers ---
  async function apiCall(action, data) {
    const payload = JSON.stringify({ action, ...data });
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

  // --- Utility Functions ---
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
