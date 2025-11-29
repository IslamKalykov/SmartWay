import { Layout, Menu, Button, Dropdown } from "antd";
import {
  HomeOutlined,
  CarOutlined,
  UserOutlined,
  LoginOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import type { ReactNode } from "react";

const { Header, Content, Footer } = Layout;

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuth, logout, user } = useAuth();
  const isMobile = useIsMobile(768);

  const selectedKey = (() => {
    if (location.pathname === "/") return "home";
    if (location.pathname.startsWith("/trips") && isAuth) return "trips";
    if (location.pathname.startsWith("/my-trips") && isAuth) return "my-trips";
    if (location.pathname.startsWith("/login")) return "login";
    if (location.pathname.startsWith("/register")) return "register";
    return "";
  })();

  // Desktop menu
  const menuItemsDesktop = isAuth
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

  // User dropdown menu items
  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Профиль",
      onClick: () => navigate("/profile"),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Настройки",
      onClick: () => navigate("/settings"),
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Выйти",
      onClick: logout,
      danger: true,
    },
  ];

  const handleBottomNavClick = (route: string) => navigate(route);

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        position: "relative",
      }}
    >
      {/* ===== DESKTOP HEADER ===== */}
      {!isMobile && (
        <Header
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          {/* Logo */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "#1677ff",
              cursor: "pointer",
              marginRight: 24,
            }}
            onClick={() => navigate("/")}
          >
            CarTap
          </div>

          {/* Menu */}
          <Menu
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={menuItemsDesktop}
            style={{ flex: 1, borderBottom: "none" }}
          />

          {/* User actions */}
          {isAuth ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button
                type="text"
                icon={<UserOutlined />}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                {user?.full_name || "Профиль"}
              </Button>
            </Dropdown>
          ) : (
            <Button type="primary" onClick={() => navigate("/login")}>
              Войти
            </Button>
          )}
        </Header>
      )}

      {/* ===== CONTENT ===== */}
      <Content
        style={{
          padding: isMobile ? "16px 16px 80px" : "88px 16px 32px",
          maxWidth: 900,
          margin: "0 auto",
          width: "100%",
          minHeight: isMobile ? "calc(100vh - 60px)" : "calc(100vh - 128px)",
          boxSizing: "border-box",
        }}
      >
        {children}
      </Content>

      {/* ===== DESKTOP FOOTER ===== */}
      {!isMobile && (
        <Footer
          style={{
            textAlign: "center",
            background: "#fff",
            borderTop: "1px solid #f0f0f0",
            padding: "24px 16px",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <Link to="/about" style={{ marginRight: 16 }}>
              О нас
            </Link>
            <Link to="/help" style={{ marginRight: 16 }}>
              Помощь
            </Link>
            <Link to="/terms">Условия</Link>
          </div>
          <div style={{ color: "#999", fontSize: 13 }}>
            CarTap © {new Date().getFullYear()} · Сервис поиска попутчиков
          </div>
        </Footer>
      )}

      {/* ===== MOBILE BOTTOM MENU ===== */}
      {isMobile && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: "#fff",
            borderTop: "1px solid #e8e8e8",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            zIndex: 200,
            boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
            // Важно для предотвращения скролла под меню
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Главная — всегда доступна */}
          <BottomNavItem
            icon={<HomeOutlined />}
            label="Главная"
            active={selectedKey === "home"}
            onClick={() => handleBottomNavClick("/")}
          />

          {/* Поездки — только если вошёл */}
          {isAuth && (
            <BottomNavItem
              icon={<CarOutlined />}
              label="Поездки"
              active={selectedKey === "trips"}
              onClick={() => handleBottomNavClick("/trips")}
            />
          )}

          {/* Мои поездки — только если вошёл */}
          {isAuth && (
            <BottomNavItem
              icon={<UserOutlined />}
              label="Мои"
              active={selectedKey === "my-trips"}
              onClick={() => handleBottomNavClick("/my-trips")}
            />
          )}

          {/* Если НЕ авторизован → кнопки входа/регистрации */}
          {!isAuth && (
            <>
              <BottomNavItem
                icon={<LoginOutlined />}
                label="Войти"
                active={selectedKey === "login"}
                onClick={() => handleBottomNavClick("/login")}
              />
              <BottomNavItem
                icon={<UserOutlined />}
                label="Регистрация"
                active={selectedKey === "register"}
                onClick={() => handleBottomNavClick("/register")}
              />
            </>
          )}
        </div>
      )}
    </Layout>
  );
}

interface BottomNavItemProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function BottomNavItem({ icon, label, active, onClick }: BottomNavItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "8px 12px",
        color: active ? "#1677ff" : "#666",
        fontSize: 11,
        fontWeight: active ? 500 : 400,
        cursor: "pointer",
        transition: "all 0.2s",
        minWidth: 60,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div
        style={{
          fontSize: 22,
          transition: "transform 0.2s",
          transform: active ? "scale(1.1)" : "scale(1)",
        }}
      >
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
}