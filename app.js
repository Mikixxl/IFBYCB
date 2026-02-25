// app.js — Unit Converter UI logic
// Depends on units.js (CATEGORIES, convert)

// ── Group icons ───────────────────────────────────────────────────────────
const GROUP_ICONS = {
  Mechanics:             '⚙',
  'Rotational Mechanics':'🔄',
  Thermodynamics:        '🌡',
  Energy:                '⚡',
  Fluid:                 '💧',
  Electrical:            '🔌',
  Electromagnetism:      '🧲',
  Photometry:            '💡',
  Radiometry:            '🔭',
  Radiation:             '☢',
  Computing:             '💾',
  Chemistry:             '🧪',
  Materials:             '🔩',
  Nuclear:               '⚛',
  Acoustics:             '🔊',
  Crystallography:       '💎',
};

// ── State ─────────────────────────────────────────────────────────────────
let activeCategoryId = null;

// ── DOM refs ──────────────────────────────────────────────────────────────
const categoryNav    = document.getElementById('category-nav');
const categorySearch = document.getElementById('category-search');
const catTitle       = document.getElementById('cat-title');
const catBase        = document.getElementById('cat-base');
const converterCard  = document.getElementById('converter-card');
const tableSec       = document.getElementById('table-section');
const emptyState     = document.getElementById('empty-state');

const fromValue      = document.getElementById('from-value');
const fromUnit       = document.getElementById('from-unit');
const toValue        = document.getElementById('to-value');
const toUnit         = document.getElementById('to-unit');
const swapBtn        = document.getElementById('swap-btn');
const formulaRow     = document.getElementById('formula-row');
const formulaText    = document.getElementById('formula-text');
const copyBtn        = document.getElementById('copy-btn');
const clearBtn       = document.getElementById('clear-btn');

const tableValueLabel = document.getElementById('table-value-label');
const unitSearch      = document.getElementById('unit-search');
const convTableBody   = document.getElementById('conv-table-body');

// ── Build sidebar nav ─────────────────────────────────────────────────────
function buildNav() {
  // Group categories
  const groups = {};
  for (const cat of CATEGORIES) {
    if (!groups[cat.group]) groups[cat.group] = [];
    groups[cat.group].push(cat);
  }

  categoryNav.innerHTML = '';
  for (const [groupName, cats] of Object.entries(groups)) {
    const label = document.createElement('div');
    label.className = 'nav-group-label';
    label.textContent = groupName;
    categoryNav.appendChild(label);

    for (const cat of cats) {
      const item = document.createElement('div');
      item.className = 'nav-item';
      item.dataset.id = cat.id;
      item.innerHTML = `
        <span class="nav-icon">${GROUP_ICONS[cat.group] || '•'}</span>
        <span>${cat.name}</span>
      `;
      item.addEventListener('click', () => selectCategory(cat.id));
      categoryNav.appendChild(item);
    }
  }
}

// ── Category search filter ────────────────────────────────────────────────
categorySearch.addEventListener('input', () => {
  const q = categorySearch.value.toLowerCase().trim();
  for (const el of categoryNav.querySelectorAll('.nav-item')) {
    const name = el.querySelector('span:last-child').textContent.toLowerCase();
    el.style.display = !q || name.includes(q) ? '' : 'none';
  }
  for (const el of categoryNav.querySelectorAll('.nav-group-label')) {
    // Show group label only if any sibling items are visible
    let sibling = el.nextElementSibling;
    let anyVisible = false;
    while (sibling && !sibling.classList.contains('nav-group-label')) {
      if (sibling.style.display !== 'none') anyVisible = true;
      sibling = sibling.nextElementSibling;
    }
    el.style.display = anyVisible ? '' : 'none';
  }
});

// ── Select a category ─────────────────────────────────────────────────────
function selectCategory(id) {
  activeCategoryId = id;
  const cat = CATEGORIES.find(c => c.id === id);
  if (!cat) return;

  // Sidebar active state
  for (const el of categoryNav.querySelectorAll('.nav-item')) {
    el.classList.toggle('active', el.dataset.id === id);
  }

  // Header
  catTitle.textContent = cat.name;
  catBase.textContent  = cat.affine
    ? `Base: ${cat.base}`
    : `Base unit: ${cat.base}`;

  // Populate unit dropdowns
  populateSelects(cat);

  // Show card & table, hide empty state
  emptyState.classList.add('hidden');
  converterCard.classList.remove('hidden');
  tableSec.classList.remove('hidden');

  // Reset
  fromValue.value = '';
  toValue.value   = '';
  formulaRow.classList.add('hidden');
  unitSearch.value = '';

  // Re-run conversion with current value (or blank)
  runConversion();
  updateTable();
}

// ── Populate from/to selects ──────────────────────────────────────────────
function populateSelects(cat) {
  const makeOptions = (sel, currentVal) => {
    sel.innerHTML = '';
    for (const u of cat.units) {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.label;
      if (u.note) opt.title = u.note;
      sel.appendChild(opt);
    }
    if (currentVal && [...sel.options].some(o => o.value === currentVal)) {
      sel.value = currentVal;
    }
  };

  const prevFrom = fromUnit.value;
  const prevTo   = toUnit.value;
  makeOptions(fromUnit, prevFrom);
  makeOptions(toUnit, prevTo);

  // Default: first vs second unit (avoid same unit)
  if (fromUnit.value === toUnit.value && cat.units.length > 1) {
    toUnit.selectedIndex = 1;
  }
}

