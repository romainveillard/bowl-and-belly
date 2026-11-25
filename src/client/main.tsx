import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App.js";
import { SnackbarProvider } from "./components/ui/feedback/Snackbar.js";
import { i18nReady } from "./i18n/index.js";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

// A tab opened before an upgrade asks for screens the new build no longer has.
// One reload picks up the new build; the stamp stops a loop when a screen is
// missing for another reason, and without storage there is no reload at all.
window.addEventListener("vite:preloadError", (event) => {
  const key = "reloadedForUpdateAt";
  try {
    if (Date.now() - Number(sessionStorage.getItem(key)) < 60_000) {
      return;
    }
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  location.reload();
});

// Many components read the same queries, settings in about twenty places, so a
// short freshness window stops each new one from refetching. Focus still
// refetches anything older, so changes from another device arrive.
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

// UI review annotations, for development only: the constant condition lets
// the production build drop the import, so the package never ships.
const Agentation = import.meta.env.DEV
  ? lazy(() => import("agentation").then((module) => ({ default: module.Agentation })))
  : null;

// The first screen waits for its language, which now loads on its own.
await i18nReady;

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SnackbarProvider>
          <Suspense fallback={null}>
            <App />
          </Suspense>
        </SnackbarProvider>
      </BrowserRouter>
    </QueryClientProvider>
    {Agentation && (
      <Suspense fallback={null}>
        <Agentation />
      </Suspense>
    )}
  </StrictMode>,
);
