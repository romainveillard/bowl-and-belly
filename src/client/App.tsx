import { useTranslation } from "react-i18next";
import { Outlet, Route, Routes } from "react-router";
import { BottomNav, Sidebar } from "./components/Navigation.js";
import { ArchivedPetsScreen } from "./screens/ArchivedPetsScreen.js";
import { PetFormScreen } from "./screens/PetFormScreen.js";
import { PetsScreen } from "./screens/PetsScreen.js";
import { TodayScreen } from "./screens/TodayScreen.js";

// Forms take the whole phone screen, with their own action bar in place of the tabs.
function Shell({ bottomNav = true }: { bottomNav?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col desktop:grid desktop:grid-cols-[248px_1fr]">
      <Sidebar />
      <div className="flex-1 desktop:w-full desktop:max-w-[1120px] desktop:px-10 desktop:py-8">
        <Outlet />
      </div>
      {bottomNav && <BottomNav />}
    </div>
  );
}

// Stands in for each tab until its screen is built.
function ScreenTitle({ label }: { label: "history" | "insights" | "stock" | "settings" }) {
  const { t } = useTranslation();

  return (
    <header className="px-5 pt-5 pb-3 desktop:p-0">
      <h1 className="font-display text-display font-semibold desktop:text-[34px] desktop:leading-10">
        {t(`nav.${label}`)}
      </h1>
    </header>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<TodayScreen />} />
        <Route path="history" element={<ScreenTitle label="history" />} />
        <Route path="insights" element={<ScreenTitle label="insights" />} />
        <Route path="stock" element={<ScreenTitle label="stock" />} />
        <Route path="pets" element={<PetsScreen />} />
        <Route path="pets/archived" element={<ArchivedPetsScreen />} />
        <Route path="pets/:petId" element={<PetsScreen />} />
        <Route path="settings" element={<ScreenTitle label="settings" />} />
      </Route>
      <Route element={<Shell bottomNav={false} />}>
        <Route path="pets/new" element={<PetFormScreen />} />
        <Route path="pets/:petId/edit" element={<PetFormScreen />} />
      </Route>
    </Routes>
  );
}
