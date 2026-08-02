const state = { config: null, hoverMode: false };
let segments = [];

const els = {
  brandMark: document.querySelector('#brandMark'),
  brandLabel: document.querySelector('#brandLabel'),
  menuToggle: document.querySelector('#menuToggle'),
  menuClose: document.querySelector('#menuClose'),
  menu: document.querySelector('#siteMenu'),
  menuList: document.querySelector('#menuList'),
  coverEyebrow: document.querySelector('#coverEyebrow'),
  coverTitle: document.querySelector('#coverTitle'),
  coverIntro: document.querySelector('#coverIntro'),
  coverCta: document.querySelector('#coverCta'),
  flow: document.querySelector('#storyFlow'),
  current: document.querySelector('#currentStep'),
  total: document.querySelector('#totalSteps'),
  sections: document.querySelector('#placeholders'),
  menuShare: document.querySelector('#menuShare'),
  coverPicture: document.querySelector('#coverPicture'),
};

/* ---------- Menu ---------- */
function renderMenu(site, menu) {
  els.brandMark.textContent = site.brandMark;
  els.brandLabel.textContent = site.brandLabel;
  els.menuList.innerHTML = menu.map((item) => `
    <li>
      <a class="menu-link" href="${item.href || `#${item.id}`}" data-target="${item.id}">
        <span class="menu-number">${item.number || ''}</span>
        <span class="menu-text">
          <span class="menu-label">${item.label}</span>
          ${item.subtitle ? `<span class="menu-subtitle">${item.subtitle}</span>` : ''}
        </span>
      </a>
    </li>`).join('');
  els.menuList.querySelectorAll('.menu-link').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
  if (els.menuShare) {
    els.menuShare.textContent = site.shareLabel || 'Compartir';
  }
}

function openMenu() {
  els.menu.classList.add('is-open');
  els.menu.setAttribute('aria-hidden', 'false');
  els.menuToggle.setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  els.menu.classList.remove('is-open');
  els.menu.setAttribute('aria-hidden', 'true');
  els.menuToggle.setAttribute('aria-expanded', 'false');
}

function setupMenu() {
  els.menuToggle.addEventListener('click', openMenu);
  els.menuClose.addEventListener('click', closeMenu);
  if (els.menuShare) {
    els.menuShare.addEventListener('click', shareSite);
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

async function shareSite() {
  const site = state.config?.site || {};
  const shareData = {
    title: site.title || document.title,
    text: site.shareText || site.title || document.title,
    url: window.location.href
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(shareData.url);
    els.menuShare.textContent = 'Link copiado';
    setTimeout(() => {
      els.menuShare.textContent = site.shareLabel || 'Compartir';
    }, 2000);
  } catch (error) {
    console.error(error);
  }
}

/* ---------- Cover ---------- */
function renderCover(cover) {
  els.coverEyebrow.textContent = cover.eyebrow || '';
  els.coverTitle.innerHTML = (cover.title || '').split('\n').join('<br>');
  els.coverIntro.textContent = cover.intro || '';
  els.coverCta.innerHTML = `${cover.cta || 'Empezar'} <span aria-hidden="true">↓</span>`;
  const imagen = mediaTag(cover, './src/media/scrolly/', cover.picture, 'media-layer media-layer--base');
  els.coverPicture.innerHTML = imagen;
}

/* ---------- Scrollytelling ---------- */
function formatText(text) {
  // [[ ... ]] resalta un fragmento con otra tipografía y espacio propio.
  return (text || '').replace(/\[\[(.+?)\]\]/g, '<span class="active-highlight">$1</span>');
}

function mediaTag(step, basePath, file, className) {
  const source = `${basePath}${file}`;
  const cls = className ? ` class="${className}"` : '';
  if (step.type === 'video') {
    return `<video${cls} src="${source}" autoplay muted loop playsinline aria-label="${step.alt || ''}"></video>`;
  }
  return `<img${cls} src="${source}" alt="${step.alt || ''}">`;
}

function wireFallback(node, file, basePath) {
  if (!node) return;
  node.addEventListener('error', () => {
    const span = document.createElement('span');
    span.className = `${node.className} media-fallback`.trim();
    span.textContent = `Sumá ${file} en ${basePath}`;
    node.replaceWith(span);
  }, { once: true });
}

function createStorySegment(mediaSteps, offset, scrolly) {
  const section = document.createElement('section');
  section.className = 'story';
  section.setAttribute('aria-label', 'Historia');
  section.innerHTML = `
    <div class="story-stage">
      <div class="story-media-wrap">
        <div class="story-media" data-role="media" aria-live="polite"></div>
        <span class="media-index" data-role="mediaIndex">01</span>
      </div>
      <div class="story-copy">
        <p class="eyebrow" data-role="kicker"></p>
        <div class="active-text-group" data-role="text"></div>
      </div>
      <div class="traveler-track" aria-hidden="true">
        <div class="traveler" data-role="traveler">
          <span class="traveler-head"></span>
          <span class="traveler-body"></span>
          <span class="traveler-leg traveler-leg--left"></span>
          <span class="traveler-leg traveler-leg--right"></span>
        </div>
      </div>
    </div>
    <div class="story-steps" data-role="steps"></div>`;

  const seg = {
    el: section,
    steps: mediaSteps,
    offset,
    scrolly,
    stage: section.querySelector('.story-stage'),
    media: section.querySelector('[data-role="media"]'),
    mediaIndex: section.querySelector('[data-role="mediaIndex"]'),
    kicker: section.querySelector('[data-role="kicker"]'),
    text: section.querySelector('[data-role="text"]'),
    traveler: section.querySelector('[data-role="traveler"]'),
    track: section.querySelector('.traveler-track'),
    activeIndex: -1,
    hasOverlay: false
  };
  section.querySelector('[data-role="steps"]').innerHTML = mediaSteps
    .map((_, i) => `<div class="story-step" data-index="${i}"></div>`)
    .join('');
  return seg;
}

function showSegmentStep(seg, localIndex) {
  if (localIndex === seg.activeIndex || !seg.steps[localIndex]) return;
  seg.activeIndex = localIndex;
  const step = seg.steps[localIndex];
  const basePath = seg.scrolly.mediaBasePath || '';
  const displayIndex = String(seg.offset + localIndex + 1).padStart(2, '0');

  const paragraphs = Array.isArray(step.text) ? step.text : [step.text];
  seg.text.innerHTML = paragraphs
    .map((paragraph) => `<p class="active-text">${formatText(paragraph)}</p>`)
    .join('');
  seg.kicker.textContent = step.kicker || '';
  seg.mediaIndex.textContent = displayIndex;
  els.current.textContent = displayIndex;
  seg.text.classList.remove('is-changing');
  seg.kicker.classList.remove('is-changing');
  void seg.text.offsetWidth;
  seg.text.classList.add('is-changing');
  seg.kicker.classList.add('is-changing');

  seg.media.classList.remove('is-hovered');
  const hasMedia = Boolean(step.media);
  seg.hasOverlay = hasMedia && Boolean(step.media_bis);
  seg.stage.classList.toggle('is-textonly', !hasMedia);

  if (!hasMedia) {
    seg.media.className = 'story-media';
    seg.media.innerHTML = '';
  } else if (seg.hasOverlay) {
    seg.media.className = 'story-media has-overlay';
    seg.media.innerHTML =
      mediaTag(step, basePath, step.media, 'media-layer media-layer--base') +
      mediaTag(step, basePath, step.media_bis, 'media-layer media-layer--top');
    wireFallback(seg.media.querySelector('.media-layer--base'), step.media, basePath);
    wireFallback(seg.media.querySelector('.media-layer--top'), step.media_bis, basePath);
  } else {
    seg.media.className = 'story-media';
    seg.media.innerHTML = mediaTag(step, basePath, step.media, '');
    const mediaElement = seg.media.firstElementChild;
    mediaElement.addEventListener('error', () => {
      seg.media.className = 'story-media is-placeholder';
      seg.media.innerHTML = `<span>Sumá ${step.media} en ${basePath}</span>`;
    }, { once: true });
  }
}

/* ---------- Quiz interlude (estilo landing-3) ---------- */
function formatValue(value, unit) {
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value)} ${unit || ''}`.trim();
}

function createQuizInterlude(step) {
  const section = document.createElement('section');
  section.className = 'quiz-interlude';
  if (step.id) section.id = `quiz-${step.id}`;
  section.innerHTML = `
    <div class="quiz-card">
      <p class="eyebrow">${step.kicker || 'Poné a prueba'}</p>
      <h2 class="quiz-question">${step.question || ''}</h2>
      <div class="quiz-ask">
        <div class="number-control">
          <input class="quiz-number" type="number" inputmode="decimal" aria-label="Tu respuesta">
          <span class="answer-unit">${step.unit || ''}</span>
        </div>
        <input class="quiz-range" type="range" aria-label="Ajustar respuesta">
        <div class="range-limits"><span class="quiz-min"></span><span class="quiz-max"></span></div>
        <button class="quiz-reveal" type="button">Ver el dato real</button>
      </div>
      <div class="quiz-result" hidden>
        <div class="comparison" aria-live="polite">
          <div class="comparison-row comparison-row--guess">
            <div class="comparison-label"><span>Tu respuesta</span><strong class="quiz-guess"></strong></div>
            <div class="bar-track"><i class="quiz-guess-bar"></i></div>
          </div>
          <div class="comparison-row comparison-row--actual">
            <div class="comparison-label"><span>Dato real</span><strong class="quiz-actual"></strong></div>
            <div class="bar-track"><i class="quiz-actual-bar"></i></div>
          </div>
          <p class="difference quiz-diff"></p>
          <p class="context quiz-context"></p>
          <p class="impact quiz-impact"></p>
          <div class="result-actions">
            <button class="quiz-share" type="button">Compartir comparación</button>
          </div>
          <p class="share-status quiz-share-status" role="status"></p>
        </div>
      </div>
    </div>`;

  wireQuiz(section, step);
  return section;
}

function wireQuiz(section, step) {
  const number = section.querySelector('.quiz-number');
  const range = section.querySelector('.quiz-range');
  const unit = step.unit || '';
  const min = Number(step.min);
  const max = Number(step.max);
  const stepSize = Number(step.step) || 1;
  const initial = Math.round(((min + max) / 2) / stepSize) * stepSize;
  let answer = initial;

  [number, range].forEach((input) => {
    input.min = String(min);
    input.max = String(max);
    input.step = String(stepSize);
    input.value = String(initial);
  });
  section.querySelector('.quiz-min').textContent = formatValue(min, unit);
  section.querySelector('.quiz-max').textContent = formatValue(max, unit);

  const sync = (source, target) => {
    const value = Math.min(max, Math.max(min, Number(source.value)));
    answer = Number.isFinite(value) ? value : min;
    target.value = String(answer);
  };
  number.addEventListener('input', () => sync(number, range));
  range.addEventListener('input', () => sync(range, number));

  const result = section.querySelector('.quiz-result');
  section.querySelector('.quiz-reveal').addEventListener('click', () => {
    const actual = Number(step.actual);
    const maxValue = Math.max(answer, actual, 1);
    const difference = answer - actual;
    const relation = actual === 0 ? 0 : Math.abs(difference) / actual;
    section.querySelector('.quiz-guess').textContent = formatValue(answer, unit);
    section.querySelector('.quiz-actual').textContent = formatValue(actual, unit);
    section.querySelector('.quiz-context').textContent = step.context || '';
    section.querySelector('.quiz-impact').textContent = step.impact || '';
    section.querySelector('.quiz-diff').textContent = difference === 0
      ? 'LE DISTE JUSTO AL DATO.'
      : `TU ESTIMACIÓN ESTUVO ${Math.round(relation * 100)}% ${difference > 0 ? 'POR ENCIMA' : 'POR DEBAJO'}.`;
    result.hidden = false;
    requestAnimationFrame(() => {
      section.querySelector('.quiz-guess-bar').style.width = `${Math.max(3, (answer / maxValue) * 100)}%`;
      section.querySelector('.quiz-actual-bar').style.width = `${Math.max(3, (actual / maxValue) * 100)}%`;
    });
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  const status = section.querySelector('.quiz-share-status');
  section.querySelector('.quiz-share').addEventListener('click', () => shareResult(step, answer, status));
}

/* ---------- Compartir comparación (imagen para historias / WhatsApp) ---------- */
function drawWrapped(context, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = '';
  words.forEach((word) => {
    const candidate = `${line}${word} `;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line.trim(), x, y);
      line = `${word} `;
      y += lineHeight;
    } else line = candidate;
  });
  context.fillText(line.trim(), x, y);
  return y;
}

async function comparisonBlob(step, answer) {
  try { await document.fonts.load('80px "Malvinas Sans"'); } catch { /* seguimos con la fuente disponible */ }
  const unit = step.unit || '';
  const actual = Number(step.actual);
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');
  context.fillStyle = '#171713';
  context.fillRect(0, 0, 1080, 1350);
  context.fillStyle = '#f1eddf';
  context.font = '32px "Malvinas Sans"';
  context.fillText('LO QUE CREÍA VS. EL DATO', 80, 90);
  context.font = '58px "Malvinas Sans"';
  const labelEnd = drawWrapped(context, String(step.shortLabel || '').toUpperCase(), 80, 165, 920, 60);
  context.fillStyle = '#c9c4b4';
  context.font = '34px "Malvinas Sans"';
  const questionEnd = drawWrapped(context, String(step.question || '').toUpperCase(), 80, labelEnd + 64, 920, 44);

  const maxValue = Math.max(answer, actual, 1);
  const rowsStart = Math.max(430, questionEnd + 90);
  const rows = [
    { label: 'TU RESPUESTA', value: answer, color: '#6c6b64', y: rowsStart },
    { label: 'DATO REAL', value: actual, color: '#e23d28', y: rowsStart + 255 }
  ];
  rows.forEach((row) => {
    context.fillStyle = '#f1eddf';
    context.font = '28px "Malvinas Sans"';
    context.fillText(row.label, 80, row.y);
    context.font = '70px "Malvinas Sans"';
    context.fillText(formatValue(row.value, unit), 80, row.y + 55);
    context.fillStyle = '#34342f';
    context.fillRect(80, row.y + 105, 920, 75);
    context.fillStyle = row.color;
    context.fillRect(80, row.y + 105, Math.max(25, (row.value / maxValue) * 920), 75);
  });
  context.fillStyle = '#f4c542';
  context.font = '38px "Malvinas Sans"';
  drawWrapped(context, step.impact || '', 80, rows[1].y + 290, 920, 48);
  context.fillStyle = '#f1eddf';
  context.font = '24px "Malvinas Sans"';
  context.fillText('DATOS ILUSTRATIVOS · LA TIERRA NO SE VENDE', 80, 1290);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function shareResult(step, answer, status) {
  if (status) status.textContent = '';
  const blob = await comparisonBlob(step, answer);
  if (!blob) return;
  const file = new File([blob], `comparacion-${step.id || 'dato'}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: 'Lo que creía vs. el dato', files: [file] });
      if (status) status.textContent = 'Comparación compartida.';
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  if (status) status.textContent = 'Descargamos la placa para que puedas compartirla.';
}

/* ---------- Flow (segmentos de historia + quizzes) ---------- */
function buildFlow(scrolly) {
  const steps = scrolly.steps || [];
  segments = [];
  els.flow.innerHTML = '';
  let mediaOffset = 0;
  let group = [];

  const flushGroup = () => {
    if (!group.length) return;
    const seg = createStorySegment(group, mediaOffset, scrolly);
    segments.push(seg);
    els.flow.appendChild(seg.el);
    mediaOffset += group.length;
    group = [];
  };

  steps.forEach((step) => {
    if (step.type === 'quiz') {
      flushGroup();
      els.flow.appendChild(createQuizInterlude(step));
    } else {
      group.push(step);
    }
  });
  flushGroup();

  els.total.textContent = String(mediaOffset).padStart(2, '0');
  segments.forEach((seg) => showSegmentStep(seg, 0));
}

function updateProgress() {
  segments.forEach((seg) => {
    const maxScroll = seg.el.offsetHeight - window.innerHeight;
    if (maxScroll <= 0) { showSegmentStep(seg, 0); return; }
    const progress = Math.min(1, Math.max(0, -seg.el.getBoundingClientRect().top / maxScroll));
    const raw = progress * seg.steps.length;
    const localIndex = Math.min(seg.steps.length - 1, Math.floor(raw));
    const travelDistance = seg.track.clientHeight - seg.traveler.offsetHeight;
    seg.traveler.style.transform = `translateY(${progress * travelDistance}px)`;
    showSegmentStep(seg, localIndex);

    // En mobile (sin hover) revelamos la segunda imagen a mitad del paso.
    if (seg.hasOverlay && !state.hoverMode) {
      const overlay = seg.media.querySelector('.media-layer--top');
      if (overlay) {
        const fraction = Math.min(1, Math.max(0, raw - localIndex));
        const reveal = Math.min(1, Math.max(0, (fraction - 0.4) / 0.2));
        overlay.style.opacity = String(reveal);
      }
    }
  });
}

function setupOverlayHover() {
  const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  state.hoverMode = hoverQuery.matches;
  hoverQuery.addEventListener('change', (event) => {
    state.hoverMode = event.matches;
    if (!state.hoverMode) segments.forEach((seg) => seg.media.classList.remove('is-hovered'));
  });
  segments.forEach((seg) => {
    seg.media.addEventListener('mouseenter', () => {
      if (state.hoverMode && seg.hasOverlay) seg.media.classList.add('is-hovered');
    });
    seg.media.addEventListener('mouseleave', () => seg.media.classList.remove('is-hovered'));
  });
}

function setupScrolly(scrolly) {
  buildFlow(scrolly);
  setupOverlayHover();
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
}

/* ---------- Placeholder sections ---------- */
function renderSections(sections) {
  els.sections.innerHTML = (sections || []).map((section) => {
    if (section.type === 'poster') return posterSectionMarkup(section);
    if (Array.isArray(section.steps)) return `<div id="${section.id}" class="quiz-section" data-quiz-steps="${section.id}"></div>`;
    const emojis = section.emojis ? `<p class="section-emojis" aria-hidden="true">${section.emojis}</p>` : '';
    const sources = section.sources ? `<p class="section-sources">Fuentes utilizadas: <a href="${section.sources}">${section.sources}</a></p>` : '';
    const sources_2 = section.sources_2 ? `<p class="section-sources"><a href="${section.sources_2}">${section.sources_2_text}</a></p>` : '';
    const sources_3 = section.sources_3 ? `<p class="section-sources"><a href="${section.sources_3}">${section.sources_3_text}</a></p>` : '';
    const sources_4 = section.sources_4 ? `<p class="section-sources"><a href="${section.sources_4}">${section.sources_4}</a></p>` : '';
    const eyebrow = section.eyebrow ? `<p class="eyebrow">${section.eyebrow}</p>` : '';
    const body = section.body ? `<p class="section-body">${section.body}</p>` : '';
    let cta = '';
    if (section.cta) {
      cta = `<p class="section-cta">${section.cta.text || ''} <a href="${section.cta.href}" target="_blank" rel="noopener">${section.cta.linkLabel || section.cta.href}</a></p>`;
    }
    return `
    <section id="${section.id}" class="placeholder placeholder--${section.accent || 'red'}">
      ${eyebrow}
      <h2>${section.title}</h2>
      ${body}
      ${cta}
      ${emojis}
      ${sources}
      ${sources_2}
      ${sources_3}
      ${sources_4}
      ${emojis}
    </section>`;
  }).join('');

  (sections || []).forEach((section) => {
    if (section.type === 'poster') wirePoster(section);
    if (Array.isArray(section.steps)) {
      const host = document.querySelector(`[data-quiz-steps="${section.id}"]`);
      if (host) section.steps.forEach((step) => host.appendChild(createQuizInterlude(step)));
    }
  });
}

/* ---------- Poster editor (estilo landing-2) ---------- */
const POSTER_SIZE = { width: 1080, height: 1920 };
const POSTER_COLORS = {
  red: { background: '#e23d28', foreground: '#f1eddf' },
  blue: { background: '#2f60d3', foreground: '#f1eddf' },
  green: { background: '#357a53', foreground: '#f1eddf' },
  yellow: { background: '#f4c542', foreground: '#171713' }
};

function posterSectionMarkup(section) {
  const palettes = section.palettes || [];
  const first = palettes[0]?.value || 'red';
  const swatches = palettes.map((palette, index) => `
        <label><input type="radio" name="palette-${section.id}" value="${palette.value}"${index === 0 ? ' checked' : ''}><span class="swatch swatch--${palette.value}">${palette.label || ''}</span></label>`).join('');
  return `
    <section id="${section.id}" class="poster-section poster-section--${section.accent || 'blue'}">
      <div class="poster-editor">
        <p class="eyebrow">${section.eyebrow || ''}</p>
        <h2 class="poster-title">${section.title || ''}</h2>
        <label for="posterInput-${section.id}">${section.label || ''}</label>
        <textarea id="posterInput-${section.id}" class="poster-input" maxlength="${section.maxLength || 180}" rows="4" placeholder="${section.placeholder || ''}" data-role="input">${section.defaultMessage || ''}</textarea>
        <div class="editor-meta"><span data-role="charCount"></span><span>${section.hint || ''}</span></div>
        <fieldset class="palette-picker">
          <legend>${section.paletteLegend || ''}</legend>${swatches}
        </fieldset>
        <div class="actions">
          <button type="button" class="primary-action" data-role="share">${section.shareLabel || 'Compartir'}</button>
          <button type="button" class="secondary-action" data-role="download">${section.downloadLabel || 'Descargar'}</button>
        </div>
        <p class="status" data-role="status" role="status" aria-live="polite"></p>
      </div>
      <div class="preview-panel">
        <div class="poster-preview poster-preview--${first}" data-role="preview">
          <p data-role="previewMessage"></p>
          <div class="top-poster-signature"><span>${section.topSignature || ''}</span></div>
          <div class="poster-signature"><span>${section.signature || ''}</span></div>
        </div>
      </div>
      <canvas class="poster-canvas" width="${POSTER_SIZE.width}" height="${POSTER_SIZE.height}" hidden data-role="canvas"></canvas>
    </section>`;
}

function posterWrapText(context, text, maxWidth) {
  const lines = [];
  text.trim().split(/\n+/).forEach((paragraph) => {
    let line = '';
    paragraph.trim().split(/\s+/).forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth || !line) line = candidate;
      else { lines.push(line); line = word; }
    });
    if (line) lines.push(line);
  });
  return lines;
}

function posterFittedText(context, text, maxWidth, maxHeight) {
  let low = 40;
  let high = 360;
  let result = { size: low, lines: [text], lineHeight: low * 0.86 };
  while (low <= high) {
    const size = Math.floor((low + high) / 2);
    context.font = `${size}px "Malvinas Sans"`;
    const lines = posterWrapText(context, text, maxWidth);
    const lineHeight = size * 0.86;
    const widest = Math.max(...lines.map((line) => context.measureText(line).width), 0);
    if (lines.length * lineHeight <= maxHeight && widest <= maxWidth) {
      result = { size, lines, lineHeight };
      low = size + 1;
    } else high = size - 1;
  }
  return result;
}

async function renderPosterCanvas(refs, section) {
  const canvas = refs.canvas;
  const context = canvas.getContext('2d');
  await document.fonts.load('100px "Malvinas Sans"');
  const palette = POSTER_COLORS[refs.currentPalette()] || POSTER_COLORS.red;
  const text = refs.input.value.trim() || refs.fallback;
  const { width: WIDTH, height: HEIGHT } = POSTER_SIZE;

  context.fillStyle = palette.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.strokeStyle = `${palette.foreground}20`;
  context.lineWidth = 2;
  for (let x = -HEIGHT; x < WIDTH; x += 46) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + HEIGHT, HEIGHT);
    context.stroke();
  }

  const fitted = posterFittedText(context, text.toUpperCase(), 880, 1160);
  context.font = `${fitted.size}px "Malvinas Sans"`;
  context.fillStyle = palette.foreground;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  const blockHeight = fitted.lines.length * fitted.lineHeight;
  let y = (HEIGHT - 200 - blockHeight) / 2 - 20;
  fitted.lines.forEach((line) => {
    context.fillText(line, 100, y);
    y += fitted.lineHeight;
  });

  context.strokeStyle = palette.foreground;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(100, 1690);
  context.lineTo(980, 1690);
  context.stroke();

  context.font = '30px "Malvinas Sans"';
  context.textBaseline = 'top';
  let sy = 1720;
  posterWrapText(context, section.signature || '', 880).forEach((line) => {
    context.fillText(line, 100, sy);
    sy += 38;
  });
  return canvas;
}

function updatePoster(refs, section) {
  const value = refs.input.value;
  const text = value || refs.fallback;
  refs.previewMessage.textContent = text;
  refs.charCount.textContent = `${value.length} / ${section.maxLength || 180}`;
  refs.preview.className = `poster-preview poster-preview--${refs.currentPalette()}`;
  const length = Math.max(text.length, 1);
  refs.previewMessage.style.fontSize = `${Math.max(1.25, Math.min(3.8, 11 / Math.sqrt(length / 5)))}rem`;
}

async function posterBlob(refs, section) {
  await renderPosterCanvas(refs, section);
  return new Promise((resolve) => refs.canvas.toBlob(resolve, 'image/png'));
}

function downloadPosterBlob(blob, fileName) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function wirePoster(section) {
  const root = document.querySelector(`#${section.id}`);
  if (!root) return;
  const refs = {
    input: root.querySelector('[data-role="input"]'),
    preview: root.querySelector('[data-role="preview"]'),
    previewMessage: root.querySelector('[data-role="previewMessage"]'),
    charCount: root.querySelector('[data-role="charCount"]'),
    canvas: root.querySelector('[data-role="canvas"]'),
    status: root.querySelector('[data-role="status"]'),
    fallback: section.placeholder || section.defaultMessage || '',
    currentPalette: () => root.querySelector(`input[name="palette-${section.id}"]:checked`).value
  };
  const fileName = section.fileName || 'afiche.png';

  refs.input.addEventListener('input', () => updatePoster(refs, section));
  root.querySelectorAll(`input[name="palette-${section.id}"]`).forEach((input) => {
    input.addEventListener('change', () => updatePoster(refs, section));
  });

  root.querySelector('[data-role="share"]').addEventListener('click', async () => {
    const blob = await posterBlob(refs, section);
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: section.site || document.title, text: refs.input.value, files: [file] });
        refs.status.textContent = 'Afiche compartido.';
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    downloadPosterBlob(blob, fileName);
    refs.status.textContent = 'Tu navegador no permite compartir archivos: descargamos el PNG.';
  });

  root.querySelector('[data-role="download"]').addEventListener('click', async () => {
    downloadPosterBlob(await posterBlob(refs, section), fileName);
  });

  updatePoster(refs, section);
}


/* ---------- Active menu highlight ---------- */
function setupScrollSpy(menu) {
  const links = new Map();
  els.menuList.querySelectorAll('.menu-link').forEach((link) => {
    links.set(link.dataset.target, link);
  });
  const targets = menu
    .map((item) => document.querySelector(`#${item.id}`))
    .filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => link.classList.remove('is-active'));
      const active = links.get(entry.target.id);
      if (active) active.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  targets.forEach((target) => observer.observe(target));
}

