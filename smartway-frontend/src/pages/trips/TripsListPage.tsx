// src/pages/trips/TripsListPage.tsx
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
} from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  DollarOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  fetchAvailableTrips,
  fetchMyActiveTrips,
  fetchMyCompletedTrips,
} from '../../api/trips';
import type { Trip } from '../../api/trips';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Text, Title } = Typography;

type TripStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export default function TripsListPage() {
  const { i18n } = useTranslation();
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [myActiveTrips, setMyActiveTrips] = useState<Trip[]>([]);
  const [completedTrips, setCompletedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] =
    useState<'available' | 'my' | 'completed'>('available');

  const navigate = useNavigate();
  const isMobile = useIsMobile(768);

  useEffect(() => {
    void loadTrips();
  }, [i18n.language]);

  async function loadTrips() {
    try {
      setLoading(true);
      const [available, mine, completed] = await Promise.all([
        fetchAvailableTrips(),
        fetchMyActiveTrips(),
        fetchMyCompletedTrips(),
      ]);
      setAvailableTrips(available);
      setMyActiveTrips(mine);
      setCompletedTrips(completed);
    } finally {
      setLoading(false);
    }
  }

  const getStatusConfig = (status: TripStatus) => {
    const configs: Record<TripStatus, { color: string; text: string }> = {
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

  const renderTripCard = (trip: Trip) => {
    const departure = new Date(trip.departure_time).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const statusConfig = getStatusConfig(
      (trip.status as TripStatus) || 'open',
    );

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

            {/* Цена + места */}
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

            {/* Пассажир */}
            <Text type="secondary" style={{ fontSize: 12 }}>
              Пассажир: {trip.passenger_name}
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

            {/* Кнопка */}
            <Button
              type="primary"
              size={isMobile ? 'middle' : 'large'}
              block={isMobile}
              onClick={(e) => {
                e.stopPropagation();
                handleOpen(trip.id);
              }}
              style={{ marginTop: 4 }}
            >
              Подробнее
            </Button>
          </Space>
        </Card>
      </List.Item>
    );
  };

  // выбираем, какие поездки показать в текущем табе
  const getDataForTab = () => {
    if (activeTab === 'available') return availableTrips;
    if (activeTab === 'my') return myActiveTrips;
    return completedTrips;
  };

  const currentData = getDataForTab();

  return (
    <div>
      <Title level={isMobile ? 4 : 3} style={{ marginBottom: 16 }}>
        Поездки
      </Title>

      <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) =>
            setActiveTab(key as 'available' | 'my' | 'completed')
          }
          items={[
            {
              key: 'available',
              label: `Активные (${availableTrips.length})`,
              children: (
                <div
                  style={{
                    padding: isMobile ? '12px 16px' : '16px 24px',
                  }}
                >
                  <List
                    loading={loading}
                    dataSource={currentData}
                    locale={{
                      emptyText: (
                        <Empty
                          description="Нет активных поездок"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ),
                    }}
                    renderItem={renderTripCard}
                  />
                </div>
              ),
            },
            {
              key: 'my',
              label: `Мои (${myActiveTrips.length})`,
              children: (
                <div
                  style={{
                    padding: isMobile ? '12px 16px' : '16px 24px',
                  }}
                >
                  <List
                    loading={loading}
                    dataSource={currentData}
                    locale={{
                      emptyText: (
                        <Empty
                          description="У вас пока нет активных поездок"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
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
                <div
                  style={{
                    padding: isMobile ? '12px 16px' : '16px 24px',
                  }}
                >
                  <List
                    loading={loading}
                    dataSource={currentData}
                    locale={{
                      emptyText: (
                        <Empty
                          description="Завершённых поездок пока нет"
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
