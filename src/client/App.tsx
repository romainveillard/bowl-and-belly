import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, Route, Routes } from "react-router";
import { DemoBanner } from "./components/DemoBanner.js";
import { EmptyState } from "./components/EmptyState.js";
import { RouteAnnouncer } from "./components/RouteAnnouncer.js";
import { SaveErrorNotice } from "./components/SaveErrorNotice.js";
import { HistoryIcon, InsightsIcon } from "./components/icons.js";
import { BottomNav, Sidebar } from "./components/Navigation.js";
import { useSnackbar } from "./components/ui/feedback/Snackbar.js";
import { onDemoLimit, onUnreachable, useAccess } from "./access/access.js";
import { useAuth } from "./access/auth.js";
import { useDemo } from "./lib/instance.js";
import { usePets } from "./pets/pets.js";
import { LoginScreen } from "./access/LoginScreen.js";
import { SessionExpiredScreen } from "./access/SessionExpiredScreen.js";
import { HistoryScreen } from "./feeds/HistoryScreen.js";
import { PetsScreen } from "./pets/PetsScreen.js";
import { StockScreen } from "./stock/StockScreen.js";
import { TodayScreen } from "./feeds/TodayScreen.js";

// Forms, Settings and the archives are opened now and then, so they load when first visited.
const ArchivedFoodsScreen = lazy(() =>
  import("./stock/ArchivedFoodsScreen.js").then((module) => ({
    default: module.ArchivedFoodsScreen,
  })),
);
const ArchivedPetsScreen = lazy(() =>
  import("./pets/ArchivedPetsScreen.js").then((module) => ({ default: module.ArchivedPetsScreen })),
);
const FoodFormScreen = lazy(() =>
  import("./stock/FoodFormScreen.js").then((module) => ({ default: module.FoodFormScreen })),
);
const PetFormScreen = lazy(() =>
  import("./pets/PetFormScreen.js").then((module) => ({ default: module.PetFormScreen })),
);
const SettingsScreen = lazy(() =>
  import("./settings/SettingsScreen.js").then((module) => ({ default: module.SettingsScreen })),
);
const PetTypesScreen = lazy(() =>
  import("./settings/TypesScreen.js").then((module) => ({ default: module.PetTypesScreen })),
);
const FoodTypesScreen = lazy(() =>
  import("./settings/TypesScreen.js").then((module) => ({ default: module.FoodTypesScreen })),
);

// The charting library only loads with the screen that needs it.
const InsightsScreen = lazy(() =>
  import("./insights/InsightsScreen.js").then((module) => ({ default: module.InsightsScreen })),
);

// Forms and Settings take the whole phone screen, without the tabs.
function Shell({ bottomNav = true }: { bottomNav?: boolean }) {
  const { t } = useTranslation();
  const demo = useDemo();

  return (
    <div className="flex min-h-dvh flex-col desktop:grid desktop:grid-cols-[248px_1fr]">
      <a
        href="#main"
        className="sr-only rounded-lg bg-card px-4 py-2.5 font-semibold inset-ring inset-ring-border focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-40"
      >
        {t("nav.skipToContent")}
      </a>
      <Sidebar />
      <div className="flex-1 desktop:w-full desktop:max-w-[1120px] desktop:px-10 desktop:py-8">
        {demo && <DemoBanner />}
        <main id="main" tabIndex={-1} className="focus:outline-none">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>
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

// Unlike an expired session, a lost connection leaves the screen usable.
function ConnectionNotice() {
  const { t } = useTranslation();
  const showSnackbar = useSnackbar();

  useEffect(() => onUnreachable(() => showSnackbar(t("network.unreachable"))), [showSnackbar, t]);
  useEffect(() => onDemoLimit(() => showSnackbar(t("demo.limit"))), [showSnackbar, t]);
  return null;
}

// Login and session expiry replace the whole app, navigation included.
function AccessGate({ children }: { children: ReactNode }) {
  const access = useAccess();
  const { data: auth } = useAuth();

  if (access === "expired") {
    return <SessionExpiredScreen />;
  }
  if (access === "login" || auth?.signedIn === false) {
    return <LoginScreen />;
  }
  return auth ? children : null;
}

export function App() {
  return (
    <>
      <ConnectionNotice />
      <RouteAnnouncer />
      <SaveErrorNotice />
      <AccessGate>
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
            <Route path="settings/pet-types" element={<PetTypesScreen />} />
            <Route path="settings/food-types" element={<FoodTypesScreen />} />
          </Route>
        </Routes>
      </AccessGate>
    </>
  );
}
