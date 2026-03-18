import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuthStore } from "../store";

/**
 * useCachedModels - Cached models hook with React Query
 *
 * - Only runs when user is authenticated (avoids empty load when auth isn't ready)
 * - Cache persists across page navigations (staleTime: 30s)
 * - One-time refetch when first result is empty (mitigates auth/session race)
 * - Auto-refetch in background when stale
 */
export function useCachedModels() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const refetchedEmptyOnce = useRef(false);

  const { data, isLoading, refetch, isFetching, isError, error } = useQuery({
    queryKey: ["/api/models", userId ?? "anon"],
    queryFn: async () => {
      const response = await api.get("/models");
      if (response.data.success && response.data.models) {
        return { models: response.data.models };
      }
      return { models: [] };
    },
    staleTime: 30000, // 30s - won't refetch if data is less than 30s old
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Check if stale on mount
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    enabled: !!userId,
  });

  const models = data?.models || [];

  // One-time refetch when we got empty list despite being logged in (auth/session race)
  useEffect(() => {
    if (!userId || refetchedEmptyOnce.current || isLoading || isFetching || (models?.length ?? 0) > 0) return;
    refetchedEmptyOnce.current = true;
    const t = setTimeout(() => refetch(), 800);
    return () => clearTimeout(t);
  }, [userId, isLoading, isFetching, models?.length, refetch]);

  // Invalidate cache after model creation/deletion
  const invalidateModels = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/models"] });
  };

  return {
    models,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    invalidateModels,
  };
}

// Prefetch models - call this from DashboardPage on mount
export function prefetchModels(queryClient) {
  queryClient.prefetchQuery({
    queryKey: ["/api/models"],
    queryFn: async () => {
      const response = await api.get("/models");
      if (response.data.success && response.data.models) {
        return { models: response.data.models };
      }
      return { models: [] };
    },
    staleTime: 30000,
  });
}

// Prefetch generations - call this from DashboardPage on mount
export function prefetchGenerations(queryClient) {
  queryClient.prefetchQuery({
    queryKey: ["/api/generations"],
    queryFn: async () => {
      try {
        const response = await api.get("/generations");
        return response.data;
      } catch {
        return { generations: [] };
      }
    },
    staleTime: 5000,
  });
}
