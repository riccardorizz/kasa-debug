/**
 * Tapo Smart Bulb Controller - Progressive Web App
 * Full native-feel mobile interface with real-time controls, settings suite,
 * custom color presets, Matter integration, and FastAPI backend sync.
 */

(() => {
  'use strict';

  // ==========================================================================
  // App State & Persistent Preferences
  // ==========================================================================
  const DEFAULT_PRESETS = [
    { name: 'Preset 1', type: 'white', temp: 2700, brightness: 100 },
    { name: 'Preset 2', type: 'white', temp: 3000, brightness: 100 },
    { name: 'Preset 3', type: 'white', temp: 3300, brightness: 100 },
    { name: 'Preset 4', type: 'white', temp: 3600, brightness: 100 },
    { name: 'Preset 5', type: 'color', hue: 280, saturation: 100, brightness: 100 },
    { name: 'Preset 6', type: 'color', hue: 55, saturation: 100, brightness: 100 },
    { name: 'Preset 7', type: 'color', hue: 300, saturation: 100, brightness: 100 }
  ];

  const state = {
    // Hardware State from /api/state
    is_on: true,
    brightness: 100,
    color_temp: 3000,
    hsv: { hue: 180, saturation: 100, value: 100 },
    activeTab: 'white', // 'white' | 'color'
    isUserInteracting: false,
    interactionTimeout: null,
    isOffline: false,
    language: (typeof window.getLanguage === 'function' ? window.getLanguage() : (localStorage.getItem('tapo_language') || 'it')),
    pendingLanguage: null,
    pendingLocation: null,

    // Local Persistent Settings (Customizations)
    deviceName: localStorage.getItem('tapo_device_name') || '',
    deviceLocation: localStorage.getItem('tapo_device_location') || 'Camera da letto',
    deviceIcon: localStorage.getItem('tapo_device_icon') || 'bulb',
    defaultOnState: localStorage.getItem('tapo_default_on') || 'last-on',
    defaultRecovery: localStorage.getItem('tapo_default_recovery') || 'turn-on',
    fadeOn: localStorage.getItem('tapo_fade_on') === 'true',
    fadeOff: localStorage.getItem('tapo_fade_off') === 'true',

    // Presets (7 presets matching reference images)
    presets: (() => {
      try {
        const saved = localStorage.getItem('tapo_presets');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
      return JSON.parse(JSON.stringify(DEFAULT_PRESETS));
    })(),

    // Legacy custom presets (for modal)
    customPresets: JSON.parse(localStorage.getItem('tapo_custom_presets') || '[]'),

    // Modal Builder Temporary State
    modalPresetType: 'color',
    modalHue: 180,
    modalTemp: 3200,
    modalEditingIndex: null,

    // Edit Preset View State (full-page, images 2 & 3)
    editingPresetIndex: null,
    editPresetType: 'color',       // 'color' | 'white'
    editPresetHue: 300,
    editPresetSaturation: 100,
    editPresetTemp: 2700,
    editPresetBrightness: 100,
    isReordering: false
  };

  // Navigation History Stack for Subviews
  const navStack = ['view-main'];

  // ==========================================================================
  // DOM Elements
  // ==========================================================================
  const el = {
    // Views
    views: document.querySelectorAll('.app-view'),
    viewMain: document.getElementById('view-main'),
    viewSettings: document.getElementById('view-settings'),
    btnSettings: document.getElementById('btn-settings'),

    // Hero Section
    ambientGlow: document.getElementById('ambient-glow'),
    heroBulbContainer: document.getElementById('hero-bulb-container'),
    heroDeviceName: document.getElementById('hero-device-name'),
    heroDeviceLocation: document.getElementById('hero-device-location'),
    heroBulbSvg: document.getElementById('hero-bulb-svg'),
    bulbGlass: document.getElementById('bulb-glass'),
    bulbFilament: document.getElementById('bulb-filament'),

    // Controls
    controllableArea: document.getElementById('controllable-area'),
    powerBtn: document.getElementById('power-toggle-btn'),

    // Brightness
    brightnessLabel: document.getElementById('brightness-label'),
    brightnessFill: document.getElementById('brightness-fill'),
    brightnessInput: document.getElementById('brightness-input'),
    brightnessTrack: document.getElementById('brightness-track'),

    // Tabs
    tabBtnWhite: document.getElementById('tab-btn-white'),
    tabBtnColor: document.getElementById('tab-btn-color'),
    tabIndicator: document.getElementById('tab-indicator'),
    whiteTempIndicator: document.getElementById('white-temp-indicator'),
    panelWhite: document.getElementById('panel-white'),
    panelColor: document.getElementById('panel-color'),

    // Temp Slider
    tempInput: document.getElementById('temp-input'),
    tempThumb: document.getElementById('temp-thumb'),
    tempTrack: document.getElementById('temp-track'),

    // Color Slider
    colorInput: document.getElementById('color-input'),
    colorThumb: document.getElementById('color-thumb'),
    colorTrack: document.getElementById('color-track'),

    // Presets
    presetList: document.getElementById('preset-list'),
    customPresetsContainer: document.getElementById('custom-presets-container'),
    btnManagePresets: document.getElementById('btn-manage-presets'),

    // Energy (removed from main view, refs kept null-safe)
    segBtns: document.querySelectorAll('.seg-btn'),

    // Settings Rows
    settingRowIcon: document.getElementById('setting-row-icon'),
    settingIconThumb: document.getElementById('setting-icon-thumb'),
    settingRowName: document.getElementById('setting-row-name'),
    settingValueName: document.getElementById('setting-value-name'),
    settingRowLocation: document.getElementById('setting-row-location'),
    settingRowLanguage: document.getElementById('setting-row-language'),
    settingValueLanguage: document.getElementById('setting-value-language'),
    btnSaveLanguage: document.getElementById('btn-save-language'),
    languageRows: document.querySelectorAll('.language-row'),
    settingValueLocation: document.getElementById('setting-value-location'),
    settingRowDefaultState: null,
    settingValueDefaultState: null,
    settingRowFade: null,
    settingValueFade: null,
    settingRowSmartActions: null,
    settingRowInfo: document.getElementById('setting-row-info'),
    settingRowMatter: null,
    settingRowFirmware: null,
    rowShareDevice: null,

    // Subview: Icon Picker
    iconPickerGrid: document.getElementById('icon-picker-grid'),
    btnSaveIcon: document.getElementById('btn-save-icon'),

    // Subview: Device Name
    inputDeviceName: document.getElementById('input-device-name'),
    btnClearName: document.getElementById('btn-clear-name'),
    btnSaveName: document.getElementById('btn-save-name'),

    // Subview: Location
    locationOptionsGroup: document.getElementById('location-options-group'),
    rowCustomLocation: document.getElementById('row-custom-location'),
    customLocationBox: document.getElementById('custom-location-box'),
    inputCustomLocation: document.getElementById('input-custom-location'),
    btnSaveLocation: document.getElementById('btn-save-location'),

    // Subview: Default State
    viewDefaultState: document.getElementById('view-default-state'),

    // Subview: Fade
    toggleFadeOn: document.getElementById('toggle-fade-on'),
    toggleFadeOff: document.getElementById('toggle-fade-off'),

    // Subview: Groups
    btnAddGroup: document.getElementById('btn-add-group'),

    // Subview: Smart Actions
    tabSmartRec: document.getElementById('tab-smart-rec'),
    tabSmartActive: document.getElementById('tab-smart-active'),
    btnAddSmartAction: document.getElementById('btn-add-smart-action'),
    btnShortcutMenu: document.getElementById('btn-shortcut-menu'),

    // Subview: Matter
    matterDeviceAlias: document.getElementById('matter-device-alias'),
    btnCopyMatterCode: document.getElementById('btn-copy-matter-code'),
    btnSaveMatterQr: document.getElementById('btn-save-matter-qr'),

    // View: Gestisci Preset (new full-page, image 1)
    viewManagePresets: document.getElementById('view-manage-presets'),
    presetManageListCard: document.getElementById('preset-manage-list-card'),
    btnPresetRiordina: document.getElementById('btn-preset-riordina'),

    // View: Edita Preset (new full-page, images 2 & 3)
    viewEditPreset: document.getElementById('view-edit-preset'),
    editPresetColorLabel: document.getElementById('edit-preset-color-label'),
    editPresetSwatch: document.getElementById('edit-preset-swatch'),
    editPresetHash: document.getElementById('edit-preset-hash'),
    editPresetHexInput: document.getElementById('edit-preset-hex-input'),
    editPresetTempWrap: document.getElementById('edit-preset-temp-wrap'),
    editPresetTempInput: document.getElementById('edit-preset-temp-input'),
    epTabWhite: document.getElementById('ep-tab-white'),
    epTabColor: document.getElementById('ep-tab-color'),
    epColorWheelWrap: document.getElementById('ep-color-wheel-wrap'),
    epColorWheel: document.getElementById('ep-color-wheel'),
    epWheelThumb: document.getElementById('ep-wheel-thumb'),
    epTempWheelWrap: document.getElementById('ep-temp-wheel-wrap'),
    epTempWheel: document.getElementById('ep-temp-wheel'),
    epTempThumb: document.getElementById('ep-temp-thumb'),
    btnEditPresetDone: document.getElementById('btn-edit-preset-done'),
    btnDeletePreset: document.getElementById('btn-delete-preset'),
    btnAddPreset: document.getElementById('btn-add-preset'),
    epBrightnessLabel: document.getElementById('ep-brightness-label'),
    epBrightnessFill: document.getElementById('ep-brightness-fill'),
    epBrightnessThumb: document.getElementById('ep-brightness-thumb'),
    epBrightnessInput: document.getElementById('ep-brightness-input'),
    epBrightnessWrapper: document.getElementById('ep-brightness-wrapper'),

    // Modal: Preset Creator / Manager
    modalCustomPreset: document.getElementById('modal-custom-preset'),
    btnClosePresetModal: document.getElementById('btn-close-preset-modal'),
    modalSwatchPreview: document.getElementById('modal-swatch-preview'),
    modalPresetTag: document.getElementById('modal-preset-tag'),
    modalPresetValText: document.getElementById('modal-preset-val-text'),
    btnPresetUseCurrent: document.getElementById('btn-preset-use-current'),
    modalTabColor: document.getElementById('modal-tab-color'),
    modalTabWhite: document.getElementById('modal-tab-white'),
    modalBoxColor: document.getElementById('modal-box-color'),
    modalBoxWhite: document.getElementById('modal-box-white'),
    modalColorSlider: document.getElementById('modal-color-slider'),
    modalWhiteSlider: document.getElementById('modal-white-slider'),
    modalPresetName: document.getElementById('modal-preset-name'),
    btnSaveCustomPreset: document.getElementById('btn-save-custom-preset'),
    btnClearAllPresets: document.getElementById('btn-clear-all-presets'),
    modalCustomPresetsList: document.getElementById('modal-custom-presets-list'),
    modalNoPresetsHint: document.getElementById('modal-no-presets-hint'),
    modalListView: document.getElementById('modal-presets-list-view'),
    modalEditorView: document.getElementById('modal-preset-editor-view'),
    modalPresetTitle: document.getElementById('modal-preset-title'),
    modalEditorLabel: document.getElementById('modal-editor-label'),
    btnNewPreset: document.getElementById('btn-new-preset'),
    btnBackPresetList: document.getElementById('btn-back-preset-list'),

    // Notifications
    appToast: document.getElementById('app-toast'),
    connectionToast: document.getElementById('connection-toast')
  };

  // (Energy data removed - card was removed from main view)

  // ==========================================================================
  // Toast Notification Helper
  // ==========================================================================
  let toastTimer = null;
  function showToast(message, duration = 2400) {
    if (!el.appToast) return;
    el.appToast.textContent = message;
    el.appToast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.appToast.classList.add('hidden');
    }, duration);
  }

  // ==========================================================================
  // Navigation / View Router
  // ==========================================================================
  function showView(viewId, addToHistory = true) {
    const target = document.getElementById(viewId);
    if (!target) return;

    el.views.forEach(v => v.classList.remove('active'));
    target.classList.add('active');
    window.scrollTo(0, 0);

    if (addToHistory && navStack[navStack.length - 1] !== viewId) {
      navStack.push(viewId);
    }

    if (viewId === 'view-main') {
      const activeBtn = state.activeTab === 'white' ? el.tabBtnWhite : el.tabBtnColor;
      updateTabIndicator(activeBtn);
    }
  }

  function goBack() {
    if (navStack.length > 1) {
      navStack.pop();
      const prev = navStack[navStack.length - 1];
      showView(prev, false);
    } else {
      showView('view-main', false);
    }
  }

  // ==========================================================================
  // Color Conversion Helpers
  // ==========================================================================
  function kelvinToRgb(kelvin) {
    let temp = kelvin / 100;
    let r, g, b;

    if (temp <= 66) {
      r = 255;
    } else {
      r = temp - 60;
      r = 329.698727446 * Math.pow(r, -0.1332047592);
      r = Math.max(0, Math.min(255, r));
    }

    if (temp <= 66) {
      g = temp;
      g = 99.4708025861 * Math.log(g) - 161.1195681661;
      g = Math.max(0, Math.min(255, g));
    } else {
      g = temp - 60;
      g = 288.1221695283 * Math.pow(g, -0.0755148492);
      g = Math.max(0, Math.min(255, g));
    }

    if (temp >= 66) {
      b = 255;
    } else if (temp <= 19) {
      b = 0;
    } else {
      b = temp - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
      b = Math.max(0, Math.min(255, b));
    }

    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }

  function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4))
    };
  }

  // ==========================================================================
  // API Calls & 200ms Debounce
  // ==========================================================================
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  async function fetchApi(path, options = {}) {
    try {
      const res = await fetch(path, options);
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const errorKey = { bulb_unreachable: 'errors.bulbUnreachable', bulb_communication_error: 'errors.communication', bulb_state_read_error: 'errors.stateRead' }[payload?.code] || 'errors.generic';
        if (typeof window.t === 'function') showToast(t(errorKey));
        throw new Error(payload?.code || `HTTP ${res.status}`);
      }
      setOfflineState(false);
      return payload;
    } catch (err) {
      setOfflineState(true);
      return null;
    }
  }

  function setOfflineState(offline) {
    if (state.isOffline === offline) return;
    state.isOffline = offline;
    if (offline) {
      el.connectionToast.classList.remove('hidden');
    } else {
      el.connectionToast.classList.add('hidden');
    }
  }

  const debouncedSetBrightness = debounce(async (val) => {
    await fetchApi(`/api/brightness/${val}`, { method: 'POST' });
  }, 200);

  const debouncedSetTemp = debounce(async (kelvin) => {
    await fetchApi(`/api/temp/${kelvin}`, { method: 'POST' });
  }, 200);

  const debouncedSetColor = debounce(async (hue) => {
    await fetchApi('/api/color', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hue: Number(hue),
        saturation: 100,
        value: 100
      })
    });
  }, 200);

  async function apiSetPower(on) {
    const data = await fetchApi(`/api/power/${on}`, { method: 'POST' });
    if (data && typeof data.is_on === 'boolean') {
      state.is_on = data.is_on;
    }
    updateUI();
  }

  // ==========================================================================
  // Polling State (Every 3 seconds)
  // ==========================================================================
  async function pollState() {
    if (state.isUserInteracting) return;

    // Periodically sync presets from server across devices if not currently reordering or editing
    if (!state.isReordering && state.editingPresetIndex === null) {
      fetchPresetsFromServer();
    }

    const data = await fetchApi('/api/state');
    if (data) {
      state.is_on = Boolean(data.is_on);
      if (typeof data.brightness === 'number') state.brightness = data.brightness;
      if (typeof data.color_temp === 'number') state.color_temp = data.color_temp;
      if (data.hsv) state.hsv = data.hsv;

      if (state.color_temp > 0 && state.activeTab !== 'white') {
        setActiveTab('white', false);
      } else if (state.color_temp === 0 && state.activeTab !== 'color') {
        setActiveTab('color', false);
      }

      updateUI();
    }
  }

  async function fetchDeviceInfo() {
    const data = await fetchApi('/api/info');
    if (!data) return;
    const setText = (id, value) => {
      const node = document.getElementById(id);
      if (node) node.textContent = (value === null || value === undefined || value === '') ? '—' : value;
    };
    state.matterCode = data.matter_code || '';
    setText('info-device-model', data.model);
    setText('info-device-ip', data.host);
    setText('info-device-mac', data.mac);
    setText('matter-device-mac', data.mac);
    setText('info-device-hw', data.hw_version);
    setText('matter-code-number', state.matterCode || t('matter.notConfigured'));
    setText('info-device-rssi', typeof data.rssi === 'number'
      ? `${data.rssi} dBm (${data.rssi > -60 ? t('info.rssiExcellent') : t('info.rssiGood')})`
      : t('info.unavailable'));
  }

  function startUserInteraction() {
    state.isUserInteracting = true;
    clearTimeout(state.interactionTimeout);
  }

  function stopUserInteraction() {
    clearTimeout(state.interactionTimeout);
    state.interactionTimeout = setTimeout(() => {
      state.isUserInteracting = false;
    }, 1500);
  }

  // ==========================================================================
  // Visual Rendering & Bulb Art
  // ==========================================================================
  function updateUI() {
    // 1. Power State & Dimming
    if (state.is_on) {
      el.controllableArea.classList.remove('is-powered-off');
      el.powerBtn.classList.remove('power-off');
      el.powerBtn.classList.add('power-on');
    } else {
      el.controllableArea.classList.add('is-powered-off');
      el.powerBtn.classList.remove('power-on');
      el.powerBtn.classList.add('power-off');
    }

    // 2. Brightness Slider
    el.brightnessLabel.textContent = `${state.brightness}%`;
    el.brightnessFill.style.width = `${state.brightness}%`;
    if (!state.isUserInteracting) {
      el.brightnessInput.value = state.brightness;
    }

    // 3. Tab Sliders
    if (state.activeTab === 'white') {
      const temp = state.color_temp || 3000;
      el.whiteTempIndicator.textContent = `${temp}K`;
      el.whiteTempIndicator.style.opacity = '1';
      const pct = Math.max(0, Math.min(100, ((temp - 2500) / (6500 - 2500)) * 100));
      el.tempThumb.style.left = `${pct}%`;
      if (!state.isUserInteracting) el.tempInput.value = temp;
    } else {
      const hue = (state.hsv && typeof state.hsv.hue === 'number') ? state.hsv.hue : 180;
      const pct = Math.max(0, Math.min(100, (hue / 360) * 100));
      el.colorThumb.style.left = `${pct}%`;
      if (!state.isUserInteracting) el.colorInput.value = hue;
    }

    // 4. Hero Visual Color & Glow
    updateBulbVisual();
  }

  function updateBulbVisual() {
    if (!state.is_on) {
      document.documentElement.style.setProperty('--bulb-glow-color', 'transparent');
      document.documentElement.style.setProperty('--bulb-main-color', '#2c2c34');
      document.documentElement.style.setProperty('--bulb-inner-light', '#3f3f4a');
      document.documentElement.style.setProperty('--bulb-dark-color', '#202026');
      el.ambientGlow.style.opacity = '0';
      if (el.bulbFilament) {
        el.bulbFilament.querySelectorAll('line').forEach(line => line.setAttribute('stroke', '#484854'));
      }
      return;
    }

    let rgb, mainColor, innerColor, darkColor;

    if (state.activeTab === 'white') {
      const kelvin = state.color_temp || 3000;
      rgb = kelvinToRgb(kelvin);
      mainColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      innerColor = `rgb(${Math.min(255, rgb.r + 30)}, ${Math.min(255, rgb.g + 30)}, ${Math.min(255, rgb.b + 30)})`;
      darkColor = `rgb(${Math.max(0, rgb.r - 35)}, ${Math.max(0, rgb.g - 35)}, ${Math.max(0, rgb.b - 35)})`;
    } else {
      const hue = (state.hsv && typeof state.hsv.hue === 'number') ? state.hsv.hue : 180;
      rgb = hslToRgb(hue, 100, 52);
      mainColor = `hsl(${hue}, 92%, 52%)`;
      innerColor = `hsl(${hue}, 95%, 68%)`;
      darkColor = `hsl(${hue}, 88%, 40%)`;
    }

    const glowAlpha = Math.max(0.12, (state.brightness / 100) * 0.45);
    const glowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowAlpha})`;

    document.documentElement.style.setProperty('--bulb-glow-color', glowColor);
    document.documentElement.style.setProperty('--bulb-main-color', mainColor);
    document.documentElement.style.setProperty('--bulb-inner-light', innerColor);
    document.documentElement.style.setProperty('--bulb-dark-color', darkColor);

    el.ambientGlow.style.opacity = (state.brightness / 100).toString();
    el.ambientGlow.style.background = `radial-gradient(circle, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08) 50%, transparent 75%)`;

    if (el.bulbFilament) {
      el.bulbFilament.querySelectorAll('line').forEach(line => line.setAttribute('stroke', '#ffffff'));
    }
  }

  // ==========================================================================
  // Tab Switching
  // ==========================================================================
  function setActiveTab(tab, triggerApi = true) {
    if (state.activeTab === tab && document.querySelector(`.tab-btn.active[data-tab="${tab}"]`)) return;

    state.activeTab = tab;

    if (tab === 'white') {
      el.tabBtnWhite.classList.add('active');
      el.tabBtnColor.classList.remove('active');
      el.panelWhite.classList.add('active');
      el.panelColor.classList.remove('active');
      updateTabIndicator(el.tabBtnWhite);
      if (triggerApi && state.color_temp) debouncedSetTemp(state.color_temp);
    } else {
      el.tabBtnColor.classList.add('active');
      el.tabBtnWhite.classList.remove('active');
      el.panelColor.classList.add('active');
      el.panelWhite.classList.remove('active');
      updateTabIndicator(el.tabBtnColor);
      if (triggerApi && state.hsv) debouncedSetColor(state.hsv.hue);
    }
    updateUI();
  }

  function updateTabIndicator(activeBtn) {
    if (!activeBtn || !el.tabIndicator) return;
    const parent = el.tabBtnWhite.parentElement;
    if (!parent) return;
    const parentLeft = parent.getBoundingClientRect().left;
    const rect = activeBtn.getBoundingClientRect();
    el.tabIndicator.style.left = `${rect.left - parentLeft}px`;
    el.tabIndicator.style.width = `${rect.width}px`;
  }

  // ==========================================================================
  // Track Pointer Interaction Helper
  // ==========================================================================
  function attachTrackPointer(wrapper, input, onInput, onChange) {
    let isDragging = false;

    function updateFromPointer(clientX) {
      const rect = wrapper.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const min = Number(input.min);
      const max = Number(input.max);
      const val = Math.round(min + ratio * (max - min));
      input.value = val;
      onInput(val);
    }

    wrapper.addEventListener('pointerdown', (e) => {
      isDragging = true;
      startUserInteraction();
      try { wrapper.setPointerCapture(e.pointerId); } catch (_) {}
      updateFromPointer(e.clientX);
    });

    wrapper.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      updateFromPointer(e.clientX);
    });

    wrapper.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      updateFromPointer(e.clientX);
      const val = Number(input.value);
      if (onChange) onChange(val);
      try { wrapper.releasePointerCapture(e.pointerId); } catch (_) {}
      stopUserInteraction();
    });

    wrapper.addEventListener('pointercancel', () => {
      isDragging = false;
      stopUserInteraction();
    });
  }

  // ==========================================================================
  // Presets Management (Views: Gestisci Preset & Edita Preset)
  // ==========================================================================

  /**
   * Persist presets to localStorage (for fast offline startup)
   * and save to FastAPI backend (/api/presets) so all devices share presets.
   */
  async function savePresets(presets) {
    try {
      localStorage.setItem('tapo_presets', JSON.stringify(presets));
    } catch (_) {}

    try {
      await fetchApi('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presets })
      });
    } catch (err) {
      console.warn('Failed to sync presets with server:', err);
    }
  }

  /**
   * Fetch current presets from server and update local UI if changed.
   */
  async function fetchPresetsFromServer() {
    try {
      const data = await fetchApi('/api/presets');
      if (data && Array.isArray(data.presets) && data.presets.length > 0) {
        const serverJson = JSON.stringify(data.presets);
        const currentJson = JSON.stringify(state.presets);
        if (serverJson !== currentJson) {
          state.presets = data.presets;
          try {
            localStorage.setItem('tapo_presets', serverJson);
          } catch (_) {}
          renderMainPresets();
          renderManagePresetsList();
        }
      }
    } catch (err) {
      console.warn('Could not fetch presets from server:', err);
    }
  }

  /** Delete a preset by index and synchronize home view */
  function deletePreset(index) {
    if (index < 0 || index >= state.presets.length) return;
    const name = state.presets[index].name || `Preset ${index + 1}`;
    state.presets.splice(index, 1);
    savePresets(state.presets);
    renderManagePresetsList();
    renderMainPresets();
    showToast(t('presets.deleted'));
  }

  /**
   * Render preset swatches on the initial home screen (view-main).
   * Tapping any swatch controls the light according to that preset.
   */
  function renderMainPresets() {
    const container = document.getElementById('preset-swatches-container');
    if (!container) return;
    container.innerHTML = '';

    state.presets.forEach((preset, index) => {
      const btn = document.createElement('button');
      btn.className = 'preset-item preset-color';
      btn.dataset.index = index;

      let swatchColor;
      if (preset.type === 'color') {
        btn.dataset.type = 'color';
        btn.dataset.hue = preset.hue;
        btn.dataset.brightness = preset.brightness || 100;
        swatchColor = `hsl(${preset.hue}, ${preset.saturation || 100}%, 50%)`;
        btn.title = preset.name || `${t('presets.default', { index: index + 1 })} · ${preset.hue}°`;
      } else {
        btn.dataset.type = 'temp';
        btn.dataset.val = preset.temp;
        btn.dataset.brightness = preset.brightness || 100;
        const rgb = kelvinToRgb(preset.temp || 2700);
        swatchColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        btn.title = preset.name || `${t('presets.default', { index: index + 1 })} · ${preset.temp}K`;
      }
      btn.style.setProperty('--swatch-color', swatchColor);

      btn.addEventListener('click', () => {
        container.querySelectorAll('.preset-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Apply brightness
        const br = preset.brightness || 100;
        state.brightness = br;
        if (el.brightnessLabel) el.brightnessLabel.textContent = `${br}%`;
        if (el.brightnessFill) el.brightnessFill.style.width = `${br}%`;
        if (el.brightnessInput) el.brightnessInput.value = br;
        debouncedSetBrightness(br);

        if (preset.type === 'color') {
          setActiveTab('color', false);
          if (!state.hsv) state.hsv = { hue: 180, saturation: 100, value: 100 };
          state.hsv.hue = preset.hue;
          state.hsv.saturation = preset.saturation || 100;
          updateBulbVisual();
          debouncedSetColor(preset.hue);
        } else {
          setActiveTab('white', false);
          state.color_temp = preset.temp;
          if (el.whiteTempIndicator) el.whiteTempIndicator.textContent = `${preset.temp}K`;
          updateBulbVisual();
          debouncedSetTemp(preset.temp);
        }
      });

      container.appendChild(btn);
    });
  }

  // --------------------------------------------------------------------------
  // GESTISCI PRESET VIEW (full-page list, image 1)
  // --------------------------------------------------------------------------

  /**
   * Render the 7 preset rows in view-manage-presets.
   * Matches 1.jpeg layout and typography.
   */
  function renderManagePresetsList() {
    const card = el.presetManageListCard;
    if (!card) return;

    card.querySelectorAll('.preset-manage-row, .preset-manage-empty-hint').forEach(r => r.remove());

    if (state.presets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'preset-manage-empty-hint';
      empty.textContent = t('presets.empty');
      card.appendChild(empty);
      return;
    }

    state.presets.forEach((preset, idx) => {
      const row = document.createElement('div');
      row.className = 'preset-manage-row';
      row.dataset.index = idx;
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.draggable = true;

      let dotColor;
      if (preset.type === 'color') {
        dotColor = `hsl(${preset.hue}, ${preset.saturation || 100}%, 50%)`;
      } else {
        const rgb = kelvinToRgb(preset.temp || 2700);
        dotColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      }

      // Meta text: Sun icon + 100% | dot + (Kelvin if white, or nothing if color)
      const metaHtml = preset.type === 'white'
        ? `<svg class="preset-meta-sun" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg> <span>${preset.brightness || 100}%</span><span class="preset-meta-sep">|</span><span class="preset-manage-dot" style="background:${dotColor};"></span><span>${preset.temp}K</span>`
        : `<svg class="preset-meta-sun" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg> <span>${preset.brightness || 100}%</span><span class="preset-meta-sep">|</span><span class="preset-manage-dot" style="background:${dotColor};"></span>`;

      row.innerHTML = `
        <button type="button" class="preset-manage-del-btn" data-index="${idx}" title="Elimina preset" aria-label="Elimina preset">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#ef4444">
            <circle cx="12" cy="12" r="10"/>
            <line x1="7" y1="12" x2="17" y2="12" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="preset-manage-row-left">
          <div class="preset-manage-row-name">${preset.name || t('presets.default', { index: idx + 1 })}</div>
          <div class="preset-manage-row-meta">${metaHtml}</div>
        </div>
        <svg class="preset-manage-row-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        <div class="preset-manage-drag-handle" title="Trascina per riordinare">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="4" y1="7" x2="20" y2="7"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <line x1="4" y1="17" x2="20" y2="17"/>
          </svg>
        </div>
      `;

      row.addEventListener('click', (e) => {
        if (e.target.closest('.preset-manage-del-btn')) return;
        if (state.isReordering) return;
        openEditPresetView(idx);
      });

      const delBtn = row.querySelector('.preset-manage-del-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deletePreset(idx);
        });
      }

      // Drag and drop for reordering
      row.addEventListener('dragstart', (e) => {
        if (!state.isReordering) {
          e.preventDefault();
          return;
        }
        row.classList.add('is-dragging');
        e.dataTransfer.setData('text/plain', String(idx));
        e.dataTransfer.effectAllowed = 'move';
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('is-dragging');
        card.querySelectorAll('.preset-manage-row').forEach(r => r.classList.remove('drag-over'));
      });

      row.addEventListener('dragover', (e) => {
        if (!state.isReordering) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        row.classList.add('drag-over');
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over');
      });

      row.addEventListener('drop', (e) => {
        if (!state.isReordering) return;
        e.preventDefault();
        row.classList.remove('drag-over');
        const fromIdx = Number(e.dataTransfer.getData('text/plain'));
        const toIdx = idx;
        if (!isNaN(fromIdx) && fromIdx !== toIdx) {
          const item = state.presets.splice(fromIdx, 1)[0];
          state.presets.splice(toIdx, 0, item);
          localStorage.setItem('tapo_presets', JSON.stringify(state.presets));
          renderManagePresetsList();
          renderMainPresets();
        }
      });

      card.appendChild(row);
    });
  }

  // --------------------------------------------------------------------------
  // EDITA PRESET VIEW (full-page editor, images 2 & 3)
  // --------------------------------------------------------------------------

  /** Draw the HSV color wheel with Red at top (12 o'clock, 0°), Magenta at 10 o'clock (300°) */
  function drawColorWheel(canvas) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r) continue;

        const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
        const sat = dist / r;

        const h6 = angle / 60;
        const hi = Math.floor(h6) % 6;
        const f = h6 - Math.floor(h6);
        const p = 1 - sat;
        const q = 1 - sat * f;
        const t = 1 - sat * (1 - f);
        let rr, gg, bb;
        switch (hi) {
          case 0: rr = 1; gg = t; bb = p; break;
          case 1: rr = q; gg = 1; bb = p; break;
          case 2: rr = p; gg = 1; bb = t; break;
          case 3: rr = p; gg = q; bb = 1; break;
          case 4: rr = t; gg = p; bb = 1; break;
          case 5: rr = 1; gg = p; bb = q; break;
          default: rr = gg = bb = 1;
        }
        const i = (y * size + x) * 4;
        img.data[i] = Math.round(rr * 255);
        img.data[i + 1] = Math.round(gg * 255);
        img.data[i + 2] = Math.round(bb * 255);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /** Draw the warm-to-cool temperature vertical gradient disc (Image 3) */
  function drawTempWheel(canvas) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Vertical linear gradient from top (warm amber) to bottom (cool blue)
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#ff9e3b');   // 2500K warm amber
    grad.addColorStop(0.25, '#ffc77d'); // 3500K warm white
    grad.addColorStop(0.5, '#ffffff');  // 4500K neutral white
    grad.addColorStop(0.75, '#d6e8ff'); // 5500K light icy white
    grad.addColorStop(1, '#b8d8ff');   // 6500K cool light blue

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }

  /** Convert hex string to HSV { hue, saturation, value } */
  function hexToHsv(hex) {
    let clean = hex.replace(/[^0-9A-Fa-f]/g, '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length !== 6) return null;

    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta) % 6;
      } else if (max === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : delta / max;
    return {
      hue: Math.round(h),
      saturation: Math.round(s * 100),
      value: Math.round(max * 100)
    };
  }

  /** Convert HSV { hue, saturation } to 6-character hex */
  function hsvToHex(hue, saturation) {
    const rgb = hslToRgb(hue, saturation, 50);
    return [rgb.r, rgb.g, rgb.b].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');
  }

  /** Update UI elements in view-edit-preset */
  function updateEditPresetUI() {
    const isColor = state.editPresetType === 'color';

    if (isColor) {
      if (el.editPresetColorLabel) el.editPresetColorLabel.textContent = t('app.color');
      if (el.editPresetHash) el.editPresetHash.classList.remove('hidden');
      if (el.editPresetHexInput) {
        el.editPresetHexInput.classList.remove('hidden');
        if (document.activeElement !== el.editPresetHexInput) {
          el.editPresetHexInput.value = hsvToHex(state.editPresetHue, state.editPresetSaturation);
        }
      }
      if (el.editPresetTempWrap) el.editPresetTempWrap.classList.add('hidden');

      const colorStr = `hsl(${state.editPresetHue}, ${state.editPresetSaturation}%, 50%)`;
      if (el.editPresetSwatch) el.editPresetSwatch.style.backgroundColor = colorStr;

      // Position color wheel thumb
      if (el.epWheelThumb) {
        const angleRad = (state.editPresetHue - 90) * Math.PI / 180;
        const satRatio = (state.editPresetSaturation ?? 100) / 100;
        const leftPct = 50 + (satRatio * 50 * Math.cos(angleRad));
        const topPct = 50 + (satRatio * 50 * Math.sin(angleRad));
        el.epWheelThumb.style.left = `${leftPct}%`;
        el.epWheelThumb.style.top = `${topPct}%`;
        el.epWheelThumb.style.backgroundColor = colorStr;
      }
    } else {
      if (el.editPresetColorLabel) el.editPresetColorLabel.textContent = t('labels.colorTemperature');
      if (el.editPresetHash) el.editPresetHash.classList.add('hidden');
      if (el.editPresetHexInput) el.editPresetHexInput.classList.add('hidden');
      if (el.editPresetTempWrap) el.editPresetTempWrap.classList.remove('hidden');
      if (el.editPresetTempInput && document.activeElement !== el.editPresetTempInput) {
        el.editPresetTempInput.value = state.editPresetTemp || 2700;
      }

      const kelvin = state.editPresetTemp || 2700;
      const rgb = kelvinToRgb(kelvin);
      const colorStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      if (el.editPresetSwatch) el.editPresetSwatch.style.backgroundColor = colorStr;

      // Position temp thumb along vertical axis
      if (el.epTempThumb) {
        const ratio = Math.max(0, Math.min(1, (kelvin - 2500) / (6500 - 2500)));
        el.epTempThumb.style.top = `${ratio * 100}%`;
        el.epTempThumb.style.left = '50%';
        el.epTempThumb.style.backgroundColor = colorStr;
      }
    }

    // Brightness slider
    const br = state.editPresetBrightness ?? 100;
    if (el.epBrightnessLabel) el.epBrightnessLabel.textContent = `${br}%`;
    if (el.epBrightnessFill) el.epBrightnessFill.style.width = `${br}%`;
    if (el.epBrightnessThumb) el.epBrightnessThumb.style.left = `${br}%`;
    if (el.epBrightnessInput) el.epBrightnessInput.value = br;
  }

  function switchEditPresetTab(tab) {
    state.editPresetType = tab;
    if (tab === 'color') {
      el.epTabColor?.classList.add('active');
      el.epTabWhite?.classList.remove('active');
      el.epColorWheelWrap?.classList.remove('hidden');
      el.epTempWheelWrap?.classList.add('hidden');
      if (state.editPresetHue === undefined) state.editPresetHue = 300;
      if (state.editPresetSaturation === undefined) state.editPresetSaturation = 100;
    } else {
      el.epTabWhite?.classList.add('active');
      el.epTabColor?.classList.remove('active');
      el.epTempWheelWrap?.classList.remove('hidden');
      el.epColorWheelWrap?.classList.add('hidden');
      if (state.editPresetTemp === undefined) state.editPresetTemp = 2700;
    }
    updateEditPresetUI();
  }

  /**
   * Open the edit-preset view.
   * If preset is white light -> opens Image 3 (Temperatura Colore / Luce Bianca).
   * If preset is color/RGB -> opens Image 2 (Colore / Color Wheel).
   */
  function openEditPresetView(index) {
    state.editingPresetIndex = index;
    const preset = state.presets[index] || DEFAULT_PRESETS[0];

    state.editPresetType = preset.type;
    state.editPresetBrightness = preset.brightness ?? 100;

    if (preset.type === 'color') {
      state.editPresetHue = preset.hue ?? 300;
      state.editPresetSaturation = preset.saturation ?? 100;
    } else {
      state.editPresetTemp = preset.temp ?? 2700;
    }

    // Lazy canvas initialization
    if (el.epColorWheel && !el.epColorWheel._drawn) {
      drawColorWheel(el.epColorWheel);
      el.epColorWheel._drawn = true;
    }
    if (el.epTempWheel && !el.epTempWheel._drawn) {
      drawTempWheel(el.epTempWheel);
      el.epTempWheel._drawn = true;
    }

    switchEditPresetTab(state.editPresetType);
    updateEditPresetUI();
    showView('view-edit-preset');
  }

  /** Color wheel touch/pointer handler */
  function setupColorWheelInteraction() {
    const canvas = el.epColorWheel;
    if (!canvas) return;

    function handlePointer(e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r = canvas.width / 2;
      const sat = Math.min(1, dist / r);
      const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;

      state.editPresetHue = Math.round(angle);
      state.editPresetSaturation = Math.round(sat * 100);
      updateEditPresetUI();
    }

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      handlePointer(e);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.buttons === 0) return;
      handlePointer(e);
    });
    canvas.addEventListener('pointerup', handlePointer);
  }

  /** Temperature disc touch/pointer handler (tappable & draggable anywhere on circle) */
  function setupTempWheelInteraction() {
    const wrap = el.epTempWheelWrap || el.epTempWheel;
    if (!wrap) return;

    function handlePointer(e) {
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ratio = Math.max(0, Math.min(1, y / rect.height));
      const kelvin = Math.round((2500 + ratio * (6500 - 2500)) / 50) * 50;
      state.editPresetTemp = kelvin;
      updateEditPresetUI();
    }

    wrap.addEventListener('pointerdown', (e) => {
      wrap.setPointerCapture(e.pointerId);
      handlePointer(e);
    });
    wrap.addEventListener('pointermove', (e) => {
      if (e.buttons === 0) return;
      handlePointer(e);
    });
    wrap.addEventListener('pointerup', handlePointer);
  }

  /** Keyboard typing for Kelvin temperature (white mode) */
  function setupTempInputInteraction() {
    const input = el.editPresetTempInput;
    if (!input) return;

    input.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val)) {
        const clamped = Math.max(2500, Math.min(6500, val));
        state.editPresetTemp = clamped;
        const rgb = kelvinToRgb(clamped);
        if (el.editPresetSwatch) el.editPresetSwatch.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        if (el.epTempThumb) {
          const ratio = Math.max(0, Math.min(1, (clamped - 2500) / (6500 - 2500)));
          el.epTempThumb.style.top = `${ratio * 100}%`;
          el.epTempThumb.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        }
      }
    });

    input.addEventListener('blur', () => {
      let val = parseInt(input.value, 10);
      if (isNaN(val)) val = 2700;
      val = Math.max(2500, Math.min(6500, val));
      state.editPresetTemp = val;
      updateEditPresetUI();
    });
  }

  /** Keyboard typing for hexadecimal color code (color mode) */
  function setupHexInputInteraction() {
    const input = el.editPresetHexInput;
    if (!input) return;

    input.addEventListener('input', (e) => {
      let val = e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '');
      input.value = val;
      if (val.length === 6) {
        const hsv = hexToHsv(val);
        if (hsv) {
          state.editPresetHue = hsv.hue;
          state.editPresetSaturation = hsv.saturation;
          updateEditPresetUI();
        }
      }
    });

    input.addEventListener('blur', () => {
      input.value = hsvToHex(state.editPresetHue, state.editPresetSaturation);
    });
  }

  /** Custom brightness slider with white circle thumb (matching 2.jpeg/3.jpeg) */
  function setupEditPresetBrightnessSlider() {
    const wrapper = el.epBrightnessWrapper;
    const input = el.epBrightnessInput;
    if (!wrapper || !input) return;

    function updateFromPointer(clientX) {
      const rect = wrapper.getBoundingClientRect();
      const ratio = Math.max(0.01, Math.min(1, (clientX - rect.left) / rect.width));
      const val = Math.round(ratio * 100);
      state.editPresetBrightness = val;
      input.value = val;
      if (el.epBrightnessLabel) el.epBrightnessLabel.textContent = `${val}%`;
      if (el.epBrightnessFill) el.epBrightnessFill.style.width = `${val}%`;
      if (el.epBrightnessThumb) el.epBrightnessThumb.style.left = `${val}%`;
    }

    wrapper.addEventListener('pointerdown', (e) => {
      wrapper.setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX);
    });
    wrapper.addEventListener('pointermove', (e) => {
      if (e.buttons === 0) return;
      updateFromPointer(e.clientX);
    });

    input.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      state.editPresetBrightness = val;
      if (el.epBrightnessLabel) el.epBrightnessLabel.textContent = `${val}%`;
      if (el.epBrightnessFill) el.epBrightnessFill.style.width = `${val}%`;
      if (el.epBrightnessThumb) el.epBrightnessThumb.style.left = `${val}%`;
    });
  }

  function renderCustomPresets() {
    if (!el.customPresetsContainer) return;
    el.customPresetsContainer.innerHTML = '';

    state.customPresets.forEach((preset, index) => {
      const btn = document.createElement('button');
      btn.className = 'preset-item';
      btn.title = preset.name || (preset.type === 'color' ? `${t('app.color')} ${preset.hue}°` : `Bianco ${preset.temp}K`);

      if (preset.type === 'color') {
        btn.dataset.type = 'color';
        btn.dataset.hue = preset.hue;
        btn.style.setProperty('--swatch-color', `hsl(${preset.hue}, 100%, 50%)`);
      } else {
        btn.dataset.type = 'temp';
        btn.dataset.val = preset.temp;
        const rgb = kelvinToRgb(preset.temp);
        btn.style.setProperty('--swatch-color', `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
      }

      // Long press or double tap to remove
      let pressTimer;
      btn.addEventListener('pointerdown', () => {
        pressTimer = setTimeout(() => {
          if (confirm(t('dialogs.deletePreset', { name: btn.title }))) {
            state.customPresets.splice(index, 1);
            localStorage.setItem('tapo_custom_presets', JSON.stringify(state.customPresets));
            renderCustomPresets();
            showToast(t('presets.removed'));
          }
        }, 800);
      });
      btn.addEventListener('pointerup', () => clearTimeout(pressTimer));
      btn.addEventListener('pointercancel', () => clearTimeout(pressTimer));

      el.customPresetsContainer.appendChild(btn);
    });

    // Also update modal manage list if it's open
    renderModalPresetList();

    // Also refresh the full-page manage list if visible
    const manageView = document.getElementById('view-manage-presets');
    if (manageView && manageView.classList.contains('active')) {
      renderManagePresetsList();
    }
  }

  function renderModalPresetList() {
    const listEl = document.getElementById('modal-custom-presets-list');
    const hintEl = document.getElementById('modal-no-presets-hint');
    if (!listEl) return;

    // Clear existing preset rows in modal (keep the hint)
    listEl.querySelectorAll('.modal-preset-row').forEach(r => r.remove());

    const builtInPresets = [
      { name: 'Caldo', type: 'white', temp: 2700 },
      { name: 'Caldo', type: 'white', temp: 3200 },
      { name: 'Naturale', type: 'white', temp: 3800 },
      { name: 'Freddo', type: 'white', temp: 5000 },
      { name: 'Viola', type: 'color', hue: 275 },
      { name: 'Giallo', type: 'color', hue: 55 }
    ];
    builtInPresets.forEach((preset) => {
      const row = document.createElement('div');
      row.className = 'modal-preset-row';
      const content = document.createElement('div');
      content.className = 'modal-preset-row-content';
      const swatch = document.createElement('div');
      swatch.className = 'modal-preset-swatch';
      if (preset.type === 'color') swatch.style.backgroundColor = `hsl(${preset.hue}, 100%, 50%)`;
      else {
        const rgb = kelvinToRgb(preset.temp);
        swatch.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      }
      const label = document.createElement('span');
      label.className = 'modal-preset-name';
      label.textContent = `${preset.name} | ${preset.type === 'color' ? t('app.color') : `${preset.temp}K`}`;
      content.append(swatch, label);
      row.appendChild(content);
      row.addEventListener('click', () => {
        if (preset.type === 'color') {
          setActiveTab('color', false);
          state.hsv.hue = preset.hue;
          debouncedSetColor(preset.hue);
        } else {
          setActiveTab('white', false);
          state.color_temp = preset.temp;
          debouncedSetTemp(preset.temp);
        }
        updateUI();
        el.modalCustomPreset.classList.add('hidden');
      });
      listEl.appendChild(row);
    });

    if (state.customPresets.length === 0) {
      if (hintEl) hintEl.style.display = 'none';
    } else {
      if (hintEl) hintEl.style.display = 'none';
      state.customPresets.forEach((preset, index) => {
        const row = document.createElement('div');
        row.className = 'modal-preset-row';
        row.draggable = true;
        row.dataset.index = index;

        const swatch = document.createElement('div');
        swatch.className = 'modal-preset-swatch';
        if (preset.type === 'color') {
          swatch.style.backgroundColor = `hsl(${preset.hue}, 100%, 50%)`;
        } else {
          const rgb = kelvinToRgb(preset.temp);
          swatch.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        }

        const label = document.createElement('span');
        label.className = 'modal-preset-name';
        label.textContent = preset.name || (preset.type === 'color' ? `${t('app.color')} ${preset.hue}°` : `Bianco ${preset.temp}K`);

        const delBtn = document.createElement('button');
        delBtn.className = 'modal-preset-del-btn';
        delBtn.setAttribute('aria-label', t('presets.delete'));
        delBtn.textContent = t('common.delete');
        delBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          state.customPresets.splice(index, 1);
          localStorage.setItem('tapo_custom_presets', JSON.stringify(state.customPresets));
          renderCustomPresets();
          renderModalPresetList();
          showToast(t('presets.deleted'));
        });

        const content = document.createElement('div');
        content.className = 'modal-preset-row-content';
        content.appendChild(swatch);
        content.appendChild(label);
        content.addEventListener('click', () => openPresetEditor(index));
        row.appendChild(delBtn);
        row.appendChild(content);
        listEl.appendChild(row);

        let startX = 0;
        let revealed = false;
        row.addEventListener('pointerdown', (event) => {
          startX = event.clientX;
          row.setPointerCapture(event.pointerId);
        });
        row.addEventListener('pointerup', (event) => {
          const deltaX = event.clientX - startX;
          if (deltaX < -45) {
            row.classList.add('is-revealed');
            revealed = true;
          } else if (deltaX > 25 || (Math.abs(deltaX) < 10 && revealed)) {
            row.classList.remove('is-revealed');
            revealed = false;
          }
        });
        row.addEventListener('dragstart', (event) => {
          event.dataTransfer.setData('text/plain', String(index));
          row.classList.add('is-dragging');
        });
        row.addEventListener('dragend', () => row.classList.remove('is-dragging'));
        row.addEventListener('dragover', (event) => event.preventDefault());
        row.addEventListener('drop', (event) => {
          event.preventDefault();
          const from = Number(event.dataTransfer.getData('text/plain'));
          const to = Number(row.dataset.index);
          if (!Number.isInteger(from) || from === to) return;
          const [moved] = state.customPresets.splice(from, 1);
          state.customPresets.splice(to, 0, moved);
          localStorage.setItem('tapo_custom_presets', JSON.stringify(state.customPresets));
          renderCustomPresets();
          renderModalPresetList();
        });
      });
    }
  }

  function showPresetList() {
    state.modalEditingIndex = null;
    el.modalListView?.classList.remove('hidden');
    el.modalEditorView?.classList.add('hidden');
    el.btnBackPresetList?.classList.add('hidden');
    if (el.btnNewPreset) el.btnNewPreset.classList.remove('hidden');
    if (el.modalPresetTitle) el.modalPresetTitle.textContent = t('presets.title');
    renderModalPresetList();
  }

  function openPresetEditor(index = null) {
    state.modalEditingIndex = index;
    const preset = index === null ? null : state.customPresets[index];
    if (preset) {
      state.modalPresetType = preset.type;
      state.modalHue = preset.hue ?? 180;
      state.modalTemp = preset.temp ?? 3200;
      el.modalPresetName.value = preset.name || '';
      el.modalColorSlider.value = state.modalHue;
      el.modalWhiteSlider.value = state.modalTemp;
      if (state.modalPresetType === 'color') el.modalTabColor.click();
      else el.modalTabWhite.click();
    } else {
      el.modalPresetName.value = '';
      el.modalColorSlider.value = state.modalHue;
      el.modalWhiteSlider.value = state.modalTemp;
    }
    el.modalListView?.classList.add('hidden');
    el.modalEditorView?.classList.remove('hidden');
    el.btnBackPresetList?.classList.remove('hidden');
    el.btnNewPreset?.classList.add('hidden');
    if (el.modalPresetTitle) el.modalPresetTitle.textContent = preset ? t('presets.modalEdit') : t('presets.new');
    if (el.modalEditorLabel) el.modalEditorLabel.textContent = preset ? t('presets.settings') : t('presets.createNew');
    if (el.btnSaveCustomPreset) el.btnSaveCustomPreset.textContent = preset ? t('presets.saveChanges') : t('presets.add');
    updateModalSwatch();
  }

  function updateModalSwatch() {
    if (state.modalPresetType === 'color') {
      const hue = state.modalHue;
      el.modalSwatchPreview.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
      el.modalPresetTag.textContent = t('presets.hsv');
      el.modalPresetValText.textContent = t('presets.hueValue', { value: hue });
    } else {
      const temp = state.modalTemp;
      const rgb = kelvinToRgb(temp);
      el.modalSwatchPreview.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      el.modalPresetTag.textContent = t('presets.whiteKelvin');
      el.modalPresetValText.textContent = `Temperatura: ${temp}K`;
    }
  }

  // ==========================================================================
  // Device Identity Updates (Icon, Name, Location)
  // ==========================================================================
  function getDeviceIconMarkup(iconId, isHero = true) {
    if (iconId === 'table-lamp-cone') {
      return isHero ? `
        <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 48 48" aria-label="Lampada conica">
          <polygon points="15 25 33 25 29 12 19 12" fill="var(--bulb-main-color, #fed776)"/>
          <ellipse cx="24" cy="31" rx="5" ry="6" fill="#90a4ae"/>
          <rect x="22" y="25" width="4" height="3" fill="#cfd8dc"/>
          <ellipse cx="24" cy="38" rx="7" ry="2" fill="#546e7a"/>
        </svg>` : `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <polygon points="7 13 17 13 15 6 9 6" fill="var(--bulb-main-color, #f59e0b)"/>
          <rect x="11" y="13" width="2" height="6" fill="#90a4ae"/>
          <ellipse cx="12" cy="19" rx="4" ry="1.2" fill="#546e7a"/>
        </svg>`;
    }
    if (iconId === 'table-lamp-square') {
      return isHero ? `
        <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 48 48" aria-label="Lampada squadrata">
          <rect x="17" y="12" width="14" height="14" rx="2" fill="var(--bulb-main-color, #fed776)"/>
          <rect x="23" y="26" width="2" height="11" fill="#374151"/>
          <circle cx="21" cy="28" r="1.3" fill="#ef4444"/>
          <rect x="18" y="37" width="12" height="2.5" rx="1" fill="#1f2937"/>
        </svg>` : `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <rect x="8" y="6" width="8" height="8" rx="1" fill="var(--bulb-main-color, #f59e0b)"/>
          <line x1="12" y1="14" x2="12" y2="19" stroke="#90a4ae" stroke-width="2"/>
          <rect x="9" y="19" width="6" height="1.5" rx="0.5" fill="#1f2937"/>
        </svg>`;
    }
    if (iconId === 'vintage-lamp') {
      return isHero ? `
        <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 48 48" aria-label="Lampada vintage">
          <polygon points="14 26 34 26 30 12 18 12" fill="var(--bulb-main-color, #fde68a)"/>
          <path d="M14 26 Q 16.5 29.5, 19 26 Q 21.5 29.5, 24 26 Q 26.5 29.5, 29 26 Q 31.5 29.5, 34 26" stroke="#ef4444" stroke-width="2" fill="none"/>
          <ellipse cx="24" cy="33" rx="4.5" ry="5.5" fill="#90a4ae"/>
          <ellipse cx="24" cy="39" rx="6.5" ry="2" fill="#475569"/>
        </svg>` : `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <polygon points="7 13 17 13 15 6 9 6" fill="var(--bulb-main-color, #f59e0b)"/>
          <line x1="12" y1="13" x2="12" y2="18" stroke="#90a4ae" stroke-width="2"/>
          <ellipse cx="12" cy="19" rx="3.5" ry="1.2" fill="#475569"/>
        </svg>`;
    }
    if (iconId === 'desk-lamp') {
      return isHero ? `
        <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 48 48" aria-label="Lampada pantografo">
          <path d="M22 17l6 6" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M28 23l-7 13" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M19 15l-4 4 5 5 4-4z" fill="var(--bulb-main-color, #3b82f6)"/>
          <circle cx="28" cy="23" r="2.2" fill="#94a3b8"/>
          <rect x="18" y="36" width="12" height="2.5" rx="1" fill="#64748b"/>
        </svg>` : `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M9 7l-2 2 3 3 2-2z" fill="var(--bulb-main-color, #f59e0b)"/>
          <line x1="11" y1="9" x2="14" y2="12" stroke="#64748b" stroke-width="1.8"/>
          <line x1="14" y1="12" x2="10" y2="19" stroke="#64748b" stroke-width="1.8"/>
          <rect x="8" y="19" width="6" height="1.5" rx="0.5" fill="#64748b"/>
        </svg>`;
    }
    if (iconId === 'desk-lamp-lit') {
      return isHero ? `
        <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 48 48" aria-label="Lampada con luce">
          <polygon points="13 38 25 18 33 18 21 38" fill="var(--bulb-glow-color, rgba(253, 224, 71, 0.35))"/>
          <path d="M26 17l9 3-4 16" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" fill="none"/>
          <rect x="24" y="15" width="12" height="4" rx="1.5" fill="var(--bulb-main-color, #fed776)"/>
          <rect x="29" y="36" width="10" height="2" rx="1" fill="#334155"/>
        </svg>` : `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <rect x="12" y="7" width="6" height="2.5" rx="1" fill="var(--bulb-main-color, #f59e0b)"/>
          <path d="M13 8l4 2-2 9" stroke="#94a3b8" stroke-width="1.6" fill="none"/>
          <rect x="14" y="19" width="5" height="1.5" fill="#334155"/>
        </svg>`;
    }
    if (iconId === 'floor-lamp') {
      return isHero ? `
        <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 48 48" aria-label="Piantana classica">
          <polygon points="17 21 31 21 29 13 19 13" fill="var(--bulb-main-color, #fde68a)"/>
          <line x1="24" y1="21" x2="24" y2="39" stroke="#64748b" stroke-width="2.4" stroke-linecap="round"/>
          <circle cx="21" cy="23" r="1.3" fill="#ef4444"/>
          <rect x="18" y="39" width="12" height="2.5" rx="1" fill="#475569"/>
        </svg>` : `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <polygon points="8 10 16 10 15 5 9 5" fill="var(--bulb-main-color, #f59e0b)"/>
          <line x1="12" y1="10" x2="12" y2="20" stroke="#64748b" stroke-width="1.8"/>
          <rect x="9" y="20" width="6" height="1.5" rx="0.5" fill="#475569"/>
        </svg>`;
    }
    if (iconId === 'floor-reading-lamp') {
      return isHero ? `
        <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 48 48" aria-label="Piantana con luce lettura">
          <path d="M18 15 Q 24 19.5, 30 15" stroke="var(--bulb-main-color, #fde68a)" stroke-width="4" fill="none" stroke-linecap="round"/>
          <line x1="24" y1="17" x2="24" y2="39" stroke="#64748b" stroke-width="2.4"/>
          <path d="M24 23 Q 27.5 25.5, 30 24" stroke="#64748b" stroke-width="2" fill="none"/>
          <ellipse cx="30" cy="24" rx="2.5" ry="2" fill="var(--bulb-main-color, #fde68a)"/>
          <rect x="18" y="39" width="12" height="2.5" rx="1" fill="#475569"/>
        </svg>` : `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M9 7 Q 12 9, 15 7" stroke="var(--bulb-main-color, #f59e0b)" stroke-width="2.2" fill="none"/>
          <line x1="12" y1="8" x2="12" y2="20" stroke="#64748b" stroke-width="1.8"/>
          <rect x="9" y="20" width="6" height="1.5" rx="0.5" fill="#475569"/>
        </svg>`;
    }
    if (iconId === 'floor-square-lamp') {
      return isHero ? `
        <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 48 48" aria-label="Piantana squadrata">
          <rect x="19" y="13" width="10" height="11" rx="1.5" fill="var(--bulb-main-color, #fde68a)"/>
          <line x1="24" y1="24" x2="24" y2="39" stroke="#64748b" stroke-width="2.2" stroke-dasharray="2,2"/>
          <rect x="18" y="39" width="12" height="2.5" rx="1" fill="#475569"/>
        </svg>` : `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <rect x="9.5" y="6" width="5" height="6" rx="1" fill="var(--bulb-main-color, #f59e0b)"/>
          <line x1="12" y1="12" x2="12" y2="20" stroke="#64748b" stroke-width="1.8"/>
          <rect x="9" y="20" width="6" height="1.5" rx="0.5" fill="#475569"/>
        </svg>`;
    }
    if (iconId === 'pendant-dome') {
      return isHero ? `
        <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 48 48" aria-label="Lampadario a campana">
          <line x1="24" y1="10" x2="24" y2="23" stroke="#475569" stroke-width="2.2"/>
          <path d="M15 31 C 15 23, 33 23, 33 31 Z" fill="var(--bulb-main-color, #90caf9)"/>
          <ellipse cx="24" cy="31" rx="9" ry="2.5" fill="var(--bulb-inner-light, #64b5f6)"/>
          <circle cx="24" cy="32" r="2.8" fill="#ffffff"/>
        </svg>` : `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <line x1="12" y1="5" x2="12" y2="11" stroke="#475569" stroke-width="1.8"/>
          <path d="M7 16 C 7 11, 17 11, 17 16 Z" fill="var(--bulb-main-color, #f59e0b)"/>
          <ellipse cx="12" cy="16" rx="5" ry="1.2" fill="#fed776"/>
        </svg>`;
    }
    if (iconId === 'track-spots') {
      return isHero ? `
        <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 48 48" aria-label="Barra faretti">
          <rect x="11" y="22" width="26" height="2.5" fill="#475569"/>
          <line x1="16" y1="17" x2="16" y2="22" stroke="#475569" stroke-width="2"/>
          <line x1="32" y1="17" x2="32" y2="22" stroke="#475569" stroke-width="2"/>
          <path d="M12 28l3.5-4 3.5 4z" fill="var(--bulb-main-color, #90caf9)"/>
          <circle cx="15.5" cy="27" r="1.6" fill="var(--bulb-inner-light, #fde68a)"/>
          <path d="M20.5 28l3.5-4 3.5 4z" fill="var(--bulb-main-color, #90caf9)"/>
          <circle cx="24" cy="27" r="1.6" fill="var(--bulb-inner-light, #fde68a)"/>
          <path d="M29 28l3.5-4 3.5 4z" fill="var(--bulb-main-color, #90caf9)"/>
          <circle cx="32.5" cy="27" r="1.6" fill="var(--bulb-inner-light, #fde68a)"/>
        </svg>` : `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <rect x="5" y="10" width="14" height="1.5" fill="#475569"/>
          <circle cx="8" cy="14" r="1.5" fill="var(--bulb-main-color, #f59e0b)"/>
          <circle cx="12" cy="14" r="1.5" fill="var(--bulb-main-color, #f59e0b)"/>
          <circle cx="16" cy="14" r="1.5" fill="var(--bulb-main-color, #f59e0b)"/>
        </svg>`;
    }
    if (iconId === 'triple-pendant') {
      return isHero ? `
        <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 48 48" aria-label="Lampadario triplo">
          <rect x="13" y="21" width="22" height="2.5" fill="#475569"/>
          <line x1="16" y1="23.5" x2="16" y2="29" stroke="#475569" stroke-width="1.6"/>
          <line x1="24" y1="23.5" x2="24" y2="29" stroke="#475569" stroke-width="1.6"/>
          <line x1="32" y1="23.5" x2="32" y2="29" stroke="#475569" stroke-width="1.6"/>
          <rect x="14" y="29" width="4.5" height="7" rx="1.5" fill="var(--bulb-main-color, #90caf9)"/>
          <rect x="21.75" y="29" width="4.5" height="7" rx="1.5" fill="var(--bulb-main-color, #90caf9)"/>
          <rect x="29.5" y="29" width="4.5" height="7" rx="1.5" fill="var(--bulb-main-color, #90caf9)"/>
        </svg>` : `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <rect x="6" y="9" width="12" height="1.5" fill="#475569"/>
          <rect x="7" y="14" width="2.5" height="4" rx="0.8" fill="var(--bulb-main-color, #f59e0b)"/>
          <rect x="10.75" y="13" width="2.5" height="5" rx="0.8" fill="var(--bulb-main-color, #f59e0b)"/>
          <rect x="14.5" y="15" width="2.5" height="4" rx="0.8" fill="var(--bulb-main-color, #f59e0b)"/>
        </svg>`;
    }
    // Default bulb
    return isHero ? `
      <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 160 210" aria-label="${t('aria.bulb')}">
        <defs>
          <radialGradient id="bulb-glass-gradient" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stop-color="var(--bulb-inner-light, #fed776)"/>
            <stop offset="70%" stop-color="var(--bulb-main-color, #f6b23a)"/>
            <stop offset="100%" stop-color="var(--bulb-dark-color, #e09922)"/>
          </radialGradient>
        </defs>
        <path id="bulb-glass" class="bulb-glass" d="
          M 80 18
          C 44 18, 22 46, 22 82
          C 22 108, 38 128, 52 144
          C 56 148, 58 153, 58 158
          L 102 158
          C 102 153, 104 148, 108 144
          C 122 128, 138 108, 138 82
          C 138 46, 116 18, 80 18 Z
        " fill="url(#bulb-glass-gradient)" />
        <g id="bulb-filament" class="bulb-filament">
          <line x1="80" y1="110" x2="80" y2="152" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round"/>
          <line x1="80" y1="110" x2="56" y2="80" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round"/>
          <line x1="80" y1="110" x2="104" y2="80" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round"/>
        </g>
        <g class="bulb-base">
          <rect x="56" y="160" width="48" height="11" rx="4.5" fill="#2c2c34"/>
          <rect x="61" y="174" width="38" height="10" rx="4" fill="#24242b"/>
          <path d="M 66 186 C 66 186, 68 196, 80 196 C 92 196, 94 186, 94 186 Z" fill="#18181f"/>
        </g>
      </svg>` : `
      <svg viewBox="0 0 24 24" width="24" height="24" fill="var(--bulb-main-color, #f59e0b)">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/>
      </svg>`;
  }

  function renderDeviceIcon(iconId) {
    if (el.heroBulbContainer) {
      el.heroBulbContainer.innerHTML = getDeviceIconMarkup(iconId, true);
      el.heroBulbSvg = document.getElementById('hero-bulb-svg');
      el.bulbGlass = document.getElementById('bulb-glass');
      el.bulbFilament = document.getElementById('bulb-filament');
    }
    if (el.settingIconThumb) {
      el.settingIconThumb.innerHTML = getDeviceIconMarkup(iconId, false);
    }
  }

  const LOCATION_KEYS = { 'Camera da letto': 'locations.bedroom', 'Soggiorno': 'locations.livingRoom', 'Cucina': 'locations.kitchen', 'Studio': 'locations.studio' };
  function locationLabel(loc) { return LOCATION_KEYS[loc] ? t(LOCATION_KEYS[loc]) : loc; }
  function deviceDisplayName() {
    const n = (state.deviceName || '').trim();
    return (!n || n === 'Lampadina Smart' || n === 'Smart Bulb') ? t('device.smartBulb') : n;
  }

  function applyDeviceCustomizations() {
    // 0. Render Device Icon both in Hero Home and in Settings Thumb
    renderDeviceIcon(state.deviceIcon || 'bulb');

    // 1. Name
    const name = deviceDisplayName();
    if (el.heroDeviceName) {
      el.heroDeviceName.innerHTML = name.replace(' ', '<br>');
    }
    if (el.settingValueName) el.settingValueName.textContent = name;
    if (el.inputDeviceName) el.inputDeviceName.value = name;

    // 2. Location
    const loc = state.deviceLocation || 'Camera da letto';
    const displayedLocation = locationLabel(loc);
    if (el.heroDeviceLocation) el.heroDeviceLocation.textContent = displayedLocation;
    if (el.settingValueLocation) el.settingValueLocation.textContent = displayedLocation;

    // Checkmark in location subview
    document.querySelectorAll('.location-row').forEach(row => {
      const icon = row.querySelector('.check-icon');
      if (row.dataset.location === loc) {
        row.classList.add('active');
        if (icon) icon.classList.remove('hidden');
      } else {
        row.classList.remove('active');
        if (icon) icon.classList.add('hidden');
      }
    });

    // 3. Icon selection in grid
    document.querySelectorAll('.icon-option').forEach(opt => {
      if (opt.dataset.iconId === state.deviceIcon) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
  }

  // ==========================================================================
  // Language and deferred settings changes
  function translateUi(language) {
    state.language = language === 'en' ? 'en' : (language === 'xx' ? 'xx' : 'it');
    if (typeof window.setLanguage === 'function') window.setLanguage(state.language);
    if (el.settingValueLanguage) el.settingValueLanguage.textContent = state.language === 'en' ? t('device.english') : t('device.italian');
    renderLanguageSelection(state.pendingLanguage || state.language);
  }

  function renderLocationSelection(location) {
    document.querySelectorAll('.location-row').forEach(row => {
      const selected = row.dataset.location === location;
      row.classList.toggle('active', selected);
      const icon = row.querySelector('.check-icon');
      if (icon) icon.classList.toggle('hidden', !selected);
    });
  }

  function renderLanguageSelection(language) {
    el.languageRows.forEach(row => {
      const selected = row.dataset.language === language;
      row.classList.toggle('active', selected);
      const icon = row.querySelector('.check-icon');
      if (icon) icon.classList.toggle('hidden', !selected);
    });
  }

  function discardPendingSettings() {
    state.pendingLocation = state.deviceLocation;
    state.pendingLanguage = state.language;
    renderLocationSelection(state.deviceLocation);
    renderLanguageSelection(state.language);
    if (el.inputCustomLocation) el.inputCustomLocation.value = '';
  }

  // Setup Event Listeners
  // ==========================================================================
  function setupListeners() {
    // 1. Navigation Back Buttons
    document.querySelectorAll('.btn-view-back').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const currentView = document.querySelector('.app-view.active')?.id;
        if (currentView === 'view-location' || currentView === 'view-language') {
          const hasUnsavedLocation = currentView === 'view-location' && (state.pendingLocation !== state.deviceLocation || Boolean(el.inputCustomLocation?.value.trim()));
          const hasUnsavedLanguage = currentView === 'view-language' && state.pendingLanguage !== state.language;
          if (hasUnsavedLocation || hasUnsavedLanguage) {
            showToast(t('device.unsaved'));
          }
          discardPendingSettings();
        }
        if (target) {
          showView(target, false);
        } else {
          goBack();
        }
      });
    });

    // 2. Open Settings View
    if (el.btnSettings) {
      el.btnSettings.addEventListener('click', () => {
        showView('view-settings');
      });
    }

    // 3. Settings Rows Clicks
    if (el.settingRowIcon) {
      el.settingRowIcon.addEventListener('click', () => showView('view-select-icon'));
    }
    if (el.settingRowName) {
      el.settingRowName.addEventListener('click', () => showView('view-device-name'));
    }
    if (el.settingRowLocation) {
      el.settingRowLocation.addEventListener('click', () => {
        state.pendingLocation = state.deviceLocation;
        if (el.inputCustomLocation) el.inputCustomLocation.value = '';
        renderLocationSelection(state.pendingLocation);
        showView('view-location');
      });
    }
    if (el.settingRowLanguage) {
      el.settingRowLanguage.addEventListener('click', () => {
        state.pendingLanguage = state.language;
        renderLanguageSelection(state.pendingLanguage);
        showView('view-language');
      });
    }
    if (el.settingRowDefaultState) {
      el.settingRowDefaultState.addEventListener('click', () => showView('view-default-state'));
    }
    if (el.settingRowFade) {
      el.settingRowFade.addEventListener('click', () => showView('view-fade'));
    }
    if (el.settingRowSmartActions) {
      el.settingRowSmartActions.addEventListener('click', () => showView('view-smart-actions-sub'));
    }
    if (el.settingRowInfo) {
      el.settingRowInfo.addEventListener('click', () => {
        fetchDeviceInfo();
        showView('view-device-info');
      });
    }
    if (el.settingRowMatter) {
      el.settingRowMatter.addEventListener('click', () => showView('view-matter'));
    }
    if (el.settingRowFirmware) {
      el.settingRowFirmware.addEventListener('click', () => {
        showToast(t('toast.firmware'));
      });
    }
    if (el.rowShareDevice) {
      el.rowShareDevice.addEventListener('click', () => {
        showToast(t('toast.sharing'));
      });
    }

    // (Removed sections: 2x2 grid, smart actions home card, footer menu)

    // 4. Subview: Icon Picker
    if (el.iconPickerGrid) {
      el.iconPickerGrid.addEventListener('click', (e) => {
        const opt = e.target.closest('.icon-option');
        if (!opt) return;
        document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        state.deviceIcon = opt.dataset.iconId;
      });
    }

    if (el.btnSaveIcon) {
      el.btnSaveIcon.addEventListener('click', () => {
        localStorage.setItem('tapo_device_icon', state.deviceIcon);
        applyDeviceCustomizations();
        showToast(t('device.iconSaved'));
        showView('view-settings', false);
      });
    }

    // 5. Subview: Device Name
    if (el.btnClearName) {
      el.btnClearName.addEventListener('click', () => {
        el.inputDeviceName.value = '';
        el.inputDeviceName.focus();
      });
    }

    if (el.btnSaveName) {
      el.btnSaveName.addEventListener('click', () => {
        const newName = el.inputDeviceName.value.trim();
        if (newName) {
          state.deviceName = newName;
          localStorage.setItem('tapo_device_name', newName);
          applyDeviceCustomizations();
          showToast(t('toast.nameSaved'));
          showView('view-settings', false);
        }
      });
    }

    // 6. Subview: Location
    document.querySelectorAll('.location-row').forEach(row => {
      row.addEventListener('click', () => {
        const loc = row.dataset.location;
        state.pendingLocation = loc;
        renderLocationSelection(loc);
        return;
        // The location is committed only by the Save button.
        applyDeviceCustomizations();
      });
    });

    if (el.rowCustomLocation) {
      el.rowCustomLocation.addEventListener('click', () => {
        el.customLocationBox.classList.toggle('hidden');
        if (!el.customLocationBox.classList.contains('hidden')) {
          el.inputCustomLocation.focus();
        }
      });
    }

    el.languageRows.forEach(row => {
      row.addEventListener('click', () => {
        state.pendingLanguage = row.dataset.language;
        renderLanguageSelection(state.pendingLanguage);
      });
    });

    if (el.btnSaveLocation) {
      el.btnSaveLocation.addEventListener('click', () => {
        const custom = el.inputCustomLocation.value.trim();
        if (custom) {
          state.pendingLocation = custom;
        }
        state.deviceLocation = state.pendingLocation || state.deviceLocation;
        localStorage.setItem('tapo_device_location', state.deviceLocation);
        applyDeviceCustomizations();
        translateUi(state.language);
        showToast(t('device.locationSaved'));
        showView('view-settings', false);
      });
    }

    if (el.btnSaveLanguage) {
      el.btnSaveLanguage.addEventListener('click', () => {
        state.language = state.pendingLanguage || state.language;
        localStorage.setItem('tapo_language', state.language);
        translateUi(state.language);
        applyDeviceCustomizations();
        renderMainPresets();
        renderManagePresetsList();
        renderCustomPresets();
        translateUi(state.language);
        showToast(t('device.languageSaved'));
        showView('view-settings', false);
      });
    }

    // 7. Subview: Default State
    document.querySelectorAll('.selectable-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const grp = opt.dataset.group;
        const val = opt.dataset.val;
        if (grp === 'on-state') {
          state.defaultOnState = val;
          localStorage.setItem('tapo_default_on', val);
          el.settingValueDefaultState.textContent = val === 'last-on' ? 'Ultimo stato "On"' : 'Personalizzata';
        } else if (grp === 'recovery-state') {
          state.defaultRecovery = val;
          localStorage.setItem('tapo_default_recovery', val);
        }
        applyDeviceCustomizations();
        showToast(t('toast.prefSaved'));
      });
    });

    // 8. Subview: Fade Toggles
    if (el.toggleFadeOn) {
      el.toggleFadeOn.addEventListener('change', (e) => {
        state.fadeOn = e.target.checked;
        localStorage.setItem('tapo_fade_on', state.fadeOn);
        applyDeviceCustomizations();
      });
    }
    if (el.toggleFadeOff) {
      el.toggleFadeOff.addEventListener('change', (e) => {
        state.fadeOff = e.target.checked;
        localStorage.setItem('tapo_fade_off', state.fadeOff);
        applyDeviceCustomizations();
      });
    }

    // 9. Subview: Groups & Smart Actions Placeholders
    if (el.btnAddGroup) {
      el.btnAddGroup.addEventListener('click', () => {
        showToast(t('toast.groups'));
      });
    }
    if (el.btnAddSmartAction || el.btnShortcutMenu) {
      const handler = () => showToast(t('toast.automations'));
      if (el.btnAddSmartAction) el.btnAddSmartAction.addEventListener('click', handler);
      if (el.btnShortcutMenu) el.btnShortcutMenu.addEventListener('click', handler);
    }

    if (el.tabSmartRec && el.tabSmartActive) {
      el.tabSmartRec.addEventListener('click', () => {
        el.tabSmartRec.classList.add('active');
        el.tabSmartActive.classList.remove('active');
      });
      el.tabSmartActive.addEventListener('click', () => {
        el.tabSmartActive.classList.add('active');
        el.tabSmartRec.classList.remove('active');
      });
    }

    // 10. Subview: Matter Code Actions
    if (el.btnCopyMatterCode) {
      el.btnCopyMatterCode.addEventListener('click', async () => {
        if (!state.matterCode) { showToast(t('matter.notConfigured')); return; }
        try {
          await navigator.clipboard.writeText(state.matterCode);
          showToast(t('dialogs.matterCopy'));
        } catch (_) {
          showToast(t('dialogs.matterFallback', { code: state.matterCode }));
        }
      });
    }

    if (el.btnSaveMatterQr) {
      el.btnSaveMatterQr.addEventListener('click', () => showToast(t('matter.qrUnavailable')));
    }

    // 11. Hardware Controls: Power Button
    el.powerBtn.addEventListener('click', () => {
      const nextPower = !state.is_on;
      state.is_on = nextPower;
      updateUI();
      apiSetPower(nextPower);
    });

    // 12. Hardware Controls: Brightness Slider
    const brightnessWrapper = document.getElementById('brightness-slider-wrapper');
    attachTrackPointer(
      brightnessWrapper,
      el.brightnessInput,
      (val) => {
        state.brightness = val;
        el.brightnessLabel.textContent = `${val}%`;
        el.brightnessFill.style.width = `${val}%`;
        updateBulbVisual();
        debouncedSetBrightness(val);
      },
      (val) => {
        state.brightness = val;
        updateUI();
        fetchApi(`/api/brightness/${val}`, { method: 'POST' });
      }
    );

    el.brightnessInput.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      state.brightness = val;
      el.brightnessLabel.textContent = `${val}%`;
      el.brightnessFill.style.width = `${val}%`;
      updateBulbVisual();
      debouncedSetBrightness(val);
    });

    // 13. Tabs Switching
    el.tabBtnWhite.addEventListener('click', () => setActiveTab('white', true));
    el.tabBtnColor.addEventListener('click', () => setActiveTab('color', true));

    // 14. Hardware Controls: Temperature Slider
    const tempWrapper = document.getElementById('temp-slider-wrapper');
    attachTrackPointer(
      tempWrapper,
      el.tempInput,
      (kelvin) => {
        state.color_temp = kelvin;
        el.whiteTempIndicator.textContent = `${kelvin}K`;
        const pct = Math.max(0, Math.min(100, ((kelvin - 2500) / (6500 - 2500)) * 100));
        el.tempThumb.style.left = `${pct}%`;
        updateBulbVisual();
        debouncedSetTemp(kelvin);
      },
      (kelvin) => {
        state.color_temp = kelvin;
        updateUI();
        fetchApi(`/api/temp/${kelvin}`, { method: 'POST' });
      }
    );

    el.tempInput.addEventListener('input', (e) => {
      const kelvin = Number(e.target.value);
      state.color_temp = kelvin;
      el.whiteTempIndicator.textContent = `${kelvin}K`;
      const pct = Math.max(0, Math.min(100, ((kelvin - 2500) / (6500 - 2500)) * 100));
      el.tempThumb.style.left = `${pct}%`;
      updateBulbVisual();
      debouncedSetTemp(kelvin);
    });

    // 15. Hardware Controls: Color Spectrum Slider
    const colorWrapper = document.getElementById('color-slider-wrapper');
    attachTrackPointer(
      colorWrapper,
      el.colorInput,
      (hue) => {
        if (!state.hsv) state.hsv = { hue: 180, saturation: 100, value: 100 };
        state.hsv.hue = hue;
        const pct = Math.max(0, Math.min(100, (hue / 360) * 100));
        el.colorThumb.style.left = `${pct}%`;
        updateBulbVisual();
        debouncedSetColor(hue);
      },
      (hue) => {
        if (!state.hsv) state.hsv = { hue: 180, saturation: 100, value: 100 };
        state.hsv.hue = hue;
        updateUI();
        fetchApi('/api/color', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hue, saturation: 100, value: 100 })
        });
      }
    );

    el.colorInput.addEventListener('input', (e) => {
      const hue = Number(e.target.value);
      if (!state.hsv) state.hsv = { hue: 180, saturation: 100, value: 100 };
      state.hsv.hue = hue;
      const pct = Math.max(0, Math.min(100, (hue / 360) * 100));
      el.colorThumb.style.left = `${pct}%`;
      updateBulbVisual();
      debouncedSetColor(hue);
    });

    // 16. Built-in & Custom Presets Click Handler
    el.presetList.addEventListener('click', (e) => {
      const item = e.target.closest('.preset-item');
      if (!item || item.id === 'btn-manage-presets') return;

      document.querySelectorAll('.preset-item').forEach(p => p.classList.remove('active'));
      item.classList.add('active');

      if (item.dataset.preset === 'auto') {
        setActiveTab('white', false);
        state.brightness = 100;
        state.color_temp = 4000;
        updateUI();
        fetchApi('/api/brightness/100', { method: 'POST' });
        fetchApi('/api/temp/4000', { method: 'POST' });
      } else if (item.dataset.type === 'temp') {
        const val = Number(item.dataset.val);
        setActiveTab('white', false);
        state.color_temp = val;
        updateUI();
        debouncedSetTemp(val);
      } else if (item.dataset.type === 'color') {
        const hue = Number(item.dataset.hue);
        setActiveTab('color', false);
        if (!state.hsv) state.hsv = { hue: 180, saturation: 100, value: 100 };
        state.hsv.hue = hue;
        updateUI();
        debouncedSetColor(hue);
      }
    });

    // 17. Gestisci Preset full-page view listeners (Image 1)
    if (el.btnManagePresets) {
      el.btnManagePresets.addEventListener('click', () => {
        renderManagePresetsList();
        showView('view-manage-presets');
      });
    }

    if (el.btnPresetRiordina) {
      el.btnPresetRiordina.addEventListener('click', () => {
        state.isReordering = !state.isReordering;
        el.btnPresetRiordina.textContent = state.isReordering ? t('presets.done') : t('presets.reorder');
        const card = el.presetManageListCard;
        if (card) card.classList.toggle('is-reordering', state.isReordering);

        if (!state.isReordering) {
          localStorage.setItem('tapo_presets', JSON.stringify(state.presets));
          renderMainPresets();
          showToast(t('presets.orderSaved'));
        }
      });
    }

    if (el.btnAddPreset) {
      el.btnAddPreset.addEventListener('click', () => {
        const newIdx = state.presets.length;
        const newPreset = {
          name: t('presets.default', { index: newIdx + 1 }),
          type: 'color',
          hue: 200,
          saturation: 100,
          brightness: 100
        };
        state.presets.push(newPreset);
        localStorage.setItem('tapo_presets', JSON.stringify(state.presets));
        renderManagePresetsList();
        renderMainPresets();
        openEditPresetView(newIdx);
      });
    }

    // 17b. Edita Preset view tab switching & Done button (Images 2 & 3)
    if (el.epTabColor) {
      el.epTabColor.addEventListener('click', () => switchEditPresetTab('color'));
    }
    if (el.epTabWhite) {
      el.epTabWhite.addEventListener('click', () => switchEditPresetTab('white'));
    }

    if (el.btnEditPresetDone) {
      el.btnEditPresetDone.addEventListener('click', () => {
        if (state.editingPresetIndex !== null && state.presets[state.editingPresetIndex]) {
          const p = state.presets[state.editingPresetIndex];
          p.type = state.editPresetType;
          p.brightness = state.editPresetBrightness;
          if (state.editPresetType === 'color') {
            p.hue = state.editPresetHue;
            p.saturation = state.editPresetSaturation;
            delete p.temp;
          } else {
            p.temp = state.editPresetTemp;
            delete p.hue;
            delete p.saturation;
          }
          localStorage.setItem('tapo_presets', JSON.stringify(state.presets));
        }
        renderManagePresetsList();
        renderMainPresets();
        showToast(t('presets.saved'));
        showView('view-manage-presets');
      });
    }

    if (el.btnDeletePreset) {
      el.btnDeletePreset.addEventListener('click', () => {
        if (state.editingPresetIndex !== null && state.presets[state.editingPresetIndex]) {
          const idx = state.editingPresetIndex;
          state.editingPresetIndex = null;
          deletePreset(idx);
          showView('view-manage-presets');
        }
      });
    }

    // Preset interactions setup
    setupColorWheelInteraction();
    setupTempWheelInteraction();
    setupTempInputInteraction();
    setupHexInputInteraction();
    setupEditPresetBrightnessSlider();

    if (el.btnNewPreset) {
      el.btnNewPreset.addEventListener('click', () => {
        const isReordering = el.modalCustomPresetsList.classList.toggle('is-reordering');
        el.btnNewPreset.textContent = isReordering ? t('presets.done') : t('presets.reorder');
      });
    }
    if (el.btnBackPresetList) el.btnBackPresetList.addEventListener('click', showPresetList);

    if (el.btnClosePresetModal) {
      el.btnClosePresetModal.addEventListener('click', () => {
        el.modalCustomPreset.classList.add('hidden');
      });
    }

    if (el.modalCustomPreset) {
      el.modalCustomPreset.addEventListener('click', (e) => {
        if (e.target === el.modalCustomPreset) {
          el.modalCustomPreset.classList.add('hidden');
        }
      });
    }

    if (el.modalTabColor && el.modalTabWhite) {
      el.modalTabColor.addEventListener('click', () => {
        state.modalPresetType = 'color';
        el.modalTabColor.classList.add('active');
        el.modalTabWhite.classList.remove('active');
        el.modalBoxColor.classList.remove('hidden');
        el.modalBoxWhite.classList.add('hidden');
        updateModalSwatch();
      });

      el.modalTabWhite.addEventListener('click', () => {
        state.modalPresetType = 'white';
        el.modalTabWhite.classList.add('active');
        el.modalTabColor.classList.remove('active');
        el.modalBoxWhite.classList.remove('hidden');
        el.modalBoxColor.classList.add('hidden');
        updateModalSwatch();
      });
    }

    if (el.modalColorSlider) {
      el.modalColorSlider.addEventListener('input', (e) => {
        state.modalHue = Number(e.target.value);
        updateModalSwatch();
      });
    }

    if (el.modalWhiteSlider) {
      el.modalWhiteSlider.addEventListener('input', (e) => {
        state.modalTemp = Number(e.target.value);
        updateModalSwatch();
      });
    }

    if (el.btnPresetUseCurrent) {
      el.btnPresetUseCurrent.addEventListener('click', () => {
        if (state.activeTab === 'white') {
          state.modalPresetType = 'white';
          state.modalTemp = state.color_temp || 3000;
          el.modalWhiteSlider.value = state.modalTemp;
          el.modalTabWhite.click();
        } else {
          state.modalPresetType = 'color';
          state.modalHue = state.hsv?.hue || 180;
          el.modalColorSlider.value = state.modalHue;
          el.modalTabColor.click();
        }
        updateModalSwatch();
        showToast(t('toast.lightCopied'));
      });
    }

    if (el.btnSaveCustomPreset) {
      el.btnSaveCustomPreset.addEventListener('click', () => {
        const name = el.modalPresetName.value.trim();
        const newPreset = {
          name: name || undefined,
          type: state.modalPresetType,
          hue: state.modalPresetType === 'color' ? state.modalHue : undefined,
          temp: state.modalPresetType === 'white' ? state.modalTemp : undefined
        };
        if (state.modalEditingIndex === null) state.customPresets.push(newPreset);
        else state.customPresets[state.modalEditingIndex] = newPreset;
        localStorage.setItem('tapo_custom_presets', JSON.stringify(state.customPresets));
        renderCustomPresets();
        showToast(state.modalEditingIndex === null ? t('toast.presetAdded') : 'Preset modificato');
        showPresetList();
      });
    }

    // Clear All Presets
    const btnClearAllPresets = document.getElementById('btn-clear-all-presets');
    if (btnClearAllPresets) {
      btnClearAllPresets.addEventListener('click', () => {
        if (state.customPresets.length === 0) {
          showToast(t('presets.noneToDelete'));
          return;
        }
        if (confirm(t('dialogs.deleteAll'))) {
          state.customPresets = [];
          localStorage.setItem('tapo_custom_presets', JSON.stringify(state.customPresets));
          renderCustomPresets();
          renderModalPresetList();
          showToast(t('toast.allDeleted'));
        }
      });
    }

    // 19. Window Resize
    window.addEventListener('resize', () => {
      const activeBtn = state.activeTab === 'white' ? el.tabBtnWhite : el.tabBtnColor;
      updateTabIndicator(activeBtn);
    });

    // 20. Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.debug('ServiceWorker skipped:', err);
        });
      });
    }
  }

  // ==========================================================================
  // App Bootstrapping
  // ==========================================================================
  function init() {
    if (typeof window.onLanguageChange === 'function') window.onLanguageChange(() => {
      renderMainPresets();
      renderManagePresetsList();
      renderCustomPresets();
      applyDeviceCustomizations();
      updateUI();
      if (el.btnPresetRiordina) el.btnPresetRiordina.textContent = state.isReordering ? t('presets.done') : t('presets.reorder');
      if (el.btnNewPreset && el.modalCustomPresetsList) el.btnNewPreset.textContent = el.modalCustomPresetsList.classList.contains('is-reordering') ? t('presets.done') : t('presets.reorder');
    });
    setupListeners();
    applyDeviceCustomizations();
    renderMainPresets();
    renderManagePresetsList();
    renderCustomPresets();
    updateTabIndicator(el.tabBtnWhite);
    updateUI();

    state.pendingLocation = state.deviceLocation;
    state.pendingLanguage = state.language;
    translateUi(state.language);
    renderLocationSelection(state.deviceLocation);
    renderLanguageSelection(state.language);

    // Initial State Fetch
    pollState();
    fetchDeviceInfo();

    // 3s interval polling
    setInterval(pollState, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
