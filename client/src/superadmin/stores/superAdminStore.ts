import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SuperAdmin {
  id: string;
  email: string;
  name: string;
}

interface SuperAdminState {
  token: string | null;
  superAdmin: SuperAdmin | null;
  isAuthenticated: boolean;
  setAuth: (token: string, superAdmin: SuperAdmin) => void;
  logout: () => void;
}

export const useSuperAdminStore = create<SuperAdminState>()(
  persist(
    (set) => ({
      token: null,
      superAdmin: null,
      isAuthenticated: false,
      setAuth: (token, superAdmin) => set({
        token,
        superAdmin,
        isAuthenticated: true
      }),
      logout: () => set({
        token: null,
        superAdmin: null,
        isAuthenticated: false
      })
    }),
    {
      name: 'sa-storage' // Short, non-descriptive name
    }
  )
);
