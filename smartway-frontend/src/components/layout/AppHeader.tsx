// src/components/layout/AppHeader.tsx
import { Typography, Menu, Button } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

const { Title } = Typography;

export default function AppHeader() {
  const { isAuth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = isAuth
    ? [
        { key: "home", label: <Link to="/">Главная</Link> },
        { key: "trips", label: <Link to="/trips">Поездки</Link> },
        { key: "my-trips", label: <Link to="/my-trips">Мои поездки</Link> },
      ]
    : [
        { key: "home", label: <Link to="/">Главная</Link> },
        { key: "login", label: <Link to="/login">Войти</Link> },
        { key: "register", label: <Link to="/register">Регистрация</Link> },
      ];

  const selectedKey = (() => {
    if (location.pathname === "/") return "home";
    if (location.pathname.startsWith("/trips") && !location.pathname.startsWith("/my-trips"))
      return "trips";
    if (location.pathname.startsWith("/my-trips")) return "my-trips";
    if (location.pathname.startsWith("/login")) return "login";
    if (location.pathname.startsWith("/register")) return "register";
    return "";
  })();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", width: "100%", alignItems: "center", gap: 24 }}>
      <Title level={3} style={{ margin: 0 }}>
        SmartWay
      </Title>

      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        items={menuItems}
        style={{ flex: 1, borderBottom: "none" }}
      />

      {isAuth && <Button onClick={handleLogout}>Выйти</Button>}
    </div>
  );
}
