import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Button,
  Space,
  Tag,
  Divider,
  Spin,
  message,
  Descriptions,
} from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DollarOutlined,
  PhoneOutlined,
  CarOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { Trip } from '../../api/trips';

const { Title, Text, Paragraph } = Typography;

type TripStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export default function TripDetailPage() {
  const { i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [id, i18n.language]);

  async function loadTrip() {
    try {
      setLoading(true);
      
      // TODO: Замените на реальный API-запрос
      // const data = await fetchTripById(id);
      
      // Моковые данные
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockTrip: Trip = {
        id: Number(id),
        from_location: 'Бишкек',
        to_location: 'Ош',
        departure_time: '2025-11-29T10:00:00',
        price: 1500,
        passengers_count: 3,
        status: 'open',
        is_negotiable: true,
        passenger_name: 'Айгуль Камчыбекова',
        passenger_phone: '+996555123456',
        description: 'Планирую выехать утром, есть багажник для вещей. Остановки по договорённости.',
      };
      
      setTrip(mockTrip);
    } catch (error) {
      message.error('Не удалось загрузить поездку');
      navigate('/trips');
    } finally {
      setLoading(false);
    }
  }

  const handleTakeTrip = async () => {
    try {
      setActionLoading(true);
      // TODO: API запрос на взятие поездки
      await new Promise((resolve) => setTimeout(resolve, 1000));
      message.success('Вы взяли эту поездку!');
      navigate('/my-trips');
    } catch (error) {
      message.error('Не удалось взять поездку');
    } finally {
      setActionLoading(false);
    }
  };

  const handleContactPassenger = () => {
    if (trip?.passenger_phone) {
      window.open(`tel:${trip.passenger_phone}`);
    }
  };

  const getStatusConfig = (status: TripStatus) => {
    const configs = {
      open: { color: 'green', text: 'Открыта' },
      in_progress: { color: 'blue', text: 'В пути' },
      completed: { color: 'default', text: 'Завершена' },
      cancelled: { color: 'red', text: 'Отменена' },
    };
    return configs[status] || { color: 'default', text: status };
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

  if (!trip) {
    return (
      <Card>
        <Text>Поездка не найдена</Text>
      </Card>
    );
  }

  const departure = new Date(trip.departure_time).toLocaleString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusConfig = getStatusConfig(trip.status as TripStatus);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Кнопка назад */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        Назад
      </Button>

      {/* Основная карточка */}
      <Card style={{ borderRadius: 12 }}>
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          {/* Заголовок и статус */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 12,
              }}
            >
              <Title level={isMobile ? 4 : 3} style={{ marginBottom: 0 }}>
                <EnvironmentOutlined style={{ color: '#1677ff' }} />{' '}
                {trip.from_location} → {trip.to_location}
              </Title>
              <Tag
                color={statusConfig.color}
                style={{ fontSize: 14, padding: '4px 12px', borderRadius: 999 }}
              >
                {statusConfig.text}
              </Tag>
            </div>

            {trip.is_negotiable && (
              <Tag style={{ borderRadius: 999 }}>Торг уместен</Tag>
            )}
          </div>

          <Divider style={{ margin: 0 }} />

          {/* Основная информация */}
          <Descriptions column={1} size="middle">
            <Descriptions.Item
              label={
                <span>
                  <ClockCircleOutlined /> Отправление
                </span>
              }
            >
              <Text strong>{departure}</Text>
            </Descriptions.Item>

            <Descriptions.Item
              label={
                <span>
                  <DollarOutlined /> Стоимость
                </span>
              }
            >
              <Text strong style={{ fontSize: 18, color: '#52c41a' }}>
                {trip.price} сом
              </Text>
            </Descriptions.Item>

            <Descriptions.Item
              label={
                <span>
                  <UserOutlined /> Количество мест
                </span>
              }
            >
              <Text strong>{trip.passengers_count}</Text>
            </Descriptions.Item>

            <Descriptions.Item
              label={
                <span>
                  <UserOutlined /> Пассажир
                </span>
              }
            >
              <Text>{trip.passenger_name}</Text>
            </Descriptions.Item>

            {trip.passenger_phone && (
              <Descriptions.Item
                label={
                  <span>
                    <PhoneOutlined /> Телефон
                  </span>
                }
              >
                <a href={`tel:${trip.passenger_phone}`}>{trip.passenger_phone}</a>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Описание */}
          {trip.description && (
            <>
              <Divider style={{ margin: 0 }} />
              <div>
                <Title level={5}>Описание</Title>
                <Paragraph style={{ color: '#666' }}>
                  {trip.description}
                </Paragraph>
              </div>
            </>
          )}

          <Divider style={{ margin: 0 }} />

          {/* Действия */}
          {trip.status === 'open' && (
            <Space
              direction={isMobile ? 'vertical' : 'horizontal'}
              size={12}
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              <Button
                type="primary"
                size="large"
                icon={<CarOutlined />}
                loading={actionLoading}
                onClick={handleTakeTrip}
                block={isMobile}
              >
                Взять поездку
              </Button>

              <Button
                size="large"
                icon={<PhoneOutlined />}
                onClick={handleContactPassenger}
                block={isMobile}
              >
                Связаться с пассажиром
              </Button>
            </Space>
          )}

          {trip.status === 'in_progress' && (
            <Tag color="blue" style={{ fontSize: 14, padding: '8px 16px' }}>
              Поездка уже в процессе
            </Tag>
          )}

          {trip.status === 'completed' && (
            <Tag color="default" style={{ fontSize: 14, padding: '8px 16px' }}>
              Поездка завершена
            </Tag>
          )}

          {trip.status === 'cancelled' && (
            <Tag color="red" style={{ fontSize: 14, padding: '8px 16px' }}>
              Поездка отменена
            </Tag>
          )}
        </Space>
      </Card>

      {/* Дополнительная информация */}
      <Card
        style={{ marginTop: 16, borderRadius: 12, background: '#f5f5f5' }}
        bodyStyle={{ padding: 16 }}
      >
        <Text type="secondary" style={{ fontSize: 13 }}>
          💡 Перед поездкой обязательно свяжитесь с пассажиром и уточните все детали
        </Text>
      </Card>
    </div>
  );
}