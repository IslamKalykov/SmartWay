// src/pages/HomePage.tsx
import { Card, Typography, Button, Space, Row, Col, Tag } from "antd";
import {
  CarOutlined,
  SearchOutlined,
  PlusCircleOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";

const { Title, Paragraph, Text } = Typography;

export default function HomePage() {
  const { isAuth, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);

  return (
    <div>
      {/* Hero Section */}
      <Card
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 16,
          border: "none",
          marginBottom: 24,
          padding: isMobile ? 24 : 40,
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Title level={isMobile ? 2 : 1} style={{ color: "#fff", marginBottom: 0 }}>
            <CarOutlined /> SmartWay
          </Title>

          <Paragraph style={{ color: "#fff", fontSize: isMobile ? 15 : 16, margin: 0 }}>
            Платформа для межгородских поездок по Кыргызстану.
            Пассажиры находят водителей, водители — пассажиров.
          </Paragraph>

          <Space direction={isMobile ? "vertical" : "horizontal"} size={12} style={{ marginTop: 16, width: isMobile ? "100%" : "auto" }}>
            {!isAuth ? (
              <>
                <Link to="/login" style={{ width: isMobile ? "100%" : "auto" }}>
                  <Button
                    type="primary"
                    size="large"
                    style={{
                      background: "#fff",
                      color: "#667eea",
                      border: "none",
                      height: 48,
                      width: isMobile ? "100%" : "auto",
                      fontWeight: 500,
                    }}
                  >
                    Войти
                  </Button>
                </Link>
                <Link to="/register" style={{ width: isMobile ? "100%" : "auto" }}>
                  <Button
                    size="large"
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.5)",
                      height: 48,
                      width: isMobile ? "100%" : "auto",
                    }}
                  >
                    Зарегистрироваться
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button
                  type="primary"
                  size="large"
                  icon={<SearchOutlined />}
                  onClick={() => navigate("/search")}
                  style={{
                    background: "#fff",
                    color: "#667eea",
                    border: "none",
                    height: 48,
                    width: isMobile ? "100%" : "auto",
                    fontWeight: 500,
                  }}
                >
                  {user?.is_driver ? "Найти пассажиров" : "Найти поездку"}
                </Button>
                <Button
                  size="large"
                  icon={<PlusCircleOutlined />}
                  onClick={() => navigate("/my-ads")}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.5)",
                    height: 48,
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  {user?.is_driver ? "Создать объявление" : "Создать заказ"}
                </Button>
              </>
            )}
          </Space>
        </Space>
      </Card>

      {/* Info for logged in user */}
      {isAuth && user && (
        <Card style={{ marginBottom: 24, borderRadius: 12 }}>
          <Space>
            <Text>Вы вошли как:</Text>
            <Text strong>{user.full_name || user.phone_number}</Text>
            <Tag color={user.is_driver ? "blue" : "green"}>
              {user.is_driver ? "🚗 Водитель" : "👤 Пассажир"}
            </Tag>
          </Space>
        </Card>
      )}

      {/* Features */}
      <Title level={4} style={{ marginBottom: 16 }}>Как это работает</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card style={{ height: "100%", borderRadius: 12, textAlign: "center" }}>
            <SearchOutlined style={{ fontSize: 32, color: "#1890ff", marginBottom: 12 }} />
            <Title level={5}>Найдите поездку</Title>
            <Paragraph type="secondary">
              {user?.is_driver 
                ? "Просматривайте заказы пассажиров и выбирайте подходящие"
                : "Ищите объявления водителей по нужному маршруту"
              }
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ height: "100%", borderRadius: 12, textAlign: "center" }}>
            <TeamOutlined style={{ fontSize: 32, color: "#52c41a", marginBottom: 12 }} />
            <Title level={5}>Свяжитесь</Title>
            <Paragraph type="secondary">
              {user?.is_driver 
                ? "Возьмите заказ и свяжитесь с пассажиром"
                : "Отправьте заявку водителю и договоритесь о деталях"
              }
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ height: "100%", borderRadius: 12, textAlign: "center" }}>
            <ThunderboltOutlined style={{ fontSize: 32, color: "#722ed1", marginBottom: 12 }} />
            <Title level={5}>Путешествуйте</Title>
            <Paragraph type="secondary">
              Совершите поездку с комфортом и оставьте отзыв
            </Paragraph>
          </Card>
        </Col>
      </Row>

      {/* Trust */}
      <Card style={{ marginTop: 24, borderRadius: 12, background: "#fafafa" }}>
        <Space align="start">
          <SafetyCertificateOutlined style={{ fontSize: 24, color: "#52c41a" }} />
          <div>
            <Title level={5} style={{ marginBottom: 4 }}>Верифицированные пользователи</Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Подтверждённые водители и пассажиры отмечены специальным значком.
              Вы можете видеть рейтинг и отзывы перед поездкой.
            </Paragraph>
          </div>
        </Space>
      </Card>

      {/* CTA for guests */}
      {!isAuth && (
        <Card style={{ marginTop: 24, borderRadius: 12, textAlign: "center" }}>
          <Title level={4}>Готовы начать?</Title>
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>
            Присоединяйтесь к SmartWay и путешествуйте с комфортом
          </Paragraph>
          <Space size={12}>
            <Link to="/register">
              <Button type="primary" size="large">
                Зарегистрироваться
              </Button>
            </Link>
            <Link to="/login">
              <Button size="large">Войти</Button>
            </Link>
          </Space>
        </Card>
      )}
    </div>
  );
}