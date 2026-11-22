import { useTranslation } from "react-i18next";
import { Outlet, Route, Routes } from "react-router";
import { BottomNav } from "./components/BottomNav.js";

function Shell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}

// Stands in for each tab until its screen is built.
function ScreenTitle({ label }: { label: "today" | "history" | "insights" | "stock" | "pets" }) {
  const { t } = useTranslation();

  return (
    <header className="px-5 pt-5 pb-3">
      <h1 className="font-display text-display font-semibold">{t(`nav.${label}`)}</h1>
    </header>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<ScreenTitle label="today" />} />
        <Route path="history" element={<ScreenTitle label="history" />} />
        <Route path="insights" element={<ScreenTitle label="insights" />} />
        <Route path="stock" element={<ScreenTitle label="stock" />} />
        <Route path="pets" element={<ScreenTitle label="pets" />} />
      </Route>
    </Routes>
  );
}
