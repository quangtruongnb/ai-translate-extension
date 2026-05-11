import { MESSAGE_ACTIONS, DEFAULT_SYSTEM_PROMPT } from '../shared/constants.js';
import { LANGUAGES } from '../shared/languages.js';
import { formatTimestamp } from '../shared/utils.js';

let settings = null;
let providers = [];
let templates = [];
let history = [];

let editingProviderId = null;
let editingTemplateId = null;

// --- Initialization ---

async function init() {
  await loadData();
  
  setupTabs();
  setupProviderForm();
  setupTemplateForm();
  setupGeneralSettings();
  setupHistory();
  
  // Handle URL hash for deep linking to tabs
  const hash = window.location.hash.slice(1) || 'providers';
  document.querySelector(`[data-tab="${hash}"]`)?.click();
}

async function loadData() {
  [settings, providers, templates, history] = await Promise.all([
    sendMessage({ action: MESSAGE_ACTIONS.GET_SETTINGS }),
    sendMessage({ action: MESSAGE_ACTIONS.GET_PROVIDERS }),
    sendMessage({ action: MESSAGE_ACTIONS.GET_PROMPT_TEMPLATES }),
    sendMessage({ action: MESSAGE_ACTIONS.GET_HISTORY }),
  ]);
  
  renderProviderList();
  renderTemplateList();
  renderHistoryList();
  populateGeneralSettings();
}

function sendMessage(msg) {
  return chrome.runtime.sendMessage(msg);
}

// --- Tabs ---

function setupTabs() {
  const tabs = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.tab-panel');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active state
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      document.getElementById(targetId).classList.add('active');
      
      // Update URL hash without scrolling
      history.replaceState(null, null, `#${tab.dataset.tab}`);
    });
  });
}

// --- Providers ---

function renderProviderList() {
  const list = document.getElementById('provider-list');
  list.innerHTML = '';
  
  if (providers.length === 0) {
    list.innerHTML = '<div class="info-box">No providers configured. Add one below.</div>';
    document.getElementById('provider-form').style.display = 'block';
    return;
  }
  
  providers.forEach(p => {
    const isActive = p.id === settings.activeProviderId;
    const card = document.createElement('div');
    card.className = `card ${isActive ? 'active' : ''}`;
    
    card.innerHTML = `
      <div class="card-info">
        <div class="card-title">
          ${p.name}
          ${isActive ? '<span class="badge active">Active</span>' : ''}
          <span class="badge">${p.type}</span>
        </div>
        <div class="card-subtitle">${p.model} • ${p.baseUrl}</div>
      </div>
      <div class="card-actions">
        ${!isActive ? `<button class="btn btn-sm btn-activate" data-id="${p.id}">Set Active</button>` : ''}
        <button class="btn btn-sm btn-edit" data-id="${p.id}">Edit</button>
        <button class="btn btn-sm btn-danger btn-delete" data-id="${p.id}">Delete</button>
      </div>
    `;
    
    list.appendChild(card);
  });
  
  // Attach event listeners to buttons
  list.querySelectorAll('.btn-activate').forEach(btn => {
    btn.addEventListener('click', async () => {
      settings = await sendMessage({ 
        action: MESSAGE_ACTIONS.UPDATE_SETTINGS, 
        settings: { activeProviderId: btn.dataset.id } 
      });
      renderProviderList();
    });
  });
  
  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = providers.find(prov => prov.id === btn.dataset.id);
      if (p) openProviderForm(p);
    });
  });
  
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Delete this provider?')) {
        await sendMessage({ action: MESSAGE_ACTIONS.DELETE_PROVIDER, id: btn.dataset.id });
        await loadData();
      }
    });
  });
}

