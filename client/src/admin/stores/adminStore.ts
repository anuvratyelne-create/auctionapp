import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

interface AdminState {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (admin: AdminUser, token: string) => void;
  logout: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      admin: null,
      token: null,
      isAuthenticated: false,

      setAuth: (admin, token) => {
        set({
          admin,
          token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          admin: null,
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'admin-auth',
    }
  )
);
