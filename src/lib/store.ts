import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DniData {
  id: string;
  nombre: string;
  apellido: string;
  dniNumero: string;
  domicilio: string;
  nacimiento: string;
  fechaEmision: string;
  sexo: string;
  firma: string | null;
  foto: string | null;
  userId_value: string;
  tramiteNumero: string;
  ejemplar: string;
}

export interface UserData {
  id: string;
  email: string;
  isActive: boolean;
  tokens?: number;
  referralBalance?: number;
  referralCode?: string | null;
  dni: DniData | null;
}

export type AppView =
  | 'login'
  | 'register'
  | 'install-guide'
  | 'home'
  | 'documentos'
  | 'dni-viewer'
  | 'dni-edit'
  | 'admin'
  | 'tokens'
  | 'referidos'
  | 'usuario';

interface AppState {
  view: AppView;
  user: UserData | null;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;
  menuOpen: boolean; // cajón lateral de las 3 líneas

  setMenuOpen: (open: boolean) => void;
  setView: (view: AppView) => void;
  setUser: (user: UserData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: 'login' as AppView,
      user: null,
      isLoading: false,
      error: null,
      _hasHydrated: false,
      menuOpen: false,

      setMenuOpen: (menuOpen) => set({ menuOpen }),
      setView: (view) => set({ view, error: null }),
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),
      logout: () => set({ view: 'login', user: null, error: null }),
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
    }),
    {
      name: 'mi-argentina-session', // localStorage key
      partialize: (state) => ({
        // Guía de instalación y edición del documento nunca se persisten:
        // al recargar vuelve a Inicio
        view: state.view === 'install-guide' || state.view === 'dni-edit' ? 'home' : state.view,
        user: state.user,
      }), // only persist view + user
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