function setupProviderForm() {
  const form = document.getElementById('provider-form');
  const btnAdd = document.getElementById('btn-add-provider');
  const btnCancel = document.getElementById('btn-cancel');
  const btnSave = document.getElementById('btn-save');
  const btnTest = document.getElementById('btn-test');
  const btnShowKey = document.getElementById('btn-show-key');
  
  const fType = document.getElementById('f-type');
  const fBaseurl = document.getElementById('f-baseurl');
  
  // Auto-fill base URL when changing type if empty or default
  fType.addEventListener('change', () => {
    const val = fBaseurl.value;
    if (!val || val === 'https://api.openai.com/v1' || val === 'https://api.anthropic.com') {
      if (fType.value === 'openai-compatible') fBaseurl.value = 'https://api.openai.com/v1';
      else if (fType.value === 'anthropic') fBaseurl.value = 'https://api.anthropic.com';
    }
  });
  
  // Update temperature value display
  const fTemp = document.getElementById('f-temp');
  const tempVal = document.getElementById('temp-val');
  fTemp.addEventListener('input', () => { tempVal.textContent = fTemp.value; });
  
  // Show/hide API key
  btnShowKey.addEventListener('click', () => {
    const input = document.getElementById('f-apikey');
    if (input.type === 'password') {
      input.type = 'text';
      btnShowKey.textContent = 'Hide';
    } else {
      input.type = 'password';
      btnShowKey.textContent = 'Show';
    }
  });
  
  btnAdd.addEventListener('click', () => openProviderForm());
  
  btnCancel.addEventListener('click', () => {
    form.style.display = 'none';
    editingProviderId = null;
    document.getElementById('test-result').style.display = 'none';
  });
  
  btnSave.addEventListener('click', async () => {
    const provider = {
      id: editingProviderId, // null for new
      name: document.getElementById('f-name').value.trim() || 'Unnamed Provider',
      type: document.getElementById('f-type').value,
      baseUrl: document.getElementById('f-baseurl').value.trim(),
      model: document.getElementById('f-model').value.trim(),
      apiKey: document.getElementById('f-apikey').value.trim(),
      temperature: parseFloat(document.getElementById('f-temp').value),
    };
    
    if (!provider.baseUrl || !provider.model) {
      alert('Base URL and Model are required.');
      return;
    }
    
    await sendMessage({ action: MESSAGE_ACTIONS.SAVE_PROVIDER, provider });
    
    // Auto-activate if it's the first provider
    if (providers.length === 0) {
      const allProv = await sendMessage({ action: MESSAGE_ACTIONS.GET_PROVIDERS });
      if (allProv.length > 0) {
        await sendMessage({ 
          action: MESSAGE_ACTIONS.UPDATE_SETTINGS, 
          settings: { activeProviderId: allProv[0].id } 
        });
      }
    }
    
    form.style.display = 'none';
    editingProviderId = null;
    await loadData();
  });
  
  btnTest.addEventListener('click', async () => {
    const provider = {
      type: document.getElementById('f-type').value,
      baseUrl: document.getElementById('f-baseurl').value.trim(),
      model: document.getElementById('f-model').value.trim(),
      apiKey: document.getElementById('f-apikey').value.trim(),
    };
    
    if (!provider.baseUrl || !provider.model) {
      alert('Base URL and Model are required to test.');
      return;
    }
    
    const resultDiv = document.getElementById('test-result');
    resultDiv.style.display = 'block';
    resultDiv.className = 'test-result';
    resultDiv.textContent = 'Testing connection...';
    
    try {
      const res = await sendMessage({ action: MESSAGE_ACTIONS.TEST_CONNECTION, provider });
      if (res.success) {
        resultDiv.className = 'test-result success';
        resultDiv.textContent = res.message;
      } else {
        resultDiv.className = 'test-result error';
        resultDiv.textContent = res.message;
      }
    } catch (err) {
      resultDiv.className = 'test-result error';
      resultDiv.textContent = err.message;
    }
  });
}

function openProviderForm(provider = null) {
  const form = document.getElementById('provider-form');
  const title = document.getElementById('form-title');
  document.getElementById('test-result').style.display = 'none';
  
  if (provider) {
    editingProviderId = provider.id;
    title.textContent = 'Edit Provider';
    document.getElementById('f-name').value = provider.name;
    document.getElementById('f-type').value = provider.type;
    document.getElementById('f-baseurl').value = provider.baseUrl;
    document.getElementById('f-model').value = provider.model;
    document.getElementById('f-apikey').value = provider.apiKey || '';
    document.getElementById('f-temp').value = provider.temperature ?? 0.3;
    document.getElementById('temp-val').textContent = provider.temperature ?? 0.3;
  } else {
    editingProviderId = null;
    title.textContent = 'Add Provider';
    document.getElementById('f-name').value = '';
    document.getElementById('f-type').value = 'openai-compatible';
    document.getElementById('f-baseurl').value = 'https://api.openai.com/v1';
    document.getElementById('f-model').value = '';
    document.getElementById('f-apikey').value = '';
    document.getElementById('f-temp').value = 0.3;
    document.getElementById('temp-val').textContent = 0.3;
  }
  
  form.style.display = 'block';
  form.scrollIntoView({ behavior: 'smooth' });
}

// --- Prompts ---