/* ---------- Uppercase all display text ---------- */
// La tipografía no renderiza bien las minúsculas: pasamos a mayúsculas todos
// los textos de la config, salvo las claves técnicas (ids, rutas, links, etc.).
const RAW_KEYS = new Set(['id', 'accent', 'type', 'href', 'media', 'media_bis', 'mediaBasePath', 'value', 'fileName', 'subtitle']);

function uppercaseConfig(value, key) {
  if (typeof value === 'string') {
    return RAW_KEYS.has(key) ? value : value.toUpperCase();
  }
  if (Array.isArray(value)) {
    return value.map((item) => uppercaseConfig(item, key));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, uppercaseConfig(v, k)])
    );
  }
  return value;
}

/* ---------- Idle scroll hint toast ---------- */
function setupIdleToast() {
  const toast = document.querySelector('#idleToast');
  if (!toast) return;
  const IDLE_MS = 10000;
  const VISIBLE_MS = 3500;
  let idleTimer = null;
  let hideTimer = null;

  const hide = () => {
    toast.classList.remove('is-visible');
    toast.setAttribute('aria-hidden', 'true');
  };
  const show = () => {
    toast.classList.add('is-visible');
    toast.setAttribute('aria-hidden', 'false');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, VISIBLE_MS);
  };
  const reset = () => {
    hide();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(show, IDLE_MS);
  };

  ['scroll', 'pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart']
    .forEach((evt) => window.addEventListener(evt, reset, { passive: true }));
  reset();
}

/* ---------- Deep link al abrir con #hash ---------- */
function scrollToInitialHash() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  // El contenido se renderiza recién ahora, así que reaplicamos el salto
  // una vez que el layout quedó listo.
  requestAnimationFrame(() => {
    target.scrollIntoView({ block: 'start' });
  });
}

/* ---------- Init ---------- */
async function init() {
  try {
    const response = await fetch('./config.json');
    if (!response.ok) throw new Error('No se pudo cargar la configuración');
    const config = uppercaseConfig(await response.json());
    state.config = config;

    document.title = config.site.title;
    renderMenu(config.site, config.menu);
    renderCover(config.scrolly.cover);
    renderSections(config.sections);

    setupMenu();
    setupScrolly(config.scrolly);
    setupScrollSpy(config.menu);
    setupIdleToast();
    scrollToInitialHash();
  } catch (error) {
    els.flow.innerHTML = '<p class="flow-error">Abrí el proyecto con un servidor local para cargar la historia.</p>';
    console.error(error);
  }
}

init();
