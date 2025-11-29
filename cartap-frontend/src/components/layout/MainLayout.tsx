// src/components/layout/MainLayout.tsx
import { Layout, Menu, Button, Dropdown, Tag } from "antd";
import {
  HomeOutlined,
  SearchOutlined,
  PlusCircleOutlined,
  UserOutlined,
  LoginOutlined,
  LogoutOutlined,
  CarOutlined,
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
    if (location.pathname.startsWith("/search")) return "search";
    if (location.pathname.startsWith("/my-ads")) return "my-ads";
    if (location.pathname.startsWith("/profile")) return "profile";
    if (location.pathname.startsWith("/login")) return "login";
    if (location.pathname.startsWith("/register")) return "register";
    return "";
  })();

  // Desktop menu items
  const menuItemsDesktop = isAuth
    ? [
      { key: "home", label: <Link to="/">Главная</Link> },
      { key: "search", label: <Link to="/search">Поездки</Link> },
      { key: "my-ads", label: <Link to="/my-ads">Мои объявления</Link> },
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
      label: "Мой профиль",
      onClick: () => navigate("/profile"),
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Выйти",
      onClick: () => {
        logout();
        navigate("/");
      },
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
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
            onClick={() => navigate("/")}
          >
            <CarOutlined /> CarTap
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
                {user?.is_driver && (
                  <Tag color="blue" style={{ marginLeft: 4 }}>Водитель</Tag>
                )}
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
          maxWidth: 1000,
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
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Главная */}
          <BottomNavItem
            icon={<HomeOutlined />}
            label="Главная"
            active={selectedKey === "home"}
            onClick={() => handleBottomNavClick("/")}
          />

          {isAuth ? (
            <>
              {/* Поиск */}
              <BottomNavItem
                icon={<SearchOutlined />}
                label="Поездки"
                active={selectedKey === "search"}
                onClick={() => handleBottomNavClick("/search")}
              />

              {/* Мои объявления */}
              <BottomNavItem
                icon={<PlusCircleOutlined />}
                label="Мои"
                active={selectedKey === "my-ads"}
                onClick={() => handleBottomNavClick("/my-ads")}
              />

              {/* Профиль */}
              <BottomNavItem
                icon={<UserOutlined />}
                label="Профиль"
                active={selectedKey === "profile"}
                onClick={() => handleBottomNavClick("/profile")}
              />

              {/* 🔴 Выход */}
              <BottomNavItem
                icon={<LogoutOutlined />}
                label="Выход"
                active={false}
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              />
            </>
          ) : (
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