function renderTemplateList() {
  const list = document.getElementById('template-list');
  list.innerHTML = '';
  
  if (templates.length === 0) {
    list.innerHTML = '<div class="info-box">No custom templates. Using default system prompt.</div>';
    return;
  }
  
  templates.forEach(t => {
    const card = document.createElement('div');
    card.className = 'card';
    
    const sourceDisplay = t.sourceLang === '*' ? 'Any' : t.sourceLang;
    
    card.innerHTML = `
      <div class="card-info">
        <div class="card-title">${t.name}</div>
        <div class="card-subtitle">${sourceDisplay} → ${t.targetLang}</div>
      </div>
      <div class="card-actions">
        <button class="btn btn-sm btn-edit-tpl" data-id="${t.id}">Edit</button>
        <button class="btn btn-sm btn-danger btn-delete-tpl" data-id="${t.id}">Delete</button>
      </div>
    `;
    
    list.appendChild(card);
  });
  
  // Attach events
  list.querySelectorAll('.btn-edit-tpl').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = templates.find(tpl => tpl.id === btn.dataset.id);
      if (t) openTemplateForm(t);
    });
  });
  
  list.querySelectorAll('.btn-delete-tpl').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Delete this template?')) {
        await sendMessage({ action: MESSAGE_ACTIONS.DELETE_PROMPT_TEMPLATE, id: btn.dataset.id });
        await loadData();
      }
    });
  });
}

function setupTemplateForm() {
  const form = document.getElementById('template-form');
  const btnAdd = document.getElementById('btn-add-template');
  const btnCancel = document.getElementById('btn-cancel-template');
  const btnSave = document.getElementById('btn-save-template');
  const defaultPrompt = document.getElementById('default-prompt');
  const btnResetPrompt = document.getElementById('btn-reset-prompt');
  
  // Default prompt setup
  defaultPrompt.value = DEFAULT_SYSTEM_PROMPT; // Readonly or sync with setting if configurable globally
  defaultPrompt.readOnly = true; 
  btnResetPrompt.style.display = 'none'; // Since it's fixed in this design, or implement global custom prompt
  
  btnAdd.addEventListener('click', () => openTemplateForm());
  
  btnCancel.addEventListener('click', () => {
    form.style.display = 'none';
    editingTemplateId = null;
  });
  
  btnSave.addEventListener('click', async () => {
    const template = {
      id: editingTemplateId,
      name: document.getElementById('t-name').value.trim() || 'Custom Template',
      sourceLang: document.getElementById('t-source').value.trim() || '*',
      targetLang: document.getElementById('t-target').value.trim(),
      systemPrompt: document.getElementById('t-prompt').value.trim(),
    };
    
    if (!template.targetLang || !template.systemPrompt) {
      alert('Target Language and System Prompt are required.');
      return;
    }
    
    await sendMessage({ action: MESSAGE_ACTIONS.SAVE_PROMPT_TEMPLATE, template });
    form.style.display = 'none';
    editingTemplateId = null;
    await loadData();
  });
}

function openTemplateForm(template = null) {
  const form = document.getElementById('template-form');
  
  if (template) {
    editingTemplateId = template.id;
    document.getElementById('t-name').value = template.name;
    document.getElementById('t-source').value = template.sourceLang;
    document.getElementById('t-target').value = template.targetLang;
    document.getElementById('t-prompt').value = template.systemPrompt;
  } else {
    editingTemplateId = null;
    document.getElementById('t-name').value = '';
    document.getElementById('t-source').value = '*';
    document.getElementById('t-target').value = '';
    document.getElementById('t-prompt').value = DEFAULT_SYSTEM_PROMPT;
  }
  
  form.style.display = 'block';
  form.scrollIntoView({ behavior: 'smooth' });
}

// --- History ---

