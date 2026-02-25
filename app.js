/* ═══════════════════════════════════════════════
   MEETING RECORDER — app.js
   Flows:
   1. Live recording → Web Speech API → Claude analysis
   2. Audio upload   → OpenAI Whisper  → Claude analysis
═══════════════════════════════════════════════ */

// ── State ──────────────────────────────────────
const S = {
  phase: 'idle', // idle | recording | processing | results
  transcript: '',
  interimTranscript: '',
  analysis: null,
  audioBlob: null,
  audioFile: null,
  mediaRecorder: null,
  recognition: null,
  timerInterval: null,
  seconds: 0,
  currentTab: 'record',
  settings: {
    anthropicKey: '',
    openaiKey: '',
    model: 'claude-sonnet-4-6',
    lang: 'en-US',
    meetingLanguages: [],
  },
  history: [],
};

// ── DOM refs ───────────────────────────────────
const $ = id => document.getElementById(id);

const dom = {
  // Settings
  settingsBtn:     $('settingsBtn'),
  settingsOverlay: $('settingsOverlay'),
  closeSettings:   $('closeSettings'),
  saveSettings:    $('saveSettings'),
  anthropicKey:        $('anthropicKey'),
  openaiKey:           $('openaiKey'),
  modelSelect:         $('modelSelect'),
  langSelect:          $('langSelect'),
  expectedLangsSelect: $('expectedLangsSelect'),
  // Output language modal
  outputLangOverlay:   $('outputLangOverlay'),
  outputLangSelect:    $('outputLangSelect'),
  confirmOutputLang:   $('confirmOutputLang'),
  cancelOutputLang:    $('cancelOutputLang'),

  // Tabs
  tabBtns:    document.querySelectorAll('.tab[data-tab]'),
  panels:     { record: $('panelRecord'), upload: $('panelUpload'), history: $('panelHistory') },

  // Record tab
  timerDisplay:      $('timerDisplay'),
  statusChip:        $('statusChip'),
  recordBtn:         $('recordBtn'),
  recordShape:       $('recordShape'),
  recordHint:        $('recordHint'),
  transcriptEmpty:   $('transcriptEmpty'),
  transcriptText:    $('transcriptText'),
  transcriptInterim: $('transcriptInterim'),
  analyzeBtn:        $('analyzeBtn'),
  whisperRecordBtn:  $('whisperRecordBtn'),

  // Upload tab
  uploadDrop:    $('uploadDrop'),
  browseBtn:     $('browseBtn'),
  audioFileInput:$('audioFileInput'),
  fileCard:      $('fileCard'),
  fileCardName:  $('fileCardName'),
  fileCardSize:  $('fileCardSize'),
  transcribeBtn: $('transcribeBtn'),
  clearFileBtn:  $('clearFileBtn'),

  // History
  historyEmpty: $('historyEmpty'),
  historyList:  $('historyList'),

  // Processing
  processingOverlay: $('processingOverlay'),
  processingLabel:   $('processingLabel'),
  processingSub:     $('processingSub'),

  // Results
  resultsScreen:   $('resultsScreen'),
  resultsTitle:    $('resultsTitle'),
  backBtn:         $('backBtn'),
  shareBtn:        $('shareBtn'),
  resultTabBtns:   document.querySelectorAll('.tab[data-result-tab]'),
  resultPanels:    { summary: $('rPanelSummary'), actions: $('rPanelActions'), transcript: $('rPanelTranscript') },
  rSummary:        $('rSummary'),
  rDecisions:      $('rDecisions'),
  rDecisionsCard:  $('rDecisionsCard'),
  rFollowup:       $('rFollowup'),
  rFollowupCard:   $('rFollowupCard'),
  rParticipants:   $('rParticipants'),
  rParticipantsCard: $('rParticipantsCard'),
  rActionsList:    $('rActionsList'),
  rNoActions:      $('rNoActions'),
  rTranscript:     $('rTranscript'),
  copyTranscriptBtn: $('copyTranscriptBtn'),
  copyAllBtn:      $('copyAllBtn'),

  toast: $('toast'),
};

