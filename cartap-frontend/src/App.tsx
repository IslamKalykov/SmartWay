// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import TripsListPage from './pages/trips/TripsListPage';
import MyTripsPage from './pages/trips/MyTripsPage';
import TripDetailPage from './pages/trips/TripsDetailPage';
import { useAuth } from './auth/AuthContext';
import './styles/global.css';

function App() {
  const { isAuth } = useAuth();

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/login"
          element={isAuth ? <Navigate to="/trips" replace /> : <LoginPage />}
        />

        <Route
          path="/register"
          element={isAuth ? <Navigate to="/trips" replace /> : <RegisterPage />}
        />

        <Route
          path="/trips"
          element={isAuth ? <TripsListPage /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/trips/:id"
          element={isAuth ? <TripDetailPage /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/my-trips"
          element={isAuth ? <MyTripsPage /> : <Navigate to="/login" replace />}
        />

        <Route path="*" element={<div>Страница не найдена</div>} />
      </Routes>
    </MainLayout>
  );
}

export default App;
