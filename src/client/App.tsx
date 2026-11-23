import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Route, Routes } from "react-router";
import { EmptyState } from "./components/EmptyState.js";
import { HistoryIcon, InsightsIcon } from "./components/icons.js";
import { BottomNav, Sidebar } from "./components/Navigation.js";
import { usePets } from "./lib/pets.js";
import { ArchivedFoodsScreen } from "./screens/ArchivedFoodsScreen.js";
import { ArchivedPetsScreen } from "./screens/ArchivedPetsScreen.js";
import { FoodFormScreen } from "./screens/FoodFormScreen.js";
import { HistoryScreen } from "./screens/HistoryScreen.js";
import { PetFormScreen } from "./screens/PetFormScreen.js";
import { PetsScreen } from "./screens/PetsScreen.js";
import { SettingsScreen } from "./screens/SettingsScreen.js";
import { StockScreen } from "./screens/StockScreen.js";
import { TodayScreen } from "./screens/TodayScreen.js";
import { TypesScreen } from "./screens/TypesScreen.js";

// The charting library only loads with the screen that needs it.
const InsightsScreen = lazy(() =>
  import("./screens/InsightsScreen.js").then((module) => ({ default: module.InsightsScreen })),
);

// Forms and Settings take the whole phone screen, without the tabs.
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

// History and Insights have nothing to show before the first pet.
function PetTab({ tab }: { tab: "history" | "insights" }) {
  const { t } = useTranslation();
  const { data: pets } = usePets();

  if (!pets) {
    return null;
  }
  if (pets.pets.length > 0) {
    return tab === "history" ? (
      <HistoryScreen />
    ) : (
      <Suspense fallback={null}>
        <InsightsScreen />
      </Suspense>
    );
  }
  return (
    <EmptyState
      heading={t(`nav.${tab}`)}
      icon={tab === "history" ? <HistoryIcon size={30} /> : <InsightsIcon size={30} />}
      title={t(`${tab}.emptyTitle`)}
      body={t(`${tab}.emptyBody`)}
      action={{ to: "/pets/new", label: t("today.addFirstPet") }}
    />
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<TodayScreen />} />
        <Route path="history" element={<PetTab tab="history" />} />
        <Route path="insights" element={<PetTab tab="insights" />} />
        <Route path="stock" element={<StockScreen />} />
        <Route path="stock/archived" element={<ArchivedFoodsScreen />} />
        <Route path="pets" element={<PetsScreen />} />
        <Route path="pets/archived" element={<ArchivedPetsScreen />} />
        <Route path="pets/:petId" element={<PetsScreen />} />
      </Route>
      <Route element={<Shell bottomNav={false} />}>
        <Route path="pets/new" element={<PetFormScreen />} />
        <Route path="pets/:petId/edit" element={<PetFormScreen />} />
        <Route path="stock/new" element={<FoodFormScreen />} />
        <Route path="stock/:foodId/edit" element={<FoodFormScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
        <Route path="settings/pet-types" element={<TypesScreen kind="pet" />} />
        <Route path="settings/food-types" element={<TypesScreen kind="food" />} />
      </Route>
    </Routes>
  );
}