// ── Settings persistence ───────────────────────
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('meetrec_settings') || '{}');
    Object.assign(S.settings, saved);
  } catch {}

  try {
    S.history = JSON.parse(localStorage.getItem('meetrec_history') || '[]');
  } catch {}
}

function saveSettingsToStorage() {
  localStorage.setItem('meetrec_settings', JSON.stringify(S.settings));
}

function saveHistoryToStorage() {
  // Keep last 30 entries
  localStorage.setItem('meetrec_history', JSON.stringify(S.history.slice(0, 30)));
}

function populateSettingsUI() {
  dom.anthropicKey.value = S.settings.anthropicKey;
  dom.openaiKey.value    = S.settings.openaiKey;
  dom.modelSelect.value  = S.settings.model;
  dom.langSelect.value   = S.settings.lang;
  Array.from(dom.expectedLangsSelect.options).forEach(opt => {
    opt.selected = (S.settings.meetingLanguages || []).includes(opt.value);
  });
}

// ── Toast ──────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  clearTimeout(toastTimer);
  dom.toast.textContent = msg;
  dom.toast.className   = `toast ${type}`;
  toastTimer = setTimeout(() => dom.toast.classList.add('hidden'), 3000);
}

// ── Timer ──────────────────────────────────────
function startTimer() {
  S.seconds = 0;
  updateTimerDisplay();
  S.timerInterval = setInterval(() => {
    S.seconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(S.timerInterval);
  S.timerInterval = null;
}

function updateTimerDisplay() {
  const m = String(Math.floor(S.seconds / 60)).padStart(2, '0');
  const s = String(S.seconds % 60).padStart(2, '0');
  dom.timerDisplay.textContent = `${m}:${s}`;
}

// ── Transcript UI helpers ──────────────────────
function updateTranscriptUI() {
  const hasText = S.transcript.trim().length > 0 || S.interimTranscript.trim().length > 0;
  dom.transcriptEmpty.classList.toggle('hidden', hasText);
  dom.transcriptText.textContent = S.transcript;
  dom.transcriptInterim.textContent = S.interimTranscript;

  // Auto-scroll
  const scroll = dom.transcriptText.closest('.transcript-scroll') || dom.transcriptText.parentElement;
  scroll.scrollTop = scroll.scrollHeight;
}

// ── Recording ──────────────────────────────────
async function startRecording() {
  if (!S.settings.anthropicKey) {
    showToast('Add your Anthropic API key in Settings first', 'error');
    openSettings();
    return;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch {
    showToast('Microphone access denied — please allow it in Settings', 'error');
    return;
  }

  // Reset state
  S.transcript = '';
  S.interimTranscript = '';
  S.audioBlob = null;
  updateTranscriptUI();

  // MediaRecorder (captures audio for potential upload)
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    .find(t => MediaRecorder.isTypeSupported(t)) || '';
  const chunks = [];
  S.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
  S.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  S.mediaRecorder.onstop = () => {
    S.audioBlob = new Blob(chunks, { type: S.mediaRecorder.mimeType || 'audio/mp4' });
    stream.getTracks().forEach(t => t.stop());
    // Show Whisper button now that audio blob is ready
    if (S.phase !== 'recording') dom.whisperRecordBtn.classList.remove('hidden');
  };
  S.mediaRecorder.start(1000);

  // Speech Recognition (live transcription)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    S.recognition = new SR();
    S.recognition.continuous      = true;
    S.recognition.interimResults  = true;
    S.recognition.lang            = S.settings.lang;
    S.recognition.maxAlternatives = 1;

    S.recognition.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          S.transcript += text + ' ';
        } else {
          interim += text;
        }
      }
      S.interimTranscript = interim;
      updateTranscriptUI();
    };

    let srErrored = false;
    S.recognition.onerror = e => {
      if (e.error === 'no-speech') return; // normal, ignore
      console.warn('SR error:', e.error);
      srErrored = true;
      const msgs = {
        'network':              'Speech recognition requires a network connection',
        'audio-capture':        'No microphone found or audio capture failed',
        'not-allowed':          'Microphone permission denied for speech recognition',
        'service-not-allowed':  'Speech recognition service not allowed in this browser',
        'bad-grammar':          'Speech recognition grammar error',
        'language-not-supported': 'Selected language not supported by speech recognition',
      };
      showToast(msgs[e.error] || `Speech recognition error: ${e.error}`, 'error');
    };
    S._srErrored = () => srErrored;

    // On iOS, onend fires often — restart automatically while recording
    S.recognition.onend = () => {
      if (S.phase === 'recording') {
        try { S.recognition.start(); } catch {}
      }
    };

    try { S.recognition.start(); } catch {}
  } else {
    showToast('Live transcription unavailable in this browser', '');
  }

  S.phase = 'recording';
  startTimer();
  renderRecordUI();
}

