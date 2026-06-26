"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ConnectorSummary } from "@/shared/types/connector";

export function useConnectors() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["connectors"],
    queryFn: () => apiFetch<ConnectorSummary[]>("/api/connectors"),
  });

  const connect = useMutation({
    mutationFn: ({ id, resumeUrl }: { id: string; resumeUrl?: string }) => {
      const query = resumeUrl
        ? `?resumeUrl=${encodeURIComponent(resumeUrl)}`
        : "";
      return apiFetch<{ url: string }>(
        `/api/integrations/${id}/connect${query}`,
        { method: "POST" },
      ).then((r) => r.url);
    },
  });

  const test = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ results: string[] }>(`/api/integrations/${id}/test`, {
        method: "POST",
      }).then((r) => r.results),
  });

  const revoke = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/integrations/${id}/revoke`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors"] }),
  });

  return {
    connectors: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    connect: connect.mutateAsync,
    test: test.mutateAsync,
    revoke: revoke.mutateAsync,
  };
}
