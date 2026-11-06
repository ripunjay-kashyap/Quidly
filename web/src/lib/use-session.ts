"use client";

import { createContext, createElement, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type Config, get, type User } from "./api";

type Session = {
  // undefined while loading, null when logged out.
  user: User | null | undefined;
  config: Config | null;
  refreshUser: () => void;
};

const SessionContext = createContext<Session | null>(null);

// One copy of the logged-in user for the whole page, so the header's slot count
// updates as soon as a page refreshes the user.
export function SessionProvider({ children }: { children: ReactNode }) {
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

  const session = useMemo(() => ({ user, config, refreshUser }), [user, config, refreshUser]);
  return createElement(SessionContext.Provider, { value: session }, children);
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
}