function stopRecording() {
  if (S.mediaRecorder && S.mediaRecorder.state !== 'inactive') {
    S.mediaRecorder.stop();
  }
  if (S.recognition) {
    try { S.recognition.stop(); } catch {}
    S.recognition = null;
  }
  stopTimer();

  // Commit any interim text
  if (S.interimTranscript.trim()) {
    S.transcript += S.interimTranscript + ' ';
    S.interimTranscript = '';
    updateTranscriptUI();
  }

  S.phase = 'idle';
  renderRecordUI();

  // Show live transcript button only if speech recognition captured something
  if (S.transcript.trim().length > 10) {
    dom.analyzeBtn.classList.remove('hidden');
  }
  // Whisper button is shown by onstop handler once the audio blob is ready
}

function renderRecordUI() {
  const isRec = S.phase === 'recording';
  dom.recordBtn.classList.toggle('is-recording', isRec);
  dom.statusChip.textContent = isRec ? 'Recording' : 'Ready';
  dom.statusChip.classList.toggle('recording', isRec);
  dom.recordHint.textContent = isRec ? 'Tap to stop' : 'Tap to start recording';
  // Always hide both analyze buttons; stopRecording / onstop will show them when appropriate
  dom.analyzeBtn.classList.add('hidden');
  dom.whisperRecordBtn.classList.add('hidden');
}

