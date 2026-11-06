"use client";

import { useCallback, useEffect, useState } from "react";
import { type Config, get, type User } from "./api";

// undefined while loading, null when logged out.
export function useSession() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [config, setConfig] = useState<Config | null>(null);

  const refreshUser = useCallback(() => {
    get<User>("/api/me")
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    get<User>("/api/me")
      .catch(() => null)
      .then(setUser);
    get<Config>("/api/config")
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  return { user, config, refreshUser };
}
