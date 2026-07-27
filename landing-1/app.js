const state = { steps: [], activeIndex: -1 };
const elements = {
  title: document.querySelector('#storyTitle'),
  intro: document.querySelector('#storyIntro'),
  steps: document.querySelector('#storySteps'),
  media: document.querySelector('#mediaFrame'),
  text: document.querySelector('#activeText'),
  kicker: document.querySelector('#activeKicker'),
  current: document.querySelector('#currentStep'),
  total: document.querySelector('#totalSteps'),
  mediaIndex: document.querySelector('#mediaIndex'),
  traveler: document.querySelector('#traveler')
};

function mediaMarkup(step, basePath) {
  const source = `${basePath}${step.media}`;
  if (step.type === 'video') {
    return `<video src="${source}" autoplay muted loop playsinline aria-label="${step.alt || ''}"></video>`;
  }
  return `<img src="${source}" alt="${step.alt || ''}">`;
}

function showStep(index, config) {
  if (index === state.activeIndex || !state.steps[index]) return;
  state.activeIndex = index;
  const step = state.steps[index];
  const displayIndex = String(index + 1).padStart(2, '0');

  elements.text.textContent = step.text;
  elements.kicker.textContent = step.kicker || '';
  elements.current.textContent = displayIndex;
  elements.mediaIndex.textContent = displayIndex;
  elements.text.classList.remove('is-changing');
  elements.kicker.classList.remove('is-changing');
  void elements.text.offsetWidth;
  elements.text.classList.add('is-changing');
  elements.kicker.classList.add('is-changing');

  elements.media.className = 'story-media';
  elements.media.innerHTML = mediaMarkup(step, config.mediaBasePath || '');
  const mediaElement = elements.media.firstElementChild;
  mediaElement.addEventListener('error', () => {
    elements.media.className = 'story-media is-placeholder';
    elements.media.innerHTML = `<span>Sumá ${step.media} en src/media/landing-1/</span>`;
  }, { once: true });
}

function updateProgress(config) {
  const story = document.querySelector('#story');
  const maxScroll = story.offsetHeight - window.innerHeight;
  const progress = Math.min(1, Math.max(0, -story.getBoundingClientRect().top / maxScroll));
  const index = Math.min(state.steps.length - 1, Math.floor(progress * state.steps.length));
  const travelDistance = document.querySelector('.traveler-track').clientHeight - elements.traveler.offsetHeight;
  elements.traveler.style.transform = `translateY(${progress * travelDistance}px)`;
  showStep(index, config);
}

async function init() {
  try {
    const response = await fetch('./config.json');
    if (!response.ok) throw new Error('No se pudo cargar la configuración');
    const config = await response.json();
    state.steps = config.steps || [];
    elements.title.textContent = config.title;
    elements.intro.textContent = config.intro;
    elements.total.textContent = String(state.steps.length).padStart(2, '0');
    elements.steps.innerHTML = state.steps.map((_, index) => `<div class="story-step" data-index="${index}"></div>`).join('');
    showStep(0, config);
    updateProgress(config);
    window.addEventListener('scroll', () => updateProgress(config), { passive: true });
    window.addEventListener('resize', () => updateProgress(config));
  } catch (error) {
    elements.text.textContent = 'Abrí el proyecto con un servidor local para cargar la historia.';
    console.error(error);
  }
}

init();
