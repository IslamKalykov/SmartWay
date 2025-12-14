// src/auth/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { getMyProfile } from '../api/auth';

export type User = {
  id: number;
  phone_number: string;
  full_name?: string;
  photo?: string;
  is_driver?: boolean;
  is_verified_driver?: boolean;
  is_verified_passenger?: boolean;
  public_id?: string;
};

type AuthContextValue = {
  isAuth: boolean;
  user: User | null;
  loading: boolean;
  login: (data: {
    access: string;
    refresh?: string;
    user?: User;
  }) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  // Загрузка состояния при старте
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const rawUser = localStorage.getItem('user');

      if (token && rawUser) {
        try {
          const parsedUser: User = JSON.parse(rawUser);
          setUser(parsedUser);
          setIsAuth(true);
        } catch {
          // Невалидные данные - очищаем
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuth(false);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback((data: { access: string; refresh?: string; user?: User }) => {
    // Сохраняем токены
    localStorage.setItem('access_token', data.access);
    if (data.refresh) {
      localStorage.setItem('refresh_token', data.refresh);
    }

    // Сохраняем пользователя
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    }

    setIsAuth(true);
    console.log('[Auth] Login successful, token & user saved', data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuth(false);
    console.log('[Auth] Logged out');
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getMyProfile();
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      console.log('[Auth] User refreshed', userData);
    } catch (error) {
      console.error('[Auth] Failed to refresh user:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuth, user, loading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
