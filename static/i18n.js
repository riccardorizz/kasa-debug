/* Centralized Italian/English translations. UI code should use t() for new text. */
(() => {
  'use strict';

  const dictionary = {
    it: {
      'app.power': 'Accensione', 'app.brightness': 'Luminosità', 'app.white': 'Bianco', 'app.color': 'Colore',
      'presets.title': 'Mio Preset', 'presets.default': 'Preset {index}', 'presets.manage': 'Gestisci preset', 'presets.new': 'Nuovo Preset', 'presets.reorder': 'Riordina', 'presets.done': 'Fatto',
      'presets.saved': 'Preset salvato', 'presets.orderSaved': 'Ordine preset salvato', 'presets.delete': 'Elimina preset', 'presets.deleted': 'Preset eliminato',
      'presets.empty': 'Nessun preset. Tocca "Nuovo Preset" qui sotto per aggiungerne uno.', 'presets.customEmpty': 'Nessun preset personalizzato ancora.',
      'presets.deleteAll': 'Elimina tutti i preset', 'presets.copyCurrent': 'Copia stato attuale della luce', 'presets.add': 'Aggiungi a Mio Preset',
      'presets.updated': 'Preset modificato', 'presets.removed': 'Preset rimosso', 'presets.name': 'Nome Preset (Opzionale)',
      'presets.namePlaceholder': 'Es. Relax, Lettura, Cinema...', 'presets.color': 'Colore Arcobaleno', 'presets.white': 'Tonalità Bianca (Kelvin)',
      'presets.colorRange': 'Tonalità di Colore (0° - 360°)', 'presets.tempRange': 'Temperatura di Colore (2500K - 6500K)',
      'device.settings': 'Impostazioni Dispositivo', 'device.name': 'Nome Dispositivo', 'device.nameTitle': 'Nome del vostro dispositivo',
      'device.nameHint': "Dai un nome al tuo dispositivo per facilitarne l'identificazione.", 'device.namePlaceholder': 'Nome dispositivo',
      'device.location': 'Posizione', 'device.info': 'Informazioni Dispositivo', 'device.language': 'Lingua', 'device.icon': 'Seleziona Icona Dispositivo',
      'device.save': 'Salva', 'device.back': 'Indietro', 'device.custom': 'Personalizza', 'device.roomPlaceholder': 'Inserisci stanza...',
      'device.saved': 'Impostazione salvata', 'device.languageSaved': 'Lingua salvata', 'device.locationSaved': 'Posizione salvata',
      'device.unsaved': 'Modifica non salvata', 'device.smartBulb': 'Lampadina Smart', 'device.bedroom': 'Camera da letto', 'device.livingRoom': 'Soggiorno',
      'device.kitchen': 'Cucina', 'device.studio': 'Studio', 'device.italian': 'Italiano', 'device.english': 'English',
      'device.iconSaved': 'Icona salvata e aggiornata nella schermata Home!', 'device.lastOn': 'Ultimo stato "On"', 'device.customState': 'Personalizzata',
      'errors.bulbUnreachable': 'La lampadina non è raggiungibile.', 'errors.bulbOffline': 'Lampadina non configurata o non raggiungibile.',
      'errors.communication': 'Errore di comunicazione con la lampadina.', 'errors.stateRead': 'Errore nella lettura dello stato della lampadina.',
      'errors.unsaved': 'Modifica non salvata', 'errors.connectionLost': 'Connessione persa', 'errors.generic': 'Si è verificato un errore.',
      'dialogs.deletePreset': 'Eliminare il preset "{name}"?', 'dialogs.deleteAll': 'Eliminare tutti i preset personalizzati?',
      'dialogs.matterCopy': 'Codice Matter copiato negli appunti!', 'dialogs.matterFallback': 'Codice Matter: 3222-804-6472',
      'locations.bedroom': 'Camera da letto', 'locations.livingRoom': 'Soggiorno', 'locations.kitchen': 'Cucina', 'locations.studio': 'Studio',
      'states.on': 'Accendi', 'states.off': 'Spegni', 'states.fadeTitle': 'Accensione/spegnimento graduale dell...',
      'states.fadeOn': 'Luce accesa gradualmente', 'states.fadeOff': 'Luce spenta gradualmente', 'states.recoveryHint': "Quando l'alimentazione si interrompe ma ritorna, vuoi che il dispositivo Tapo:",
      'common.cancel': 'Annulla', 'common.confirm': 'Conferma', 'common.information': 'Informazioni', 'common.party': 'Party', 'common.theme': 'Tema',
      'common.name': 'Nome', 'common.device': 'Dispositivo', 'common.preset': 'Preset', 'common.my': 'Mio',
      'aria.bulb': 'Lampadina', 'aria.power': 'Accendi o spegni la lampadina', 'aria.brightness': 'Regola luminosità', 'aria.temperature': 'Regola temperatura colore', 'aria.hue': 'Regola tonalità colore'
    },
    en: {
      'app.power': 'Power', 'app.brightness': 'Brightness', 'app.white': 'White', 'app.color': 'Color',
      'presets.title': 'My Presets', 'presets.default': 'Preset {index}', 'presets.manage': 'Manage presets', 'presets.new': 'New Preset', 'presets.reorder': 'Reorder', 'presets.done': 'Done',
      'presets.saved': 'Preset saved', 'presets.orderSaved': 'Preset order saved', 'presets.delete': 'Delete preset', 'presets.deleted': 'Preset deleted',
      'presets.empty': 'No presets. Tap "New Preset" below to add one.', 'presets.customEmpty': 'No custom presets yet.',
      'presets.deleteAll': 'Delete all presets', 'presets.copyCurrent': 'Copy current light state', 'presets.add': 'Add to My Presets',
      'presets.updated': 'Preset updated', 'presets.removed': 'Preset removed', 'presets.name': 'Preset Name (Optional)',
      'presets.namePlaceholder': 'E.g. Relax, Reading, Cinema...', 'presets.color': 'Rainbow Color', 'presets.white': 'White Temperature (Kelvin)',
      'presets.colorRange': 'Color Hue (0° - 360°)', 'presets.tempRange': 'Color Temperature (2500K - 6500K)',
      'device.settings': 'Device Settings', 'device.name': 'Device Name', 'device.nameTitle': 'Your device name',
      'device.nameHint': 'Name your device to make it easier to identify.', 'device.namePlaceholder': 'Device name',
      'device.location': 'Location', 'device.info': 'Device Information', 'device.language': 'Language', 'device.icon': 'Select Device Icon',
      'device.save': 'Save', 'device.back': 'Back', 'device.custom': 'Custom', 'device.roomPlaceholder': 'Enter room...',
      'device.saved': 'Setting saved', 'device.languageSaved': 'Language saved', 'device.locationSaved': 'Location saved',
      'device.unsaved': 'Unsaved change', 'device.smartBulb': 'Smart Bulb', 'device.bedroom': 'Bedroom', 'device.livingRoom': 'Living room',
      'device.kitchen': 'Kitchen', 'device.studio': 'Studio', 'device.italian': 'Italiano', 'device.english': 'English',
      'device.iconSaved': 'Icon saved and updated on the Home screen!', 'device.lastOn': 'Last "On" state', 'device.customState': 'Custom',
      'errors.bulbUnreachable': 'The bulb is unreachable.', 'errors.bulbOffline': 'The bulb is not configured or unreachable.',
      'errors.communication': 'Communication error with the bulb.', 'errors.stateRead': 'Error reading the bulb state.',
      'errors.unsaved': 'Unsaved change', 'errors.connectionLost': 'Connection lost', 'errors.generic': 'An error occurred.',
      'dialogs.deletePreset': 'Delete preset "{name}"?', 'dialogs.deleteAll': 'Delete all custom presets?',
      'dialogs.matterCopy': 'Matter code copied to clipboard!', 'dialogs.matterFallback': 'Matter code: 3222-804-6472',
      'locations.bedroom': 'Bedroom', 'locations.livingRoom': 'Living room', 'locations.kitchen': 'Kitchen', 'locations.studio': 'Studio',
      'states.on': 'Turn on', 'states.off': 'Turn off', 'states.fadeTitle': 'Gradual turn on/off...',
      'states.fadeOn': 'Turn on gradually', 'states.fadeOff': 'Turn off gradually', 'states.recoveryHint': 'When power is interrupted and returns, should the Tapo device:',
      'common.cancel': 'Cancel', 'common.confirm': 'Confirm', 'common.information': 'Information', 'common.party': 'Party', 'common.theme': 'Theme',
      'common.name': 'Name', 'common.device': 'Device', 'common.preset': 'Preset', 'common.my': 'My',
      'aria.bulb': 'Bulb', 'aria.power': 'Turn the bulb on or off', 'aria.brightness': 'Adjust brightness', 'aria.temperature': 'Adjust color temperature', 'aria.hue': 'Adjust color hue'
    }
  };

  const legacy = {};
  Object.keys(dictionary.it).forEach(key => {
    legacy[dictionary.it[key]] = key;
    legacy[dictionary.en[key]] = key;
  });

  let language = 'it';
  const callbacks = new Set();
  const browserLanguage = (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'it';

  function t(key, params = {}) {
    if (language === 'xx') return `[[${key}]]`;
    const value = dictionary[language]?.[key];
    if (value === undefined) {
      console.warn(`[i18n] Missing translation key: ${key}`);
      return key;
    }
    return value.replace(/\{(\w+)\}/g, (_, name) => params[name] === undefined ? `{${name}}` : String(params[name]));
  }

  function applyDomTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-aria]').forEach(node => { node.setAttribute('aria-label', t(node.dataset.i18nAria)); });
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (!node.parentElement || node.parentElement.closest('script,style')) return;
      const original = node.nodeValue.trim();
      const key = legacy[original];
      if (key) {
        if (node.parentElement.childNodes.length === 1) node.parentElement.dataset.i18n = key;
        node.nodeValue = node.nodeValue.replace(original, t(key));
      }
    });
    document.querySelectorAll('[title]').forEach(node => {
      const key = legacy[node.getAttribute('title')];
      if (key) node.setAttribute('title', t(key));
    });
  }

  function setLanguage(nextLanguage) {
    language = nextLanguage === 'xx' ? 'xx' : (nextLanguage === 'en' ? 'en' : 'it');
    if (language !== 'xx') localStorage.setItem('tapo_language', language);
    document.documentElement.lang = language === 'xx' ? 'en' : language;
    applyDomTranslations();
    callbacks.forEach(callback => callback(language));
    applyDomTranslations();
    return language;
  }

  function onLanguageChange(callback) { callbacks.add(callback); return () => callbacks.delete(callback); }
  function getLanguage() { return language; }
  function registerI18nKey(node, key) { if (node) node.dataset.i18n = key; }

  window.t = t;
  window.setLanguage = setLanguage;
  window.onLanguageChange = onLanguageChange;
  window.getLanguage = getLanguage;
  window.registerI18nKey = registerI18nKey;
  window.i18nDictionary = dictionary;
  setLanguage(localStorage.getItem('tapo_language') || browserLanguage);
})();
