import { useQuery } from "@tanstack/react-query";
import { api } from "./api.js";

export function App() {
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
      <output>{health.data?.status}</output>
    </main>
  );
}
