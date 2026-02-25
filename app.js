'use strict';

/* ── Format registry ───────────────────────────── */
const FORMATS = {
  png:  { mime: 'image/png',     ext: 'png',  label: 'PNG',  lossy: false, alpha: true,
          hint: 'Lossless with transparency. Great for graphics and screenshots.' },
  jpeg: { mime: 'image/jpeg',    ext: 'jpg',  label: 'JPEG', lossy: true,  alpha: false,
          hint: 'Lossy compression. Best for photographs. Transparency becomes white.' },
  webp: { mime: 'image/webp',    ext: 'webp', label: 'WebP', lossy: true,  alpha: true,
          hint: 'Modern format with excellent compression and transparency support.' },
  avif: { mime: 'image/avif',    ext: 'avif', label: 'AVIF', lossy: true,  alpha: true,
          hint: 'Next-gen format with superior compression. Requires a modern browser.' },
  bmp:  { mime: 'image/bmp',     ext: 'bmp',  label: 'BMP',  lossy: false, alpha: false,
          hint: 'Uncompressed bitmap. Very large file size, broad legacy compatibility.' },
  svg:  { mime: 'image/svg+xml', ext: 'svg',  label: 'SVG',  lossy: false, alpha: true,
          hint: 'Raster image embedded in an SVG wrapper. Scalable vector container.' },
};

/* ── Helper utilities ──────────────────────────── */
const $ = id => document.getElementById(id);

function fmtBytes(b) {
  if (b < 1024)           return `${b} B`;
  if (b < 1024 * 1024)    return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtExt(file) {
  const byType = (file.type || '').split('/')[1]?.replace('jpeg', 'JPG').toUpperCase();
  const byName = file.name.split('.').pop()?.toUpperCase();
  return byType || byName || '—';
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image.'));
    img.src = src;
  });
}

async function parseSVGDims(file) {
  try {
    const text   = await file.text();
    const doc    = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svg    = doc.documentElement;
    let   w = parseFloat(svg.getAttribute('width'))  || 0;
    let   h = parseFloat(svg.getAttribute('height')) || 0;
    if (!w || !h) {
      const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/);
      w = parseFloat(vb[2]) || 800;
      h = parseFloat(vb[3]) || 600;
    }
    return { w: Math.round(w) || 800, h: Math.round(h) || 600 };
  } catch { return { w: 800, h: 600 }; }
}

/* ── Slider fill sync ──────────────────────────── */
function updateSliderFill(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--fill', `${pct}%`);
}

/* ── Main application class ────────────────────── */
class PhotoConverter {
  constructor() {
    this.file       = null;   // original File object
    this.img        = null;   // HTMLImageElement of original
    this.origW      = 0;
    this.origH      = 0;
    this.format     = 'png';
    this.quality    = 0.92;
    this.locked     = true;   // aspect-ratio lock
    this.outBlob    = null;
    this.outName    = '';

    this._els();
    this._events();
  }

  /* ── Cache DOM refs ──────────────────────────── */
  _els() {
    this.dropZone    = $('dropZone');
    this.fileInput   = $('fileInput');
    this.browseBtn   = $('browseBtn');
    this.ctrlSection = $('controlsSection');
    this.prevSection = $('previewSection');
    this.widthIn     = $('widthInput');
    this.heightIn    = $('heightInput');
    this.lockBtn     = $('lockBtn');
    this.scaleGroup  = $('scaleGroup');
    this.qualRow     = $('qualityRow');
    this.qualSlider  = $('qualitySlider');
    this.qualDisplay = $('qualityDisplay');
    this.convertBtn  = $('convertBtn');
    this.dlBtn       = $('downloadBtn');
    this.origPrev    = $('originalPreview');
    this.convPrev    = $('convertedPreview');
    this.origInfo    = $('originalInfo');
    this.convInfo    = $('convertedInfo');
    this.placeholder = $('convertedPlaceholder');
    this.formatHint  = $('formatHint');
    this.fmtBtns     = document.querySelectorAll('.format-btn');
  }

