import React, { useState, useEffect, useContext, createContext } from 'react';
import defaultI18n from './i18next';

export const I18nContext = createContext(defaultI18n);

export const initReactI18next = {
  type: '3rdParty',
  init(instance) {
    // No-op for lightweight binding
  }
};

export function I18nextProvider({ i18n = defaultI18n, children }) {
  return React.createElement(I18nContext.Provider, { value: i18n }, children);
}

export function useTranslation(ns, options = {}) {
  const i18nInstance = useContext(I18nContext) || defaultI18n;
  const [currentLng, setCurrentLng] = useState(i18nInstance.language || 'en');

  useEffect(() => {
    const handleLngChange = (newLng) => {
      setCurrentLng(newLng);
    };

    const unsubscribe = i18nInstance.on('languageChanged', handleLngChange);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      else i18nInstance.off('languageChanged', handleLngChange);
    };
  }, [i18nInstance]);

  const t = (key, tOptions) => {
    return i18nInstance.t(key, tOptions);
  };

  return {
    t,
    i18n: i18nInstance,
    ready: i18nInstance.isInitialized
  };
}

export function Trans({ children }) {
  return children;
}