// ── Whisper transcription ──────────────────────
async function transcribeWithWhisper(blob, filename) {
  if (!S.settings.openaiKey) {
    throw new Error('OpenAI API key required for file upload. Add it in Settings.');
  }

  const formData = new FormData();
  formData.append('file', blob, filename || 'recording.m4a');
  formData.append('model', 'whisper-1');
  // Only constrain language when meeting is monolingual; multilingual = let Whisper auto-detect
  const isMultilingual = S.settings.meetingLanguages && S.settings.meetingLanguages.length > 1;
  if (!isMultilingual && S.settings.lang && S.settings.lang !== 'auto') {
    // Whisper uses ISO 639-1; extract from locale (e.g. "en-US" → "en")
    formData.append('language', S.settings.lang.split('-')[0]);
  }

  const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${S.settings.openaiKey}` },
    body: formData,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `Whisper error ${resp.status}`);
  }

  const data = await resp.json();
  return data.text || '';
}

// ── Claude analysis ────────────────────────────
async function analyzeWithClaude(transcript, outputLang) {
  if (!S.settings.anthropicKey) {
    throw new Error('Anthropic API key required. Add it in Settings.');
  }

  const resp = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      model:            S.settings.model,
      apiKey:           S.settings.anthropicKey,
      outputLanguage:   outputLang || 'auto',
      meetingLanguages: S.settings.meetingLanguages || [],
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    const msg = data.error?.message || data.error || `Claude error ${resp.status}`;
    throw new Error(msg);
  }

  // Claude wraps the reply in content[0].text
  const raw = data.content?.[0]?.text;
  if (!raw) throw new Error('Empty response from Claude');

  // Parse JSON — Claude may wrap in markdown fence
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Return a minimal object if JSON fails
    return { title: 'Meeting', summary: raw, actionItems: [], keyDecisions: [], followUpItems: [], participants: [] };
  }
}

// ── Output language selection ──────────────────
function askOutputLanguage() {
  return new Promise((resolve) => {
    dom.outputLangSelect.value = 'auto';
    dom.outputLangOverlay.classList.remove('hidden');

    function onConfirm() {
      dom.outputLangOverlay.classList.add('hidden');
      cleanup();
      resolve(dom.outputLangSelect.value);
    }
    function onCancel() {
      dom.outputLangOverlay.classList.add('hidden');
      cleanup();
      resolve(null);
    }
    function cleanup() {
      dom.confirmOutputLang.removeEventListener('click', onConfirm);
      dom.cancelOutputLang.removeEventListener('click', onCancel);
    }
    dom.confirmOutputLang.addEventListener('click', onConfirm);
    dom.cancelOutputLang.addEventListener('click', onCancel);
  });
}

// ── Full pipeline ──────────────────────────────
async function runPipeline(transcript, label) {
  const outputLang = await askOutputLanguage();
  if (outputLang === null) return; // user cancelled

  setProcessing(true, label || 'Analyzing with Claude…', 'This usually takes 5–15 seconds');
  try {
    const analysis = await analyzeWithClaude(transcript, outputLang);
    S.analysis = analysis;

    // Save to history
    const entry = {
      id:         Date.now(),
      title:      analysis.title || 'Untitled Meeting',
      date:       new Date().toLocaleString(),
      model:      S.settings.model,
      transcript,
      analysis,
    };
    S.history.unshift(entry);
    saveHistoryToStorage();
    renderHistory();

    setProcessing(false);
    showResults(transcript, analysis);
  } catch (err) {
    setProcessing(false);
    showToast(err.message, 'error');
    console.error(err);
  }
}

function setProcessing(on, label, sub) {
  dom.processingOverlay.classList.toggle('hidden', !on);
  if (on) {
    dom.processingLabel.textContent = label || 'Processing…';
    dom.processingSub.textContent   = sub || '';
  }
}

// ── Results screen ─────────────────────────────
function showResults(transcript, analysis) {
  dom.resultsTitle.textContent = analysis.title || 'Analysis';

  // Summary
  dom.rSummary.textContent = analysis.summary || '—';

  // Decisions
  renderList(dom.rDecisions, analysis.keyDecisions);
  dom.rDecisionsCard.classList.toggle('hidden', !analysis.keyDecisions?.length);

  // Follow-up
  renderList(dom.rFollowup, analysis.followUpItems);
  dom.rFollowupCard.classList.toggle('hidden', !analysis.followUpItems?.length);

  // Participants
  const parts = analysis.participants?.join(', ');
  dom.rParticipants.textContent = parts || '—';
  dom.rParticipantsCard.classList.toggle('hidden', !parts);

  // Action items
  const items = analysis.actionItems || [];
  dom.rNoActions.classList.toggle('hidden', items.length > 0);
  dom.rActionsList.innerHTML = items.map(renderActionCard).join('');

  // Transcript
  dom.rTranscript.textContent = transcript;

  // Switch to first result tab
  switchResultTab('summary');

  dom.resultsScreen.classList.remove('hidden');
}

function renderList(ul, items) {
  ul.innerHTML = (items || []).map(t => `<li>${escHtml(t)}</li>`).join('');
}

function renderActionCard(item) {
  const priority = (item.priority || 'medium').toLowerCase();
  return `<div class="action-card">
    <div class="action-header">
      <p class="action-task">${escHtml(item.task)}</p>
      <span class="priority-badge priority-${priority}">${priority}</span>
    </div>
    <div class="action-meta">
      <span class="action-meta-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        ${escHtml(item.owner || 'Unassigned')}
      </span>
      <span class="action-meta-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${escHtml(item.deadline || 'Not specified')}
      </span>
    </div>
  </div>`;
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function switchResultTab(name) {
  dom.resultTabBtns.forEach(b => b.classList.toggle('active', b.dataset.resultTab === name));
  Object.entries(dom.resultPanels).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
}

// ── History ────────────────────────────────────
function renderHistory() {
  if (S.history.length === 0) {
    dom.historyEmpty.classList.remove('hidden');
    dom.historyList.innerHTML = '';
    return;
  }
  dom.historyEmpty.classList.add('hidden');
  dom.historyList.innerHTML = S.history.map((e, i) => `
    <li class="history-item" data-index="${i}">
      <span class="history-item-title">${escHtml(e.title)}</span>
      <span class="history-item-meta">${escHtml(e.date)}</span>
      <span class="history-item-model">${escHtml(e.model)}</span>
    </li>`).join('');
}

// ── Tab switching ──────────────────────────────
function switchTab(name) {
  S.currentTab = name;
  dom.tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  Object.entries(dom.panels).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
}

// ── Settings modal ─────────────────────────────
function openSettings() {
  populateSettingsUI();
  dom.settingsOverlay.classList.remove('hidden');
}

function closeSettingsModal() {
  dom.settingsOverlay.classList.add('hidden');
}

// ── Upload tab helpers ─────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showFileCard(file) {
  S.audioFile = file;
  dom.fileCardName.textContent = file.name;
  dom.fileCardSize.textContent = formatBytes(file.size);
  dom.uploadDrop.classList.add('hidden');
  dom.fileCard.classList.remove('hidden');
}

function clearFile() {
  S.audioFile = null;
  dom.audioFileInput.value = '';
  dom.fileCard.classList.add('hidden');
  dom.uploadDrop.classList.remove('hidden');
}

// ── Share / copy ───────────────────────────────
function buildShareText() {
  if (!S.analysis) return '';
  const { title, summary, actionItems, keyDecisions, followUpItems, participants } = S.analysis;
  const lines = [
    `# ${title || 'Meeting Notes'}`,
    '',
    '## Summary',
    summary || '',
  ];
  if (participants?.length) {
    lines.push('', '## Participants');
    lines.push(participants.join(', '));
  }
  if (keyDecisions?.length) {
    lines.push('', '## Key Decisions');
    keyDecisions.forEach(d => lines.push(`- ${d}`));
  }
  if (actionItems?.length) {
    lines.push('', '## Action Items');
    actionItems.forEach(a => lines.push(`- [ ] ${a.task} (${a.owner}, ${a.deadline})`));
  }
  if (followUpItems?.length) {
    lines.push('', '## Follow-up Items');
    followUpItems.forEach(f => lines.push(`- ${f}`));
  }
  return lines.join('\n');
}