  /* ── Event wiring ────────────────────────────── */
  _events() {
    /* Drag & drop */
    this.dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });
    this.dropZone.addEventListener('dragleave', () =>
      this.dropZone.classList.remove('drag-over'));
    this.dropZone.addEventListener('drop', e => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f) this._load(f);
    });

    /* Click to browse */
    this.browseBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.fileInput.click();
    });
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', e => {
      if (e.target.files[0]) this._load(e.target.files[0]);
    });

    /* Format selector */
    this.fmtBtns.forEach(btn => btn.addEventListener('click', () => {
      this.fmtBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.format = btn.dataset.format;
      this.qualRow.hidden = !FORMATS[this.format].lossy;
      this.formatHint.textContent = FORMATS[this.format].hint;
      this._clearOut();
    }));

    /* Dimension inputs */
    this.widthIn.addEventListener('input', () => {
      if (this.locked && this.origW) {
        this.heightIn.value = Math.round(+this.widthIn.value * (this.origH / this.origW)) || '';
      }
      this._clearOut();
    });
    this.heightIn.addEventListener('input', () => {
      if (this.locked && this.origH) {
        this.widthIn.value = Math.round(+this.heightIn.value * (this.origW / this.origH)) || '';
      }
      this._clearOut();
    });

    /* Lock toggle */
    this.lockBtn.addEventListener('click', () => {
      this.locked = !this.locked;
      this.lockBtn.classList.toggle('unlocked', !this.locked);
      this.lockBtn.setAttribute('aria-pressed', String(this.locked));
      this.lockBtn.title = this.locked ? 'Aspect ratio locked' : 'Aspect ratio unlocked';
    });

    /* Scale presets */
    this.scaleGroup.querySelectorAll('.scale-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = parseFloat(btn.dataset.scale);
        this.widthIn.value  = Math.round(this.origW * s);
        this.heightIn.value = Math.round(this.origH * s);
        this._clearOut();
      });
    });

    /* Quality slider */
    this.qualSlider.addEventListener('input', () => {
      this.quality = +this.qualSlider.value / 100;
      this.qualDisplay.textContent = this.qualSlider.value;
      updateSliderFill(this.qualSlider);
      this._clearOut();
    });
    updateSliderFill(this.qualSlider);

    /* Convert */
    this.convertBtn.addEventListener('click', () => this._convert());

    /* Download */
    this.dlBtn.addEventListener('click', () => this._download());
  }

  /* ── Load file ───────────────────────────────── */
  async _load(file) {
    if (!file.type.startsWith('image/') &&
        !/\.(svg|bmp|ico|tiff?|avif|webp|png|jpe?g|gif)$/i.test(file.name)) {
      alert('Please select a valid image file.');
      return;
    }

    this.file   = file;
    this.outBlob = null;
    this._setConverting(false);

    try {
      const objURL = URL.createObjectURL(file);
      const img    = await loadImage(objURL);
      this.img     = img;
      this.origW   = img.naturalWidth  || img.width;
      this.origH   = img.naturalHeight || img.height;

      /* SVG might report 0×0 before layout — parse SVG directly */
      if ((!this.origW || !this.origH) &&
          (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name))) {
        const dims = await parseSVGDims(file);
        this.origW = dims.w;
        this.origH = dims.h;
      }

      /* Populate dimension fields */
      this.widthIn.value  = this.origW;
      this.heightIn.value = this.origH;

      /* Show controls & preview section */
      this.ctrlSection.hidden = false;
      this.prevSection.hidden = false;

      /* Drop zone mini mode */
      this.dropZone.classList.add('has-file');
      this.dropZone.querySelector('.drop-zone-text').textContent = `📷  ${file.name}`;

      /* Original preview */
      this.origPrev.src = objURL;
      this._renderMeta(this.origInfo, this.origW, this.origH, file.size, fmtExt(file));

      this._clearOut();

      /* Show hint for default format */
      this.formatHint.textContent = FORMATS[this.format].hint;
      this.qualRow.hidden = !FORMATS[this.format].lossy;

    } catch (err) {
      alert('Failed to load image: ' + err.message);
    }
  }

  /* ── Convert ─────────────────────────────────── */
  async _convert() {
    if (!this.img) return;

    const w = parseInt(this.widthIn.value, 10)  || this.origW;
    const h = parseInt(this.heightIn.value, 10) || this.origH;

    if (w < 1 || h < 1 || w > 16000 || h > 16000) {
      alert('Dimensions must be between 1 and 16 000 pixels.');
      return;
    }

    this._setConverting(true);

    try {
      const blob = await this._render(w, h);
      this.outBlob = blob;

      const base = this.file.name.replace(/\.[^.]+$/, '');
      this.outName = `${base}-converted.${FORMATS[this.format].ext}`;

      /* Show converted preview */
      const url = URL.createObjectURL(blob);
      this.convPrev.src           = url;
      this.convPrev.style.display = 'block';
      this.placeholder.style.display = 'none';
      this.dlBtn.disabled = false;
      this._renderMeta(this.convInfo, w, h, blob.size, FORMATS[this.format].label);

    } catch (err) {
      alert('Conversion failed: ' + err.message +
            '\n\nThis format may not be supported in your browser.');
    } finally {
      this._setConverting(false);
    }
  }

  /* ── Render to Blob ──────────────────────────── */
  async _render(w, h) {
    const cfg = FORMATS[this.format];

    /* SVG output — embed raster as base64 PNG inside SVG */
    if (this.format === 'svg') {
      const canvas = this._makeCanvas(w, h, true);
      const pngB64 = canvas.toDataURL('image/png');
      const svgStr = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<svg xmlns="http://www.w3.org/2000/svg"`,
        `     xmlns:xlink="http://www.w3.org/1999/xlink"`,
        `     width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
        `  <image xlink:href="${pngB64}" x="0" y="0" width="${w}" height="${h}"/>`,
        `</svg>`,
      ].join('\n');
      return new Blob([svgStr], { type: 'image/svg+xml' });
    }

    /* Raster output */
    const canvas = this._makeCanvas(w, h, cfg.alpha);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob
          ? resolve(blob)
          : reject(new Error(`${cfg.label} is not supported in this browser.`)),
        cfg.mime,
        cfg.lossy ? this.quality : undefined
      );
    });
  }

  /* ── Build a canvas with the image drawn ──────── */
  _makeCanvas(w, h, alpha) {
    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha });

    /* White background for non-alpha formats */
    if (!alpha) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.imageSmoothingEnabled  = true;
    ctx.imageSmoothingQuality  = 'high';
    ctx.drawImage(this.img, 0, 0, w, h);
    return canvas;
  }

  /* ── Download ────────────────────────────────── */
  _download() {
    if (!this.outBlob) return;
    const url = URL.createObjectURL(this.outBlob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: this.outName });
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Helpers ─────────────────────────────────── */
  _clearOut() {
    this.outBlob                  = null;
    this.convPrev.style.display   = 'none';
    this.placeholder.style.display = 'flex';
    this.convInfo.innerHTML        = '';
    this.dlBtn.disabled            = true;
  }

  _setConverting(on) {
    this.convertBtn.disabled = on;
    this.convertBtn.innerHTML = on
      ? `<svg class="spinning" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg> Converting…`
      : `<svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg> Convert`;
  }

  _renderMeta(el, w, h, size, fmt) {
    el.innerHTML = `
      <span>${w} &times; ${h}px</span>
      <span>${fmtBytes(size)}</span>
      <span class="tag tag-accent">${fmt}</span>`;
  }
}

/* ── Boot ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => new PhotoConverter());
