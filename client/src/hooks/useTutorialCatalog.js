import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { tutorialsAPI } from "../services/api";

export function useTutorialCatalog() {
  const query = useQuery({
    queryKey: ["tutorial-catalog"],
    queryFn: async () => {
      const data = await tutorialsAPI.getCatalog();
      return data?.byKey || {};
    },
    staleTime: 60_000,
  });

  const byKey = query.data || {};

  const getTutorial = useMemo(
    () => (slotKey, fallbackTitle = "Tutorial") => {
      const item = byKey?.[slotKey];
      if (!item?.exists || !item?.url) return null;
      return { title: item.label || fallbackTitle, videoUrl: item.url };
    },
    [byKey],
  );

  return {
    ...query,
    byKey,
    getTutorial,
  };
}
