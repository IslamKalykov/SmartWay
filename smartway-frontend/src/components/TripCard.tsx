// src/components/TripCard.tsx
import { Card, Tag, Space, Typography, Avatar, Button, Tooltip } from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { RideOptionsDisplay } from './RideOptionsForm';
import type { Trip } from '../api/trips';

const { Text, Title } = Typography;

interface TripCardProps {
  trip: Trip;
  onClick?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionLoading?: boolean;
  showPassengerInfo?: boolean;  // Показывать инфо о пассажире (для водителей)
}

export default function TripCard({
  trip,
  onClick,
  onAction,
  actionLabel,
  actionLoading,
  showPassengerInfo = false,
}: TripCardProps) {
  const { t } = useTranslation();

  const statusConfig: Record<string, { color: string; text: string }> = {
    open: { color: 'green', text: t('tripStatus.open') },
    taken: { color: 'blue', text: t('tripStatus.taken') },
    in_progress: { color: 'processing', text: t('tripStatus.inProgress') },
    completed: { color: 'default', text: t('tripStatus.completed') },
    cancelled: { color: 'red', text: t('tripStatus.cancelled') },
    expired: { color: 'orange', text: t('tripStatus.expired') },
  };

  const status = statusConfig[trip.status] || { color: 'default', text: trip.status };

  const departureDate = dayjs(trip.departure_time);
  const isToday = departureDate.isSame(dayjs(), 'day');
  const isTomorrow = departureDate.isSame(dayjs().add(1, 'day'), 'day');

  const dateLabel = isToday
    ? t('common.today')
    : isTomorrow
    ? t('common.tomorrow')
    : departureDate.format('DD MMM');

  // Используем локализованные названия если есть
  const fromLocation = trip.from_location_display || trip.from_location;
  const toLocation = trip.to_location_display || trip.to_location;

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      style={{
        borderRadius: 12,
        marginBottom: 12,
        cursor: onClick ? 'pointer' : 'default',
      }}
      bodyStyle={{ padding: 16 }}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {/* Маршрут */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EnvironmentOutlined style={{ color: '#52c41a', fontSize: 16 }} />
          <Text strong style={{ fontSize: 15 }}>{fromLocation}</Text>
          <ArrowRightOutlined style={{ color: '#999' }} />
          <Text strong style={{ fontSize: 15 }}>{toLocation}</Text>
        </div>

        {/* Дата и время */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Space size={4}>
            <ClockCircleOutlined style={{ color: '#1677ff' }} />
            <Text>
              {dateLabel}, {departureDate.format('HH:mm')}
            </Text>
          </Space>

          <Space size={4}>
            <UserOutlined style={{ color: '#666' }} />
            <Text>
              {trip.passengers_count} {trip.passengers_count === 1 ? t('trip.seat') : t('trip.seats')}
            </Text>
          </Space>

          {trip.price && (
            <Space size={4}>
              <DollarOutlined style={{ color: '#52c41a' }} />
              <Text strong style={{ color: '#52c41a' }}>
                {trip.price} сом
              </Text>
              {trip.is_negotiable && (
                <Tag color="orange" style={{ marginLeft: 4 }}>
                  {t('trip.negotiable')}
                </Tag>
              )}
            </Space>
          )}
        </div>

        {/* Условия поездки */}
        <RideOptionsDisplay
          options={{
            allow_smoking: trip.allow_smoking,
            allow_pets: trip.allow_pets,
            allow_big_luggage: trip.allow_big_luggage,
            baggage_help: trip.baggage_help,
          }}
          compact
        />

        {/* Информация о пассажире (для водителей) */}
        {showPassengerInfo && trip.passenger_name && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            padding: '8px 0',
            borderTop: '1px solid #f0f0f0',
          }}>
            <Avatar size="small" icon={<UserOutlined />} />
            <Text>{trip.passenger_name}</Text>
            {trip.passenger_verified && (
              <Tooltip title={t('profile.verifiedPassenger')}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              </Tooltip>
            )}
          </div>
        )}

        {/* Статус и действия */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          paddingTop: 8,
          borderTop: '1px solid #f0f0f0',
        }}>
          <Tag color={status.color}>{status.text}</Tag>

          {onAction && actionLabel && (
            <Button
              type="primary"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              loading={actionLoading}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </Space>
    </Card>
  );
}