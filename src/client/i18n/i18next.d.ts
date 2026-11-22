import type enGB from "./locales/en-GB.json";

declare module "i18next" {
  interface CustomTypeOptions {
    resources: { translation: typeof enGB };
  }
}
