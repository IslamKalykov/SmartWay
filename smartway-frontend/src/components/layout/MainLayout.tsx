// src/components/layout/MainLayout.tsx - ИСПРАВЛЕННЫЙ для iOS safe-area
import { Layout, Menu, Button, Dropdown, Tag, Space } from "antd";
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
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import LanguageSwitcher, { LanguageSwitcherCompact } from "../LanguageSwitcher";
import type { ReactNode } from "react";

const { Header, Content, Footer } = Layout;

// Константы для высоты элементов
const DESKTOP_HEADER_HEIGHT = 64;
const MOBILE_HEADER_HEIGHT = 56;
const MOBILE_BOTTOM_NAV_HEIGHT = 60;

interface MainLayoutProps {
  children: ReactNode;
}

// Компонент нижней навигации
function BottomNavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        cursor: "pointer",
        color: active ? "#1677ff" : "#666",
        fontSize: 20,
        padding: "4px 12px",
      }}
    >
      {icon}
      <span style={{ fontSize: 10, fontWeight: active ? 500 : 400 }}>{label}</span>
    </div>
  );
}

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
        { key: "home", label: <Link to="/">{t('nav.home')}</Link> },
        { key: "search", label: <Link to="/search">{t('nav.search')}</Link> },
        { key: "my-ads", label: <Link to="/my-ads">{t('nav.myTrips')}</Link> },
      ]
    : [
        { key: "home", label: <Link to="/">{t('nav.home')}</Link> },
        { key: "login", label: <Link to="/login">{t('nav.login')}</Link> },
        { key: "register", label: <Link to="/register">{t('nav.register')}</Link> },
      ];

  // User dropdown menu items
  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: t('nav.profile'),
      onClick: () => navigate("/profile"),
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t('nav.logout'),
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
            height: DESKTOP_HEADER_HEIGHT,
            lineHeight: `${DESKTOP_HEADER_HEIGHT}px`,
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
            <CarOutlined /> SmartWay
          </div>

          {/* Menu */}
          <Menu
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={menuItemsDesktop}
            style={{ flex: 1, borderBottom: "none" }}
          />

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* User actions */}
          {isAuth ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button
                type="text"
                icon={<UserOutlined />}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                {user?.full_name || t('nav.profile')}
                {user?.is_driver && (
                  <Tag color="blue" style={{ marginLeft: 4 }}>{t('trip.driver')}</Tag>
                )}
              </Button>
            </Dropdown>
          ) : (
            <Button type="primary" onClick={() => navigate("/login")}>
              {t('nav.login')}
            </Button>
          )}
        </Header>
      )}

      {/* ===== MOBILE HEADER ===== */}
      {isMobile && (
        <Header
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "#fff",
            padding: "0 16px",
            height: MOBILE_HEADER_HEIGHT,
            lineHeight: `${MOBILE_HEADER_HEIGHT}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          {/* Logo */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#1677ff",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onClick={() => navigate("/")}
          >
            <CarOutlined /> SmartWay
          </div>

          {/* Right side */}
          <Space>
            <LanguageSwitcherCompact />
            {isAuth && (
              <Button 
                type="text" 
                icon={<UserOutlined />} 
                onClick={() => navigate("/profile")}
              />
            )}
          </Space>
        </Header>
      )}

      {/* ===== CONTENT ===== */}
      <Content
        style={{
          paddingTop: isMobile 
            ? MOBILE_HEADER_HEIGHT + 16
            : DESKTOP_HEADER_HEIGHT + 24,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: isMobile 
            ? MOBILE_BOTTOM_NAV_HEIGHT + 40 // увеличен отступ для safe-area
            : 32,
          maxWidth: 1000,
          margin: "0 auto",
          width: "100%",
          minHeight: isMobile 
            ? `calc(100vh - ${MOBILE_BOTTOM_NAV_HEIGHT}px)` 
            : `calc(100vh - ${DESKTOP_HEADER_HEIGHT}px)`,
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
            SmartWay © {new Date().getFullYear()} · {t('app.tagline')}
          </div>
        </Footer>
      )}

      {/* ===== MOBILE BOTTOM MENU - ИСПРАВЛЕНО для iOS safe-area ===== */}
      {isMobile && (
        <div
          className="mobile-bottom-nav"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#fff",
            borderTop: "1px solid #e8e8e8",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            zIndex: 200,
            boxShadow: "0 -2px 8px rgba(0,0,0,0.04)",
            // Высота контента + safe-area
            paddingTop: 8,
            paddingBottom: `calc(8px + env(safe-area-inset-bottom, 0px))`,
            minHeight: MOBILE_BOTTOM_NAV_HEIGHT,
          }}
        >
          {/* Главная */}
          <BottomNavItem
            icon={<HomeOutlined />}
            label={t('nav.home')}
            active={selectedKey === "home"}
            onClick={() => handleBottomNavClick("/")}
          />

          {isAuth ? (
            <>
              {/* Поиск */}
              <BottomNavItem
                icon={<SearchOutlined />}
                label={t('nav.search')}
                active={selectedKey === "search"}
                onClick={() => handleBottomNavClick("/search")}
              />

              {/* Мои поездки */}
              <BottomNavItem
                icon={<PlusCircleOutlined />}
                label={t('nav.myTrips')}
                active={selectedKey === "my-ads"}
                onClick={() => handleBottomNavClick("/my-ads")}
              />

              {/* Профиль */}
              <BottomNavItem
                icon={<UserOutlined />}
                label={t('nav.profile')}
                active={selectedKey === "profile"}
                onClick={() => handleBottomNavClick("/profile")}
              />
            </>
          ) : (
            <>
              {/* Войти */}
              <BottomNavItem
                icon={<LoginOutlined />}
                label={t('nav.login')}
                active={selectedKey === "login"}
                onClick={() => handleBottomNavClick("/login")}
              />
            </>
          )}
        </div>
      )}
    </Layout>
  );
}