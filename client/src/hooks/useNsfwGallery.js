import { useQuery } from "@tanstack/react-query";
import { usePageVisibility } from "./usePageVisibility";
import api from "../services/api";

export function useNsfwGallery(modelId, page = 1, pageSize = 24) {
  const isPageVisible = usePageVisibility();

  const galleryQuery = useQuery({
    queryKey: ["nsfw-gallery", modelId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: "nsfw",
        status: "completed",
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      if (modelId) {
        params.set("modelId", modelId);
      }
      const response = await api.get(`/generations?${params}`);
      return {
        generations: response.data.generations || [],
        pagination: response.data.pagination || { total: 0 },
      };
    },
    enabled: true,
    refetchInterval: isPageVisible ? 8000 : false,
    refetchIntervalInBackground: false,
    staleTime: 5000,
  });

  const processingQuery = useQuery({
    queryKey: ["nsfw-processing", modelId],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: "nsfw",
        status: "processing,pending",
        limit: "50",
      });
      if (modelId) {
        params.set("modelId", modelId);
      }
      const response = await api.get(`/generations?${params}`);
      return response.data.generations || [];
    },
    enabled: true,
    refetchInterval: isPageVisible ? 5000 : false,
    refetchIntervalInBackground: false,
    staleTime: 3000,
  });

  return {
    data: galleryQuery.data,
    isLoading: galleryQuery.isLoading,
    processingCount: processingQuery.data?.length || 0,
  };
}
