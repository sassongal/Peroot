"use client";

import { useState, useEffect, useCallback } from "react";

export interface MemoryFact {
  id: string;
  fact: string;
  category: string;
  source: "auto" | "manual";
  confidence: number;
  created_at: string;
  updated_at: string;
}

export function useUserMemory() {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/memory");
      if (!res.ok) throw new Error("Failed to load memory");
      const data = await res.json();
      setFacts(data.facts ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacts();
  }, [fetchFacts]);

  const addFact = useCallback(
    async (
      fact: string,
      category: string = "general",
    ): Promise<{ success: boolean; error?: string }> => {
      const res = await fetch("/api/user/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fact, category }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || "Failed to add fact" };
      }
      const data = await res.json();
      setFacts((prev) => [data.fact, ...prev]);
      return { success: true };
    },
    [],
  );

  const deleteFact = useCallback(
    async (id: string): Promise<{ success: boolean }> => {
      setFacts((prev) => prev.filter((f) => f.id !== id));
      const res = await fetch("/api/user/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        await fetchFacts();
        return { success: false };
      }
      return { success: true };
    },
    [fetchFacts],
  );

  return { facts, isLoading, error, addFact, deleteFact, refresh: fetchFacts };
}
