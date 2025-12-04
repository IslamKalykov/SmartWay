import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  List,
  Card,
  Typography,
  Tag,
  Button,
  Space,
  Tabs,
  Empty,
  Spin,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAuth } from '../../auth/AuthContext';
import {
  ClockCircleOutlined,
  UserOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  CarOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

// Типы (замените на свои из API)
type TripStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

type MyTrip = {
  id: number;
  from_location: string;
  to_location: string;
  departure_time: string;
  price: number;
  passengers_count: number;
  status: TripStatus;
  is_negotiable: boolean;
  passenger_name?: string;
  driver_name?: string;
  role: 'passenger' | 'driver'; // моя роль в этой поездке
};

export default function MyTripsPage() {
  const { i18n } = useTranslation();
  const [trips, setTrips] = useState<MyTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const { user } = useAuth();

  useEffect(() => {
    loadMyTrips();
  }, [i18n.language]);

  async function loadMyTrips() {
    try {
      setLoading(true);
      
      // TODO: Замените на реальный API-запрос
      // const data = await fetchMyTrips();
      
      // Моковые данные для примера
      const mockData: MyTrip[] = [
        {
          id: 1,
          from_location: 'Бишкек',
          to_location: 'Ош',
          departure_time: '2025-11-29T10:00:00',
          price: 1500,
          passengers_count: 3,
          status: 'open',
          is_negotiable: true,
          role: 'passenger',
          driver_name: 'Водитель не назначен',
        },
        {
          id: 2,
          from_location: 'Бишкек',
          to_location: 'Иссык-Куль',
          departure_time: '2025-11-28T14:00:00',
          price: 800,
          passengers_count: 2,
          status: 'in_progress',
          is_negotiable: false,
          role: 'driver',
          passenger_name: 'Айгуль К.',
        },
        {
          id: 3,
          from_location: 'Ош',
          to_location: 'Бишкек',
          departure_time: '2025-11-25T09:00:00',
          price: 1400,
          passengers_count: 4,
          status: 'completed',
          is_negotiable: false,
          role: 'passenger',
          driver_name: 'Марат А.',
        },
      ];

      setTrips(mockData);
    } finally {
      setLoading(false);
    }
  }

  // Фильтрация поездок
  const activeTrips = trips.filter(
    (trip) => trip.status === 'open' || trip.status === 'in_progress'
  );
  const completedTrips = trips.filter(
    (trip) => trip.status === 'completed' || trip.status === 'cancelled'
  );

  const filteredTrips = activeTab === 'active' ? activeTrips : completedTrips;

  const getStatusConfig = (status: TripStatus) => {
    const configs = {
      open: { color: 'green', text: 'Открыта' },
      in_progress: { color: 'blue', text: 'В пути' },
      completed: { color: 'default', text: 'Завершена' },
      cancelled: { color: 'red', text: 'Отменена' },
    };
    return configs[status] || { color: 'default', text: status };
  };

  const handleOpen = (id: number) => {
    navigate(`/trips/${id}`);
  };

  const handleCreateTrip = () => {
    navigate('/trips/create');
  };

  const renderTripCard = (trip: MyTrip) => {
    const departure = new Date(trip.departure_time).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const statusConfig = getStatusConfig(trip.status);
    const isPassenger = trip.role === 'passenger';

    return (
      <List.Item style={{ padding: isMobile ? '8px 0' : '12px 0' }}>
        <Card
          style={{
            width: '100%',
            cursor: 'pointer',
            borderRadius: 12,
            border: '1px solid #f0f0f0',
            transition: 'all 0.3s',
          }}
          bodyStyle={{ padding: isMobile ? 14 : 18 }}
          hoverable
          onClick={() => handleOpen(trip.id)}
        >
          <Space
            direction="vertical"
            size={isMobile ? 8 : 10}
            style={{ width: '100%' }}
          >
            {/* Роль */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isPassenger ? (
                <Tag color="blue" icon={<UserOutlined />}>
                  Я пассажир
                </Tag>
              ) : (
                <Tag color="purple" icon={<CarOutlined />}>
                  Я водитель
                </Tag>
              )}
            </div>

            {/* Маршрут */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <EnvironmentOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: isMobile ? 15 : 16 }}>
                {trip.from_location} → {trip.to_location}
              </Text>
            </div>

            {/* Время отправления */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClockCircleOutlined style={{ color: '#999' }} />
              <Text type="secondary" style={{ fontSize: 13 }}>
                {departure}
              </Text>
            </div>

            {/* Информация */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 12 : 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <DollarOutlined style={{ color: '#52c41a' }} />
                <Text strong style={{ fontSize: 14 }}>
                  {trip.price} сом
                </Text>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserOutlined style={{ color: '#999' }} />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {trip.passengers_count} мест
                </Text>
              </div>
            </div>

            {/* Второй участник */}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {isPassenger
                ? `Водитель: ${trip.driver_name || 'Не назначен'}`
                : `Пассажир: ${trip.passenger_name || 'Не назначен'}`}
            </Text>

            {/* Теги */}
            <Space size={8} wrap>
              <Tag color={statusConfig.color} style={{ borderRadius: 999 }}>
                {statusConfig.text}
              </Tag>

              {trip.is_negotiable && (
                <Tag style={{ borderRadius: 999 }}>Торг уместен</Tag>
              )}
            </Space>

            {/* Кнопки действий */}
            <Space size={8} style={{ marginTop: 4 }}>
              <Button
                type="primary"
                size={isMobile ? 'middle' : 'large'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpen(trip.id);
                }}
              >
                Подробнее
              </Button>

              {trip.status === 'open' && (
                <Button
                  danger
                  size={isMobile ? 'middle' : 'large'}
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Добавить логику отмены
                    console.log('Отменить поездку', trip.id);
                  }}
                >
                  Отменить
                </Button>
              )}
            </Space>
          </Space>
        </Card>
      </List.Item>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Title level={isMobile ? 4 : 3} style={{ marginBottom: 0 }}>
          Мои поездки
        </Title>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          size={isMobile ? 'middle' : 'large'}
          onClick={handleCreateTrip}
        >
          Создать поездку
        </Button>
      </div>

      <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'active' | 'completed')}
          items={[
            {
              key: 'active',
              label: `Активные (${activeTrips.length})`,
              children: (
                <div style={{ padding: isMobile ? '12px 16px' : '16px 24px' }}>
                  <List
                    dataSource={filteredTrips}
                    locale={{
                      emptyText: (
                        <Empty
                          description="У вас нет активных поездок"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        >
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleCreateTrip}
                          >
                            Создать поездку
                          </Button>
                        </Empty>
                      ),
                    }}
                    renderItem={renderTripCard}
                  />
                </div>
              ),
            },
            {
              key: 'completed',
              label: `Завершённые (${completedTrips.length})`,
              children: (
                <div style={{ padding: isMobile ? '12px 16px' : '16px 24px' }}>
                  <List
                    dataSource={filteredTrips}
                    locale={{
                      emptyText: (
                        <Empty
                          description="Нет завершённых поездок"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ),
                    }}
                    renderItem={renderTripCard}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}