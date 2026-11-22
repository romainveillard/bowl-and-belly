import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";
import enGB from "./locales/en-GB.json";
import fr from "./locales/fr.json";

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
});

void i18n
  .use(ICU)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "en-GB": { translation: enGB },
      fr: { translation: fr },
    },
    fallbackLng: "en-GB",
    supportedLngs: ["en-GB", "fr"],
    detection: {
      order: ["localStorage", "navigator"],
      // Only an explicit choice is stored; otherwise the browser language
      // keeps being followed.
      caches: [],
    },
    interpolation: { escapeValue: false },
  });
