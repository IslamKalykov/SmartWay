// src/pages/HomePage.tsx
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Typography, List, Tag, Space, Row, Col } from 'antd';
import {
  CarOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  WarningOutlined,
  ToolOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';

const { Title, Paragraph, Text } = Typography;

type NewsItem = {
  id: number;
  title: string;
  summary: string;
  date: string;
  category: 'Дороги' | 'Пробки' | 'Ремонт' | 'Сервис';
  source?: string;
};

const MOCK_NEWS: NewsItem[] = [
  {
    id: 1,
    title: 'Ограничение движения на трассе Бишкек — Иссык-Куль',
    summary:
      'Сегодня с 22:00 до 06:00 на участке Бактуу-Долоноту ведутся дорожные работы. Возможны задержки до 30 минут.',
    date: '28.11.2025',
    category: 'Ремонт',
    source: 'Минтранс КР',
  },
  {
    id: 2,
    title: 'Усиленные проверки транспорта перед выездом из города',
    summary:
      'Госавтоинспекция проводит рейды: проверка техсостояния транспорта и документов водителей.',
    date: '28.11.2025',
    category: 'Дороги',
    source: 'ГАИ',
  },
  {
    id: 3,
    title: 'Пробки на выезде из Бишкека в сторону Чымкента',
    summary:
      'Высокий трафик утром с 07:30 до 09:30. Планируйте выезд заранее.',
    date: '27.11.2025',
    category: 'Пробки',
  },
  {
    id: 4,
    title: 'Скоро: бонусная программа для водителей CarTap',
    summary:
      'Скоро появится новая система баллов и поощрений для водителей с высоким рейтингом.',
    date: '26.11.2025',
    category: 'Сервис',
  },
];

const getCategoryIcon = (category: NewsItem['category']) => {
  switch (category) {
    case 'Дороги':
      return <EnvironmentOutlined />;
    case 'Пробки':
      return <WarningOutlined />;
    case 'Ремонт':
      return <ToolOutlined />;
    case 'Сервис':
      return <InfoCircleOutlined />;
  }
};

const getCategoryColor = (category: NewsItem['category']) => {
  switch (category) {
    case 'Дороги':
      return 'blue';
    case 'Пробки':
      return 'orange';
    case 'Ремонт':
      return 'red';
    case 'Сервис':
      return 'green';
  }
};

export default function HomePage() {
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Hero Section */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: 16,
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: isMobile ? 24 : 40 }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Title
            level={isMobile ? 2 : 1}
            style={{ color: '#fff', marginBottom: 0 }}
          >
            <CarOutlined /> CarTap
          </Title>

          <Paragraph style={{ color: '#fff', fontSize: isMobile ? 15 : 16, margin: 0 }}>
            Платформа для межгородских поездок по Кыргызстану.
            Пассажиры создают заявки, водители берут заказы —
            мы делаем поездки быстрыми, удобными и безопасными.
          </Paragraph>

          {/* Action buttons */}
          <Space
            direction={isMobile ? 'vertical' : 'horizontal'}
            size={12}
            style={{ width: isMobile ? '100%' : 'auto', marginTop: 8 }}
          >
            {!isAuth ? (
              <>
                <Link to="/login" style={{ width: isMobile ? '100%' : 'auto' }}>
                  <Button
                    type="primary"
                    size="large"
                    style={{
                      background: '#fff',
                      color: '#667eea',
                      border: 'none',
                      height: 44,
                      width: isMobile ? '100%' : 'auto',
                      fontWeight: 500,
                    }}
                  >
                    Войти
                  </Button>
                </Link>

                <Link to="/register" style={{ width: isMobile ? '100%' : 'auto' }}>
                  <Button
                    size="large"
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.5)',
                      height: 44,
                      width: isMobile ? '100%' : 'auto',
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
                  onClick={() => navigate('/trips')}
                  style={{
                    background: '#fff',
                    color: '#667eea',
                    border: 'none',
                    height: 44,
                    width: isMobile ? '100%' : 'auto',
                    fontWeight: 500,
                  }}
                >
                  Смотреть поездки
                </Button>

                <Button
                  size="large"
                  onClick={() => navigate('/my-trips')}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.5)',
                    height: 44,
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  Мои поездки
                </Button>
              </>
            )}
          </Space>
        </Space>
      </Card>

      {/* Features */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 12, height: '100%' }}
            bodyStyle={{ textAlign: 'center', padding: isMobile ? 20 : 24 }}
          >
            <ThunderboltOutlined
              style={{ fontSize: 40, color: '#faad14', marginBottom: 12 }}
            />
            <Title level={5} style={{ marginBottom: 8 }}>
              Быстро
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Находите попутчиков за считанные минуты
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 12, height: '100%' }}
            bodyStyle={{ textAlign: 'center', padding: isMobile ? 20 : 24 }}
          >
            <SafetyOutlined
              style={{ fontSize: 40, color: '#52c41a', marginBottom: 12 }}
            />
            <Title level={5} style={{ marginBottom: 8 }}>
              Безопасно
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Проверенные водители и пассажиры
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 12, height: '100%' }}
            bodyStyle={{ textAlign: 'center', padding: isMobile ? 20 : 24 }}
          >
            <ClockCircleOutlined
              style={{ fontSize: 40, color: '#1677ff', marginBottom: 12 }}
            />
            <Title level={5} style={{ marginBottom: 8 }}>
              Удобно
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Выбирайте время и маршрут под себя
            </Text>
          </Card>
        </Col>
      </Row>

      {/* News Feed */}
      <Card
        title={
          <Title level={4} style={{ marginBottom: 0 }}>
            Лента новостей
          </Title>
        }
        style={{ borderRadius: 12 }}
      >
        <List
          dataSource={MOCK_NEWS}
          locale={{ emptyText: 'Пока нет новостей' }}
          split={false}
          renderItem={(item, index) => (
            <List.Item style={{ padding: isMobile ? '12px 0' : '16px 0' }}>
              <Card
                size="small"
                style={{
                  width: '100%',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  border: '1px solid #f0f0f0',
                }}
                bodyStyle={{ padding: isMobile ? 16 : 20 }}
                hoverable
              >
                <Space
                  direction="vertical"
                  size={8}
                  style={{ width: '100%' }}
                >
                  {/* Header with category */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <Text
                      strong
                      style={{
                        fontSize: isMobile ? 14 : 15,
                        lineHeight: 1.5,
                        flex: 1,
                      }}
                    >
                      {item.title}
                    </Text>

                    <Tag
                      icon={getCategoryIcon(item.category)}
                      color={getCategoryColor(item.category)}
                      style={{ margin: 0, borderRadius: 999 }}
                    >
                      {item.category}
                    </Tag>
                  </div>

                  {/* Meta info */}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {item.date}
                    {item.source && ` • ${item.source}`}
                  </Text>

                  {/* Summary */}
                  <Paragraph
                    style={{
                      marginBottom: 0,
                      fontSize: 13,
                      color: '#666',
                    }}
                  >
                    {item.summary}
                  </Paragraph>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </Card>

      {/* Bottom CTA */}
      {!isAuth && (
        <Card
          style={{
            borderRadius: 12,
            background: '#f5f5f5',
            border: 'none',
            textAlign: 'center',
          }}
          bodyStyle={{ padding: isMobile ? 24 : 32 }}
        >
          <Title level={4}>Готовы начать?</Title>
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>
            Присоединяйтесь к CarTap и путешествуйте с комфортом
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