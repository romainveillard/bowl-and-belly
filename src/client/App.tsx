import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "./api.js";

export function App() {
  const { t } = useTranslation();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await api.api.health.$get();
      return response.json();
    },
  });

  return (
    <main>
      <h1>Bowl &amp; Belly</h1>
      <p>{t("app.tagline")}</p>
      <output>{health.data?.status}</output>
    </main>
  );
}
