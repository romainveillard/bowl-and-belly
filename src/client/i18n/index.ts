import i18n, { type BackendModule, type ResourceKey } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";

const SUPPORTED = ["en-GB", "fr"];

// Each locale is its own chunk, so only the language in use is downloaded.
const locales: BackendModule = {
  type: "backend",
  init: () => undefined,
  read: (language, _namespace, done) => {
    import(`./locales/${language}.json`).then(
      (module: { default: ResourceKey }) => done(null, module.default),
      (error: unknown) => done(error instanceof Error ? error : new Error(String(error)), false),
    );
  },
};

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
});

/** Settles once the active language has loaded; render after it. */
export const i18nReady = i18n
  .use(ICU)
  .use(locales)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // English only for languages the app doesn't have. A fixed fallback would
    // also download English beside French; locales.test.ts keeps them complete.
    fallbackLng: (code) => (SUPPORTED.includes(code) ? [] : ["en-GB"]),
    supportedLngs: SUPPORTED,
    load: "currentOnly",
    detection: {
      order: ["localStorage", "navigator"],
      // Only an explicit choice is stored; otherwise the browser language
      // keeps being followed.
      caches: [],
    },
    interpolation: { escapeValue: false },
  });
