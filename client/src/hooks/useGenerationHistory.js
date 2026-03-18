import { useQuery } from "@tanstack/react-query";
import { usePageVisibility } from "./usePageVisibility";
import api from "../services/api";

/**
 * Fetch generation history for a specific type
 * Shows last N generations
 *
 * @param {string} type - Generation type: 'image', 'prompt-based', 'video', 'faceswap'
 * @param {number} limit - Number of generations to fetch (default: 5)
 * @returns {object} Query result with generations array
 */
export function useGenerationHistory(type, limit = 5) {
  const isPageVisible = usePageVisibility();

  return useQuery({
    queryKey: ["generations", type, limit],
    queryFn: async () => {
      // Guard: Don't fetch if type is missing
      if (!type) {
        return [];
      }

      const params = new URLSearchParams({
        type,
        limit: String(limit),
      });

      // Use centralized api helper (includes auth interceptors and /api/ prefix)
      const response = await api.get(`/generations?${params}`);
      return response.data.generations || [];
    },
    enabled: !!type, // Only run query if type is provided
    refetchInterval: isPageVisible ? 5000 : false,
    refetchIntervalInBackground: false,
    staleTime: 3000,
  });
}