function renderHistoryList() {
  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  
  list.innerHTML = '';
  
  if (history.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  
  list.style.display = 'flex';
  empty.style.display = 'none';
  
  // Search filter
  const searchTerm = document.getElementById('history-search').value.toLowerCase();
  
  const filtered = history.filter(h => {
    if (!searchTerm) return true;
    return (h.sourceText?.toLowerCase().includes(searchTerm) || 
            h.translatedText?.toLowerCase().includes(searchTerm) ||
            h.pageTitle?.toLowerCase().includes(searchTerm));
  });
  
  filtered.forEach(h => {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    // Domain from URL
    let domain = 'Unknown site';
    try {
      if (h.pageUrl) domain = new URL(h.pageUrl).hostname;
    } catch {}
    
    item.innerHTML = `
      <div class="history-header">
        <div class="history-meta">
          <span>${formatTimestamp(h.timestamp)}</span>
          <span class="badge">${h.sourceLang} → ${h.targetLang}</span>
          <span>${domain}</span>
        </div>
        <div class="history-meta">
          <span>${h.model}</span>
        </div>
      </div>
      <div class="history-content">
        <div class="history-text history-source">${escapeHtml(h.sourceText)}</div>
        <div class="history-text history-translation">${escapeHtml(h.translatedText)}</div>
      </div>
    `;
    
    list.appendChild(item);
  });
}

function setupHistory() {
  const searchInput = document.getElementById('history-search');
  const btnClear = document.getElementById('btn-clear-history');
  
  searchInput.addEventListener('input', () => renderHistoryList());
  
  btnClear.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all translation history? This cannot be undone.')) {
      await sendMessage({ action: MESSAGE_ACTIONS.CLEAR_HISTORY });
      await loadData();
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- General Settings ---

function populateGeneralSettings() {
  const selTargetLang = document.getElementById('g-target-lang');
  const inDelay = document.getElementById('g-delay');
  const delayVal = document.getElementById('delay-val');
  const selTheme = document.getElementById('g-theme');
  const inMaxHistory = document.getElementById('g-max-history');
  const txtDisabledSites = document.getElementById('g-disabled-sites');
  
  // Populate language dropdown
  selTargetLang.innerHTML = '';
  LANGUAGES.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = `${lang.flag} ${lang.name}`;
    if (lang.code === settings.targetLang) option.selected = true;
    selTargetLang.appendChild(option);
  });
  
  // Populate other fields
  inDelay.value = settings.selectionDelay || 300;
  delayVal.textContent = `${inDelay.value}ms`;
  selTheme.value = settings.tooltipTheme || 'dark';
  inMaxHistory.value = settings.maxHistorySize || 500;
  txtDisabledSites.value = (settings.disabledSites || []).join('\n');
}

function setupGeneralSettings() {
  const selTargetLang = document.getElementById('g-target-lang');
  const inDelay = document.getElementById('g-delay');
  const delayVal = document.getElementById('delay-val');
  const selTheme = document.getElementById('g-theme');
  const inMaxHistory = document.getElementById('g-max-history');
  const txtDisabledSites = document.getElementById('g-disabled-sites');
  
  const updateSettings = async () => {
    const disabledSites = txtDisabledSites.value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
      
    settings = await sendMessage({
      action: MESSAGE_ACTIONS.UPDATE_SETTINGS,
      settings: {
        targetLang: selTargetLang.value,
        selectionDelay: parseInt(inDelay.value, 10),
        tooltipTheme: selTheme.value,
        maxHistorySize: parseInt(inMaxHistory.value, 10),
        disabledSites,
      }
    });
  };
  
  selTargetLang.addEventListener('change', updateSettings);
  selTheme.addEventListener('change', updateSettings);
  inMaxHistory.addEventListener('change', updateSettings);
  txtDisabledSites.addEventListener('change', updateSettings);
  
  inDelay.addEventListener('input', () => {
    delayVal.textContent = `${inDelay.value}ms`;
  });
  inDelay.addEventListener('change', updateSettings);
  
  // Export / Import
  document.getElementById('btn-export').addEventListener('click', () => {
    const data = {
      version: 1,
      settings,
      providers,
      templates,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-translate-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  
  const btnImport = document.getElementById('btn-import');
  const fileImport = document.getElementById('import-file');
  
  btnImport.addEventListener('click', () => fileImport.click());
  
  fileImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.settings) {
          await sendMessage({ action: MESSAGE_ACTIONS.UPDATE_SETTINGS, settings: data.settings });
        }
        if (data.providers && Array.isArray(data.providers)) {
          for (const p of data.providers) {
            await sendMessage({ action: MESSAGE_ACTIONS.SAVE_PROVIDER, provider: p });
          }
        }
        if (data.templates && Array.isArray(data.templates)) {
          for (const t of data.templates) {
            await sendMessage({ action: MESSAGE_ACTIONS.SAVE_PROMPT_TEMPLATE, template: t });
          }
        }
        alert('Settings imported successfully!');
        window.location.reload();
      } catch (err) {
        alert('Invalid settings file: ' + err.message);
      }
    };
    reader.readAsText(file);
    fileImport.value = ''; // Reset
  });
}

// Start
init();
