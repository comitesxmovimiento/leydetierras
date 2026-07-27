const state = { config: null, index: 0, answer: 0 };
const screens = {
  intro: document.querySelector('#quizIntro'),
  question: document.querySelector('#questionScreen'),
  result: document.querySelector('#resultScreen'),
  end: document.querySelector('#quizEnd')
};
const numberInput = document.querySelector('#answerNumber');
const rangeInput = document.querySelector('#answerRange');

function showScreen(name) {
  Object.entries(screens).forEach(([key, element]) => { element.hidden = key !== name; });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatValue(value, question) {
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value)} ${question.unit}`;
}

function updateProgress() {
  const total = state.config.questions.length;
  document.querySelector('#progressLabel').textContent = `${String(state.index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  document.querySelector('#progressFill').style.width = `${((state.index + 1) / total) * 100}%`;
}

function renderQuestion() {
  const question = state.config.questions[state.index];
  const initial = Math.round(((question.min + question.max) / 2) / question.step) * question.step;
  state.answer = initial;
  document.querySelector('#questionNumber').textContent = `Pregunta ${String(state.index + 1).padStart(2, '0')}`;
  document.querySelector('#questionText').textContent = question.question;
  document.querySelector('#answerUnit').textContent = question.unit;
  [numberInput, rangeInput].forEach((input) => {
    input.min = question.min;
    input.max = question.max;
    input.step = question.step;
    input.value = initial;
  });
  document.querySelector('#minLabel').textContent = formatValue(question.min, question);
  document.querySelector('#maxLabel').textContent = formatValue(question.max, question);
  updateProgress();
  showScreen('question');
}

function syncAnswer(source, target) {
  const question = state.config.questions[state.index];
  const value = Math.min(question.max, Math.max(question.min, Number(source.value)));
  state.answer = Number.isFinite(value) ? value : question.min;
  target.value = state.answer;
}

function renderResult() {
  const question = state.config.questions[state.index];
  const maxValue = Math.max(state.answer, question.actual, 1);
  const difference = state.answer - question.actual;
  const relation = question.actual === 0 ? 0 : Math.abs(difference) / question.actual;
  document.querySelector('#resultKicker').textContent = question.shortLabel;
  document.querySelector('#guessValue').textContent = formatValue(state.answer, question);
  document.querySelector('#actualValue').textContent = formatValue(question.actual, question);
  document.querySelector('#contextText').textContent = question.context;
  document.querySelector('#impactText').textContent = question.impact;
  document.querySelector('#differenceText').textContent = difference === 0
    ? 'Le diste justo al dato.'
    : `Tu estimación estuvo ${Math.round(relation * 100)}% ${difference > 0 ? 'por encima' : 'por debajo'}.`;
  document.querySelector('#nextQuestion').innerHTML = state.index === state.config.questions.length - 1
    ? 'Ver cierre <span aria-hidden="true">→</span>'
    : 'Siguiente <span aria-hidden="true">→</span>';
  showScreen('result');
  requestAnimationFrame(() => {
    document.querySelector('#guessBar').style.width = `${Math.max(3, (state.answer / maxValue) * 100)}%`;
    document.querySelector('#actualBar').style.width = `${Math.max(3, (question.actual / maxValue) * 100)}%`;
  });
}

function drawWrapped(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/);
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

async function comparisonBlob() {
  await document.fonts.load('80px "Malvinas Sans"');
  const question = state.config.questions[state.index];
  const canvas = document.querySelector('#shareCanvas');
  const context = canvas.getContext('2d');
  context.fillStyle = '#171713';
  context.fillRect(0, 0, 1080, 1350);
  context.fillStyle = '#f1eddf';
  context.font = '32px "Malvinas Sans"';
  context.fillText('LO QUE CREÍA VS. EL DATO', 80, 90);
  context.font = '64px "Malvinas Sans"';
  drawWrapped(context, question.shortLabel.toUpperCase(), 80, 170, 900, 65);

  const maxValue = Math.max(state.answer, question.actual, 1);
  const rows = [
    { label: 'TU RESPUESTA', value: state.answer, color: '#6c6b64', y: 440 },
    { label: 'DATO REAL', value: question.actual, color: '#e23d28', y: 700 }
  ];
  rows.forEach((row) => {
    context.fillStyle = '#f1eddf';
    context.font = '28px "Malvinas Sans"';
    context.fillText(row.label, 80, row.y);
    context.font = '70px "Malvinas Sans"';
    context.fillText(formatValue(row.value, question), 80, row.y + 55);
    context.fillStyle = '#34342f';
    context.fillRect(80, row.y + 105, 920, 75);
    context.fillStyle = row.color;
    context.fillRect(80, row.y + 105, Math.max(25, (row.value / maxValue) * 920), 75);
  });
  context.fillStyle = '#f4c542';
  context.font = '38px "Malvinas Sans"';
  drawWrapped(context, question.impact, 80, 1010, 900, 48);
  context.fillStyle = '#f1eddf';
  context.font = '24px "Malvinas Sans"';
  context.fillText('DATOS ILUSTRATIVOS · LA TIERRA NO SE VENDE', 80, 1270);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function shareResult() {
  const blob = await comparisonBlob();
  const file = new File([blob], `comparacion-${state.index + 1}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: 'Lo que creía vs. el dato', files: [file] });
      document.querySelector('#shareStatus').textContent = 'Comparación compartida.';
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
  document.querySelector('#shareStatus').textContent = 'Descargamos la placa para que puedas compartirla.';
}

async function init() {
  try {
    const response = await fetch('./config.json');
    if (!response.ok) throw new Error('No se pudo cargar la configuración');
    state.config = await response.json();
    document.querySelector('#quizTitle').textContent = state.config.title;
    document.querySelector('#disclaimer').textContent = state.config.disclaimer;
    updateProgress();
  } catch (error) {
    document.querySelector('#quizTitle').textContent = 'No pudimos cargar las preguntas';
    document.querySelector('#disclaimer').textContent = 'Abrí el proyecto desde un servidor local.';
    document.querySelector('#startButton').disabled = true;
    console.error(error);
  }
}

document.querySelector('#startButton').addEventListener('click', renderQuestion);
numberInput.addEventListener('input', () => syncAnswer(numberInput, rangeInput));
rangeInput.addEventListener('input', () => syncAnswer(rangeInput, numberInput));
document.querySelector('#revealButton').addEventListener('click', renderResult);
document.querySelector('#shareResult').addEventListener('click', shareResult);
document.querySelector('#nextQuestion').addEventListener('click', () => {
  if (state.index >= state.config.questions.length - 1) showScreen('end');
  else { state.index += 1; renderQuestion(); }
});
document.querySelector('#restartButton').addEventListener('click', () => { state.index = 0; renderQuestion(); });
init();