// ── Event listeners ────────────────────────────

// Settings
dom.settingsBtn.addEventListener('click', openSettings);
dom.closeSettings.addEventListener('click', closeSettingsModal);
dom.settingsOverlay.addEventListener('click', e => {
  if (e.target === dom.settingsOverlay) closeSettingsModal();
});
dom.saveSettings.addEventListener('click', () => {
  S.settings.anthropicKey     = dom.anthropicKey.value.trim();
  S.settings.openaiKey        = dom.openaiKey.value.trim();
  S.settings.model            = dom.modelSelect.value;
  S.settings.lang             = dom.langSelect.value;
  S.settings.meetingLanguages = Array.from(dom.expectedLangsSelect.selectedOptions).map(o => o.value);
  saveSettingsToStorage();
  closeSettingsModal();
  showToast('Settings saved', 'success');
});

// Tab nav
dom.tabBtns.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Record button
dom.recordBtn.addEventListener('click', () => {
  if (S.phase === 'recording') {
    stopRecording();
  } else if (S.phase === 'idle') {
    startRecording();
  }
});

// Analyze button (live transcript)
dom.analyzeBtn.addEventListener('click', () => {
  const text = S.transcript.trim();
  if (!text) { showToast('No transcript to analyze', 'error'); return; }
  runPipeline(text, 'Analyzing with Claude…');
});

