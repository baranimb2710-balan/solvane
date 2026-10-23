/**
 * Lightweight, robust drop-in i18next implementation for Solvane.
 * Fully compatible with react-i18next APIs without requiring external npm bundle.
 */

class I18nEventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, ...args) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => {
      try {
        cb(...args);
      } catch (err) {
        console.error('i18next event error:', err);
      }
    });
  }
}

class I18nInstance extends I18nEventEmitter {
  constructor() {
    super();
    this.language = 'en';
    this.fallbackLng = 'en';
    this.resources = {};
    this.isInitialized = false;
  }

  use(plugin) {
    if (plugin && typeof plugin.init === 'function') {
      plugin.init(this);
    }
    return this;
  }

  init(options = {}) {
    this.resources = options.resources || {};
    this.fallbackLng = options.fallbackLng || 'en';

    // Check localStorage or default
    const savedLng = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('solvane_language') || localStorage.getItem('i18nextLng') || options.lng || 'en')
      : (options.lng || 'en');

    this.language = savedLng;
    this.isInitialized = true;

    if (typeof document !== 'undefined') {
      document.documentElement.lang = this.language;
    }

    this.emit('initialized', options);
    return Promise.resolve(this.t.bind(this));
  }

  changeLanguage(lng) {
    const nextLng = (lng === 'ta' || lng === 'ta-IN') ? 'ta' : 'en';
    if (this.language === nextLng) return Promise.resolve(this.t.bind(this));

    this.language = nextLng;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('solvane_language', nextLng);
      localStorage.setItem('i18nextLng', nextLng);
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = nextLng;
    }

    this.emit('languageChanged', nextLng);
    return Promise.resolve(this.t.bind(this));
  }

  _getNestedValue(obj, path) {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = path.split('.');
    let curr = obj;
    for (const part of parts) {
      if (curr && typeof curr === 'object' && part in curr) {
        curr = curr[part];
      } else {
        return undefined;
      }
    }
    return curr;
  }

  t(key, options = {}) {
    if (!key) return '';

    const currentLng = this.language || 'en';
    const fallback = this.fallbackLng || 'en';

    // Try current language translation
    const currentRes = this.resources[currentLng]?.translation || this.resources[currentLng];
    let val = this._getNestedValue(currentRes, key);

    // If not found, try fallback language
    if (val === undefined && currentLng !== fallback) {
      const fallbackRes = this.resources[fallback]?.translation || this.resources[fallback];
      val = this._getNestedValue(fallbackRes, key);
    }

    // If still not found, return defaultValue or the last key segment
    if (val === undefined) {
      if (options.defaultValue !== undefined) return options.defaultValue;
      // Do not return raw path if key has dots, return friendly fallback or last segment
      const segments = key.split('.');
      return segments[segments.length - 1];
    }

    if (typeof val !== 'string') {
      return val;
    }

    // Interpolation: {{var}} or {var}
    let result = val;
    if (options && typeof options === 'object') {
      Object.keys(options).forEach(optKey => {
        if (optKey === 'defaultValue' || optKey === 'count') return;
        const patternDouble = new RegExp(`\\{\\{\\s*${optKey}\\s*\\}\\}`, 'g');
        const patternSingle = new RegExp(`\\{\\s*${optKey}\\s*\\}`, 'g');
        const repVal = options[optKey] !== undefined ? String(options[optKey]) : '';
        result = result.replace(patternDouble, repVal).replace(patternSingle, repVal);
      });
      // Handle count interpolation if present
      if (options.count !== undefined) {
        result = result.replace(/\{\{\s*count\s*\}\}/g, String(options.count))
                       .replace(/\{\s*count\s*\}/g, String(options.count));
      }
    }

    return result;
  }
}

const i18n = new I18nInstance();
export default i18n;