// ── Run conversion ────────────────────────────────────────────────────────
function runConversion() {
  const raw = fromValue.value.trim();
  if (raw === '' || isNaN(Number(raw))) {
    toValue.value = '';
    toValue.classList.remove('error');
    formulaRow.classList.add('hidden');
    updateTable();
    return;
  }

  const value = Number(raw);
  const fId   = fromUnit.value;
  const tId   = toUnit.value;

  const { result, note } = convert(activeCategoryId, fId, tId, value);

  if (isNaN(result)) {
    toValue.value = note || 'Incompatible units';
    toValue.classList.add('error');
    formulaRow.classList.add('hidden');
  } else {
    toValue.value = formatResult(result);
    toValue.classList.remove('error');

    // Show formula for affine or commodity units
    const cat = CATEGORIES.find(c => c.id === activeCategoryId);
    if (cat && cat.affine) {
      formulaText.textContent = buildTemperatureFormula(fId, tId, value, result);
      formulaRow.classList.remove('hidden');
    } else if (note) {
      formulaText.textContent = note;
      formulaRow.classList.remove('hidden');
    } else {
      formulaRow.classList.add('hidden');
    }
  }

  updateTable();
}

// ── Format a numeric result ────────────────────────────────────────────────
function formatResult(val) {
  if (!isFinite(val)) return String(val);
  const abs = Math.abs(val);
  if (abs === 0) return '0';

  // Use toPrecision for very large or very small numbers
  if (abs >= 1e15 || (abs < 1e-6 && abs > 0)) {
    return val.toExponential(6).replace(/\.?0+e/, 'e');
  }
  // Up to 10 significant figures, strip trailing zeros
  const s = parseFloat(val.toPrecision(10));
  // Format with locale for readability if large integer-ish
  if (Number.isInteger(s) && abs < 1e12) return s.toLocaleString('en-US');
  return String(s);
}

// ── Temperature formula ───────────────────────────────────────────────────
function buildTemperatureFormula(fromId, toId, input, output) {
  const formulas = {
    'C→F': `(${input} × 9/5) + 32 = ${output}`,
    'F→C': `(${input} − 32) × 5/9 = ${output}`,
    'C→K': `${input} + 273.15 = ${output}`,
    'K→C': `${input} − 273.15 = ${output}`,
    'F→K': `(${input} + 459.67) × 5/9 = ${output}`,
    'K→F': `${input} × 9/5 − 459.67 = ${output}`,
    'C→R': `(${input} + 273.15) × 9/5 = ${output}`,
    'R→C': `${input} × 5/9 − 273.15 = ${output}`,
    'F→R': `${input} + 459.67 = ${output}`,
    'R→F': `${input} − 459.67 = ${output}`,
    'K→R': `${input} × 9/5 = ${output}`,
    'R→K': `${input} × 5/9 = ${output}`,
  };
  return formulas[`${fromId}→${toId}`] || `${input} → ${formatResult(output)}`;
}

// ── Update all-conversions table ──────────────────────────────────────────
function updateTable() {
  const cat   = CATEGORIES.find(c => c.id === activeCategoryId);
  if (!cat) return;

  const raw   = fromValue.value.trim();
  const value = raw !== '' && !isNaN(Number(raw)) ? Number(raw) : null;
  const fId   = fromUnit.value;

  const label = value !== null
    ? `${formatResult(value)} ${fromUnit.options[fromUnit.selectedIndex]?.text || ''}`
    : '—';
  tableValueLabel.textContent = label;

  const q = unitSearch.value.toLowerCase().trim();

  convTableBody.innerHTML = '';
  for (const u of cat.units) {
    if (q && !u.label.toLowerCase().includes(q)) continue;

    const tr = document.createElement('tr');
    if (u.id === fId) tr.classList.add('active-unit');

    let valText = '—';
    let noteText = u.note || '';

    if (value !== null) {
      const { result, note } = convert(activeCategoryId, fId, u.id, value);
      if (!isNaN(result)) {
        valText = formatResult(result);
      } else {
        valText = '—';
        if (note) noteText = note;
      }
    }

    tr.innerHTML = `
      <td>${u.label}</td>
      <td class="val-cell">${valText}${noteText ? `<br><span class="note-cell">${noteText}</span>` : ''}</td>
      <td class="sym-cell">${u.id}</td>
    `;

    // Click on a table row → set it as the "to" unit
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      toUnit.value = u.id;
      runConversion();
    });

    convTableBody.appendChild(tr);
  }
}

// ── Event listeners ───────────────────────────────────────────────────────
fromValue.addEventListener('input',  runConversion);
fromUnit .addEventListener('change', runConversion);
toUnit   .addEventListener('change', runConversion);

swapBtn.addEventListener('click', () => {
  const tmpUnit  = fromUnit.value;
  const tmpValue = toValue.value.replace(/[,\s]/g, '');

  fromUnit.value = toUnit.value;
  toUnit.value   = tmpUnit;

  // Only swap value if current result is a valid number
  if (tmpValue !== '' && !isNaN(Number(tmpValue))) {
    fromValue.value = tmpValue;
  }

  runConversion();
});

copyBtn.addEventListener('click', () => {
  if (!toValue.value || toValue.classList.contains('error')) return;
  navigator.clipboard.writeText(toValue.value).then(() => {
    const orig = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = orig; }, 1500);
  });
});

clearBtn.addEventListener('click', () => {
  fromValue.value = '';
  toValue.value   = '';
  formulaRow.classList.add('hidden');
  updateTable();
});

unitSearch.addEventListener('input', updateTable);

// ── Init ──────────────────────────────────────────────────────────────────
buildNav();
// Auto-select first category
if (CATEGORIES.length > 0) {
  selectCategory(CATEGORIES[0].id);
}
