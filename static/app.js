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

    // Local Persistent Settings (Customizations)
    deviceName: localStorage.getItem('tapo_device_name') || 'Lampadina Smart',
    deviceLocation: localStorage.getItem('tapo_device_location') || 'Camera da letto',
    deviceIcon: localStorage.getItem('tapo_device_icon') || 'bulb',
    defaultOnState: localStorage.getItem('tapo_default_on') || 'last-on',
    defaultRecovery: localStorage.getItem('tapo_default_recovery') || 'turn-on',
    fadeOn: localStorage.getItem('tapo_fade_on') === 'true',
    fadeOff: localStorage.getItem('tapo_fade_off') === 'true',

    // User Saved Presets
    customPresets: JSON.parse(localStorage.getItem('tapo_custom_presets') || '[]'),

    // Modal Builder Temporary State
    modalPresetType: 'color', // 'color' | 'white'
    modalHue: 180,
    modalTemp: 3200
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
    btnBackHome: document.getElementById('btn-back-home'),

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
    settingValueLocation: document.getElementById('setting-value-location'),
    settingRowDefaultState: null,
    settingValueDefaultState: null,
    settingRowFade: null,
    settingValueFade: null,
    settingRowGroups: document.getElementById('setting-row-groups'),
    settingRowSmartActions: null,
    settingRowInfo: document.getElementById('setting-row-info'),
    settingRowMatter: null,
    settingRowFirmware: null,
    btnRemoveDevice: document.getElementById('btn-remove-device'),
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOfflineState(false);
      return await res.json();
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
    const modelEl = document.getElementById('info-device-model');
    const ipEl = document.getElementById('info-device-ip');
    const macEl = document.getElementById('info-device-mac');
    const hwEl = document.getElementById('info-device-hw');
    const rssiEl = document.getElementById('info-device-rssi');

    if (modelEl && data.model) modelEl.textContent = data.model;
    if (ipEl && data.host) ipEl.textContent = data.host;
    if (macEl && data.mac) macEl.textContent = data.mac;
    if (hwEl && data.hw_version) hwEl.textContent = data.hw_version;
    if (rssiEl && typeof data.rssi === 'number') {
      rssiEl.textContent = `${data.rssi} dBm (${data.rssi > -60 ? 'Eccellente' : 'Buono'})`;
    }
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
      el.whiteTempIndicator.style.opacity = '0';
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
  // Custom Presets Management
  // ==========================================================================
  function renderCustomPresets() {
    if (!el.customPresetsContainer) return;
    el.customPresetsContainer.innerHTML = '';

    state.customPresets.forEach((preset, index) => {
      const btn = document.createElement('button');
      btn.className = 'preset-item';
      btn.title = preset.name || (preset.type === 'color' ? `Colore ${preset.hue}°` : `Bianco ${preset.temp}K`);

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
          if (confirm(`Eliminare il preset "${btn.title}"?`)) {
            state.customPresets.splice(index, 1);
            localStorage.setItem('tapo_custom_presets', JSON.stringify(state.customPresets));
            renderCustomPresets();
            showToast('Preset rimosso');
          }
        }, 800);
      });
      btn.addEventListener('pointerup', () => clearTimeout(pressTimer));
      btn.addEventListener('pointercancel', () => clearTimeout(pressTimer));

      el.customPresetsContainer.appendChild(btn);
    });

    // Also update modal manage list if it's open
    renderModalPresetList();
  }

  function renderModalPresetList() {
    const listEl = document.getElementById('modal-custom-presets-list');
    const hintEl = document.getElementById('modal-no-presets-hint');
    if (!listEl) return;

    // Clear existing preset rows in modal (keep the hint)
    listEl.querySelectorAll('.modal-preset-row').forEach(r => r.remove());

    if (state.customPresets.length === 0) {
      if (hintEl) hintEl.style.display = '';
    } else {
      if (hintEl) hintEl.style.display = 'none';
      state.customPresets.forEach((preset, index) => {
        const row = document.createElement('div');
        row.className = 'modal-preset-row';

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
        label.textContent = preset.name || (preset.type === 'color' ? `Colore ${preset.hue}°` : `Bianco ${preset.temp}K`);

        const delBtn = document.createElement('button');
        delBtn.className = 'modal-preset-del-btn';
        delBtn.setAttribute('aria-label', 'Elimina preset');
        delBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        delBtn.addEventListener('click', () => {
          state.customPresets.splice(index, 1);
          localStorage.setItem('tapo_custom_presets', JSON.stringify(state.customPresets));
          renderCustomPresets();
          showToast('Preset eliminato');
        });

        row.appendChild(swatch);
        row.appendChild(label);
        row.appendChild(delBtn);
        listEl.appendChild(row);
      });
    }
  }

  function updateModalSwatch() {
    if (state.modalPresetType === 'color') {
      const hue = state.modalHue;
      el.modalSwatchPreview.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
      el.modalPresetTag.textContent = 'Colore HSV';
      el.modalPresetValText.textContent = `Tonalità: ${hue}°`;
    } else {
      const temp = state.modalTemp;
      const rgb = kelvinToRgb(temp);
      el.modalSwatchPreview.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      el.modalPresetTag.textContent = 'Luce Bianca (Kelvin)';
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
      <svg id="hero-bulb-svg" class="hero-bulb-svg" viewBox="0 0 160 210" aria-label="Lampadina">
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

  function applyDeviceCustomizations() {
    // 0. Render Device Icon both in Hero Home and in Settings Thumb
    renderDeviceIcon(state.deviceIcon || 'bulb');

    // 1. Name
    const name = state.deviceName || 'Lampadina Smart';
    if (el.heroDeviceName) {
      el.heroDeviceName.innerHTML = name.replace(' ', '<br>');
    }
    if (el.settingValueName) el.settingValueName.textContent = name;
    if (el.inputDeviceName) el.inputDeviceName.value = name;

    // 2. Location
    const loc = state.deviceLocation || 'Camera da letto';
    if (el.heroDeviceLocation) el.heroDeviceLocation.textContent = loc;
    if (el.settingValueLocation) el.settingValueLocation.textContent = loc;

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
  // Setup Event Listeners
  // ==========================================================================
  function setupListeners() {
    // 1. Navigation Back Buttons
    document.querySelectorAll('.btn-view-back').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        if (target) {
          showView(target, false);
        } else {
          goBack();
        }
      });
    });

    if (el.btnBackHome) {
      el.btnBackHome.addEventListener('click', () => {
        showToast('Schermata principale');
      });
    }

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
      el.settingRowLocation.addEventListener('click', () => showView('view-location'));
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
        showToast("La verifica e l'aggiornamento firmware sono gestiti dall'app ufficiale Tapo.");
      });
    }
    if (el.rowShareDevice) {
      el.rowShareDevice.addEventListener('click', () => {
        showToast("La condivisione dispositivi Tapo Cloud è configurabile tramite l'app ufficiale.");
      });
    }

    // (Removed sections: 2x2 grid, smart actions home card, footer menu)

    if (el.btnRemoveDevice) {
      el.btnRemoveDevice.addEventListener('click', () => {
        if (confirm('Vuoi rimuovere questo dispositivo e resettare le impostazioni locali della PWA?')) {
          localStorage.removeItem('tapo_device_name');
          localStorage.removeItem('tapo_device_location');
          localStorage.removeItem('tapo_device_icon');
          localStorage.removeItem('tapo_default_on');
          localStorage.removeItem('tapo_default_recovery');
          localStorage.removeItem('tapo_fade_on');
          localStorage.removeItem('tapo_fade_off');
          localStorage.removeItem('tapo_custom_presets');
          state.deviceName = 'Lampadina Smart';
          state.deviceLocation = 'Camera da letto';
          state.deviceIcon = 'bulb';
          applyDeviceCustomizations();
          showToast('Dispositivo e personalizzazioni locali resettati.');
          showView('view-main', false);
        }
      });
    }

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
        showToast('Icona salvata e aggiornata nella schermata Home!');
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
          showToast('Nome salvato');
          showView('view-settings', false);
        }
      });
    }

    // 6. Subview: Location
    document.querySelectorAll('.location-row').forEach(row => {
      row.addEventListener('click', () => {
        const loc = row.dataset.location;
        state.deviceLocation = loc;
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

    if (el.btnSaveLocation) {
      el.btnSaveLocation.addEventListener('click', () => {
        const custom = el.inputCustomLocation.value.trim();
        if (custom) {
          state.deviceLocation = custom;
        }
        localStorage.setItem('tapo_device_location', state.deviceLocation);
        applyDeviceCustomizations();
        showToast('Posizione salvata');
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
        showToast('Preferenza salvata');
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
        showToast("I gruppi di dispositivi sono sincronizzati tramite l'app ufficiale Tapo.");
      });
    }
    if (el.btnAddSmartAction || el.btnShortcutMenu) {
      const handler = () => showToast("Le automazioni smart avanzate sono configurabili nell'app ufficiale Tapo.");
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
        try {
          await navigator.clipboard.writeText('3222-804-6472');
          showToast('Codice Matter copiato negli appunti!');
        } catch (_) {
          showToast('Codice Matter: 3222-804-6472');
        }
      });
    }

    if (el.btnSaveMatterQr) {
      el.btnSaveMatterQr.addEventListener('click', () => {
        showToast('Codice QR Matter pronto per il salvataggio!');
      });
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

    // 17. Custom Color Preset Manager Modal
    if (el.btnManagePresets) {
      el.btnManagePresets.addEventListener('click', () => {
        el.modalCustomPreset.classList.remove('hidden');
        renderModalPresetList();
        updateModalSwatch();
      });
    }

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
        showToast('Impostazione luce copiata!');
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
        state.customPresets.push(newPreset);
        localStorage.setItem('tapo_custom_presets', JSON.stringify(state.customPresets));
        renderCustomPresets();
        renderModalPresetList();
        el.modalPresetName.value = '';
        showToast('Nuovo preset aggiunto a "Mio Preset"!');
      });
    }

    // Clear All Presets
    const btnClearAllPresets = document.getElementById('btn-clear-all-presets');
    if (btnClearAllPresets) {
      btnClearAllPresets.addEventListener('click', () => {
        if (state.customPresets.length === 0) {
          showToast('Nessun preset personalizzato da eliminare.');
          return;
        }
        if (confirm('Eliminare tutti i preset personalizzati?')) {
          state.customPresets = [];
          localStorage.setItem('tapo_custom_presets', JSON.stringify(state.customPresets));
          renderCustomPresets();
          renderModalPresetList();
          showToast('Tutti i preset eliminati.');
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
    setupListeners();
    applyDeviceCustomizations();
    renderCustomPresets();
    updateTabIndicator(el.tabBtnWhite);
    updateUI();

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
