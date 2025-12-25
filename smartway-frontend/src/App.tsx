// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import SearchPage from './pages/SearchPage';
import MyAdsPage from './pages/MyAdsPage';
import ProfilePage from './pages/profile/ProfilePage';
import UserProfilePage from './pages/UserProfilePage';
import { useAuth } from './auth/AuthContext';
import './styles/global.css';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuth, loading } = useAuth();
  const { t } = useTranslation();
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        {t('common.loading')}
      </div>
    );
  }
  
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const { isAuth } = useAuth();

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/login"
          element={isAuth ? <Navigate to="/search" replace /> : <LoginPage />}
        />

        <Route
          path="/register"
          element={isAuth ? <Navigate to="/search" replace /> : <RegisterPage />}
        />

        {/* Поиск поездок/заказов */}
        <Route
          path="/search"
          element={
            <PrivateRoute>
              <SearchPage />
            </PrivateRoute>
          }
        />

        {/* Мои объявления / мои заказы */}
        <Route
          path="/my-ads"
          element={
            <PrivateRoute>
              <MyAdsPage />
            </PrivateRoute>
          }
        />

        {/* Профиль */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />

        {/* Legacy routes - редирект */}
        <Route path="/trips" element={<Navigate to="/search" replace />} />
        <Route path="/my-trips" element={<Navigate to="/my-ads" replace />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />

        <Route
          path="*"
          element={
            <div style={{ textAlign: 'center', padding: 50 }}>
              404 — Страница не найдена
            </div>
          }
        />
      </Routes>
    </MainLayout>
  );
}

export default App;