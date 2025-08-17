// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { observeAuth, logoutUser } from '../services/authService';

type AuthCtx = { user: User | null; loading: boolean; logout: () => Promise<void> };
const Ctx = createContext<AuthCtx>({ user: null, loading: true, logout: async () => {} });
export const useAuth = () => useContext(Ctx);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = observeAuth(u => { setUser(u); setLoading(false); });
    return () => unsub();
  }, []);
  return (
    <Ctx.Provider value={{ user, loading, logout: logoutUser }}>
      {children}
    </Ctx.Provider>
  );
};
