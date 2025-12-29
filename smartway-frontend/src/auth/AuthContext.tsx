// src/auth/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

type User = {
  id: number;
  phone_number: string;
  full_name?: string;
  is_driver?: boolean;
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
  updateUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  // подтягиваем состояние при загрузке
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const rawUser = localStorage.getItem('user');
    if (token && rawUser) {
      try {
        setUser(JSON.parse(rawUser));
        setIsAuth(true);
      } catch {
        setUser(null);
        setIsAuth(false);
      }

    }
    setLoading(false);
  }, []);

  const login = (data: { access: string; refresh?: string; user?: User }) => {
    if (data.access && data.access !== 'undefined') {
      localStorage.setItem('access_token', data.access);
    }
    if (data.refresh && data.refresh !== 'undefined') {
      localStorage.setItem('refresh_token', data.refresh);
    }
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    }
    setIsAuth(true);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuth(false);
    setLoading(false);
  };

  const updateUser = (newUser: User | null) => {
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      setIsAuth(true);
    } else {
      localStorage.removeItem('user');
      setUser(null);
      setIsAuth(false);
    }
  };
  return (
    <AuthContext.Provider value={{ isAuth, user, loading, login, logout, updateUser }}>
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