// Whisper button (transcribe recorded audio, then analyze)
dom.whisperRecordBtn.addEventListener('click', async () => {
  if (!S.settings.openaiKey) {
    showToast('OpenAI API key required for Whisper — add it in Settings', 'error');
    openSettings();
    return;
  }
  if (!S.audioBlob) {
    showToast('No audio to transcribe', 'error');
    return;
  }
  const mimeType = S.audioBlob.type || 'audio/webm';
  const ext = mimeType.includes('webm') ? 'webm'
            : mimeType.includes('mp4')  ? 'mp4'
            : mimeType.includes('ogg')  ? 'ogg' : 'webm';
  setProcessing(true, 'Transcribing with Whisper…', 'Processing recorded audio at full speed');
  try {
    const transcript = await transcribeWithWhisper(S.audioBlob, `recording.${ext}`);
    if (!transcript.trim()) throw new Error('Transcription returned empty text');
    setProcessing(false);
    runPipeline(transcript, 'Analyzing with Claude…');
  } catch (err) {
    setProcessing(false);
    showToast(err.message, 'error');
    console.error(err);
  }
});

// Upload tab
dom.browseBtn.addEventListener('click', () => dom.audioFileInput.click());
dom.uploadDrop.addEventListener('click', e => {
  if (e.target !== dom.browseBtn) dom.audioFileInput.click();
});

dom.audioFileInput.addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (file) showFileCard(file);
});

// Drag-and-drop
dom.uploadDrop.addEventListener('dragover', e => {
  e.preventDefault();
  dom.uploadDrop.classList.add('dragover');
});
dom.uploadDrop.addEventListener('dragleave', () => dom.uploadDrop.classList.remove('dragover'));
dom.uploadDrop.addEventListener('drop', e => {
  e.preventDefault();
  dom.uploadDrop.classList.remove('dragover');
  const file = e.dataTransfer.files?.[0];
  if (file) showFileCard(file);
});

dom.clearFileBtn.addEventListener('click', clearFile);

dom.transcribeBtn.addEventListener('click', async () => {
  if (!S.audioFile) return;
  if (!S.settings.openaiKey) {
    showToast('OpenAI API key required for file upload — add in Settings', 'error');
    openSettings();
    return;
  }
  if (!S.settings.anthropicKey) {
    showToast('Anthropic API key required — add in Settings', 'error');
    openSettings();
    return;
  }

  setProcessing(true, 'Transcribing audio…', 'Using OpenAI Whisper');
  try {
    const transcript = await transcribeWithWhisper(S.audioFile, S.audioFile.name);
    if (!transcript.trim()) throw new Error('Transcription returned empty text');
    setProcessing(false);
    runPipeline(transcript, 'Analyzing with Claude…');
  } catch (err) {
    setProcessing(false);
    showToast(err.message, 'error');
    console.error(err);
  }
});

// Results navigation
dom.backBtn.addEventListener('click', () => {
  dom.resultsScreen.classList.add('hidden');
});

dom.resultTabBtns.forEach(btn => {
  btn.addEventListener('click', () => switchResultTab(btn.dataset.resultTab));
});

dom.copyTranscriptBtn.addEventListener('click', async () => {
  const text = dom.rTranscript.textContent;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Transcript copied', 'success');
  } catch {
    showToast('Copy failed — select text manually', 'error');
  }
});

dom.copyAllBtn.addEventListener('click', async () => {
  const text = buildShareText();
  if (!text) { showToast('Nothing to copy', ''); return; }
  try {
    await navigator.clipboard.writeText(text);
    showToast('All output copied', 'success');
  } catch {
    showToast('Copy failed — use the Share button instead', 'error');
  }
});

dom.shareBtn.addEventListener('click', async () => {
  const text = buildShareText();
  if (navigator.share) {
    try {
      await navigator.share({ title: S.analysis?.title || 'Meeting Notes', text });
    } catch {}
  } else {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard', 'success');
    } catch {
      showToast('Share not supported on this device', '');
    }
  }
});

// History list — tap to re-open results
dom.historyList.addEventListener('click', e => {
  const item = e.target.closest('.history-item');
  if (!item) return;
  const idx = parseInt(item.dataset.index, 10);
  const entry = S.history[idx];
  if (!entry) return;
  S.analysis = entry.analysis;
  showResults(entry.transcript, entry.analysis);
});

// ── Service Worker ─────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ── Init ───────────────────────────────────────
loadSettings();
renderHistory();
renderRecordUI();

// Prompt for API key on first launch
if (!S.settings.anthropicKey) {
  setTimeout(() => openSettings(), 600);
}
