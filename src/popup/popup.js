import { MESSAGE_ACTIONS } from '../shared/constants.js';
import { LANGUAGES, getLanguageByCode } from '../shared/languages.js';

// DOM elements
const toggleEnabled = document.getElementById('toggle-enabled');
const toggleLabel = document.getElementById('toggle-label');
const providerName = document.getElementById('provider-name');
const providerModel = document.getElementById('provider-model');
const providerCurrent = document.getElementById('provider-current');
const providerDropdown = document.getElementById('provider-dropdown');
const langCurrent = document.getElementById('lang-current');
const langDropdown = document.getElementById('lang-dropdown');
const langFlag = document.getElementById('lang-flag');
const langName = document.getElementById('lang-name');
const statToday = document.getElementById('stat-today');
const statTotal = document.getElementById('stat-total');
const linkHistory = document.getElementById('link-history');
const linkSettings = document.getElementById('link-settings');

let settings = null;
let providers = [];

/**
 * Send a message to the background service worker.
 */
async function sendMessage(msg) {
  return chrome.runtime.sendMessage(msg);
}

/**
 * Load all data and render the popup.
 */
async function init() {
  try {
    [settings, providers] = await Promise.all([
      sendMessage({ action: MESSAGE_ACTIONS.GET_SETTINGS }),
      sendMessage({ action: MESSAGE_ACTIONS.GET_PROVIDERS }),
    ]);

    const counts = await sendMessage({ action: MESSAGE_ACTIONS.GET_TRANSLATION_COUNT });

    renderToggle();
    renderProvider();
    renderLanguage();
    renderStats(counts);
    buildProviderDropdown();
    buildLanguageDropdown();
    setupEventListeners();
  } catch (err) {
    console.error('Popup init error:', err);
  }
}

function renderToggle() {
  toggleEnabled.checked = settings.enabled;
  toggleLabel.textContent = settings.enabled ? 'ON' : 'OFF';
  toggleLabel.style.color = settings.enabled ? '#00b894' : '#636e72';
}

function renderProvider() {
  const active = providers.find((p) => p.id === settings.activeProviderId) || providers[0];
  if (active) {
    providerName.textContent = active.name;
    providerModel.textContent = active.model;
  } else {
    providerName.textContent = 'No provider';
    providerModel.textContent = 'Click Settings to add one';
  }
}

function renderLanguage() {
  const lang = getLanguageByCode(settings.targetLang);
  if (lang) {
    langFlag.textContent = lang.flag;
    langName.textContent = lang.name;
  } else {
    langFlag.textContent = '🌐';
    langName.textContent = settings.targetLang;
  }
}

function renderStats(counts) {
  statToday.textContent = counts?.today || 0;
  statTotal.textContent = (counts?.total || 0).toLocaleString();
}

function buildProviderDropdown() {
  providerDropdown.innerHTML = '';
  providers.forEach((p) => {
    const option = document.createElement('div');
    option.className = `provider-option${p.id === settings.activeProviderId ? ' active' : ''}`;
    option.innerHTML = `
      <span class="provider-option-dot"></span>
      <span>${p.name}</span>
      <span class="provider-option-model">${p.model}</span>
    `;
    option.addEventListener('click', async () => {
      settings = await sendMessage({
        action: MESSAGE_ACTIONS.UPDATE_SETTINGS,
        settings: { activeProviderId: p.id },
      });
      renderProvider();
      buildProviderDropdown();
      providerDropdown.classList.remove('open');
    });
    providerDropdown.appendChild(option);
  });
}

function buildLanguageDropdown() {
  langDropdown.innerHTML = '';
  LANGUAGES.forEach((lang) => {
    const option = document.createElement('div');
    option.className = `lang-option${lang.code === settings.targetLang ? ' active' : ''}`;
    option.innerHTML = `<span>${lang.flag}</span> <span>${lang.name}</span>`;
    option.addEventListener('click', async () => {
      settings = await sendMessage({
        action: MESSAGE_ACTIONS.UPDATE_SETTINGS,
        settings: { targetLang: lang.code },
      });
      renderLanguage();
      buildLanguageDropdown();
      langDropdown.classList.remove('open');
    });
    langDropdown.appendChild(option);
  });
}

function setupEventListeners() {
  // Toggle
  toggleEnabled.addEventListener('change', async () => {
    settings = await sendMessage({
      action: MESSAGE_ACTIONS.UPDATE_SETTINGS,
      settings: { enabled: toggleEnabled.checked },
    });
    renderToggle();
  });

  // Provider dropdown
  providerCurrent.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.remove('open');
    providerDropdown.classList.toggle('open');
  });

  // Language dropdown
  langCurrent.addEventListener('click', (e) => {
    e.stopPropagation();
    providerDropdown.classList.remove('open');
    langDropdown.classList.toggle('open');
  });

  // Close dropdowns on click outside
  document.addEventListener('click', () => {
    providerDropdown.classList.remove('open');
    langDropdown.classList.remove('open');
  });

  // History link
  linkHistory.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('src/settings/settings.html#history') });
  });

  // Settings link
  linkSettings.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

init();
