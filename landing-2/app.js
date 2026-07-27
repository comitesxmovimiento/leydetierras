const WIDTH = 1080;
const HEIGHT = 1920;
const palettes = {
  red: { background: '#e23d28', foreground: '#f1eddf' },
  blue: { background: '#2f60d3', foreground: '#f1eddf' },
  green: { background: '#357a53', foreground: '#f1eddf' },
  yellow: { background: '#f4c542', foreground: '#171713' }
};

const messageInput = document.querySelector('#message');
const preview = document.querySelector('#posterPreview');
const previewMessage = document.querySelector('#previewMessage');
const charCount = document.querySelector('#charCount');
const canvas = document.querySelector('#posterCanvas');
const status = document.querySelector('#status');

function currentPalette() {
  return document.querySelector('input[name="palette"]:checked').value;
}

function wrapText(context, text, maxWidth) {
  const paragraphs = text.trim().split(/\n+/);
  const lines = [];
  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/);
    let line = '';
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth || !line) line = candidate;
      else { lines.push(line); line = word; }
    });
    if (line) lines.push(line);
  });
  return lines;
}

function fittedText(context, text, maxWidth, maxHeight) {
  let low = 40;
  let high = 360;
  let result = { size: low, lines: [text] };
  while (low <= high) {
    const size = Math.floor((low + high) / 2);
    context.font = `${size}px "Malvinas Sans"`;
    const lines = wrapText(context, text, maxWidth);
    const lineHeight = size * 0.86;
    const widest = Math.max(...lines.map((line) => context.measureText(line).width), 0);
    if (lines.length * lineHeight <= maxHeight && widest <= maxWidth) {
      result = { size, lines, lineHeight };
      low = size + 1;
    } else high = size - 1;
  }
  return result;
}

async function renderPoster() {
  await document.fonts.load('100px "Malvinas Sans"');
  const context = canvas.getContext('2d');
  const palette = palettes[currentPalette()];
  const text = messageInput.value.trim() || 'La tierra no se vende';
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

  const fitted = fittedText(context, text.toUpperCase(), 880, 1320);
  context.font = `${fitted.size}px "Malvinas Sans"`;
  context.fillStyle = palette.foreground;
  context.textBaseline = 'top';
  const blockHeight = fitted.lines.length * fitted.lineHeight;
  let y = (HEIGHT - blockHeight) / 2 - 40;
  fitted.lines.forEach((line) => {
    context.fillText(line, 100, y);
    y += fitted.lineHeight;
  });

  context.strokeStyle = palette.foreground;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(100, 1740);
  context.lineTo(980, 1740);
  context.stroke();
  context.font = '28px "Malvinas Sans"';
  context.fillText('LA TIERRA NO SE VENDE', 100, 1772);
  context.textAlign = 'right';
  context.fillText('ARGENTINA 2026', 980, 1772);
  context.textAlign = 'left';
  return canvas;
}

function updatePreview() {
  const text = messageInput.value || 'La tierra no se vende';
  previewMessage.textContent = text;
  charCount.textContent = `${messageInput.value.length} / 180`;
  preview.className = `poster-preview poster-preview--${currentPalette()}`;
  const length = Math.max(text.length, 1);
  previewMessage.style.fontSize = `${Math.max(1.25, Math.min(3.8, 11 / Math.sqrt(length / 5)))}rem`;
}

async function posterBlob() {
  await renderPoster();
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function sharePoster() {
  const blob = await posterBlob();
  const file = new File([blob], 'la-tierra-no-se-vende.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: 'La tierra no se vende', text: messageInput.value, files: [file] });
      status.textContent = 'Afiche compartido.';
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  downloadBlob(blob);
  status.textContent = 'Tu navegador no permite compartir archivos: descargamos el PNG.';
}

function downloadBlob(blob) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'la-tierra-no-se-vende.png';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

messageInput.addEventListener('input', updatePreview);
document.querySelectorAll('input[name="palette"]').forEach((input) => input.addEventListener('change', updatePreview));
document.querySelector('#shareButton').addEventListener('click', sharePoster);
document.querySelector('#downloadButton').addEventListener('click', async () => downloadBlob(await posterBlob()));
updatePreview();
