// src/components/TripCard.tsx

import { Card, Tag, Space, Typography, Avatar, Button, Tooltip } from 'antd';

import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  PhoneOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { RideOptionsDisplay } from './RideOptionsForm';
import type { Trip } from '../api/trips';

const { Text } = Typography;

interface TripCardProps {
  trip: Trip;
  onClick?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionLoading?: boolean;
  showPassengerInfo?: boolean;
  showContactButtons?: boolean;  // Показывать кнопки связи
}

export default function TripCard({
  trip,
  onClick,
  onAction,
  actionLabel,
  actionLoading,
  showPassengerInfo = false,
  showContactButtons = false,
}: TripCardProps) {

  const { t, i18n } = useTranslation();
  const statusConfig: Record<string, { color: string; text: string }> = {
    open: { color: 'green', text: t('tripStatus.open') },
    taken: { color: 'blue', text: t('tripStatus.taken') },
    in_progress: { color: 'processing', text: t('tripStatus.inProgress') },
    completed: { color: 'default', text: t('tripStatus.completed') },
    cancelled: { color: 'red', text: t('tripStatus.cancelled') },
    expired: { color: 'orange', text: t('tripStatus.expired') },
  };

  const status = statusConfig[trip.status] || { color: 'default', text: trip.status };
  
  const lang = (i18n.language || navigator.language || 'ru').slice(0,2);
  const departureDate = dayjs(trip.departure_time);
  const isToday = departureDate.isSame(dayjs(), 'day');
  const isTomorrow = departureDate.isSame(dayjs().add(1, 'day'), 'day');

  const dateLabel = isToday
    ? t('common.today')
    : isTomorrow
    ? t('common.tomorrow')
    : departureDate.locale(lang).format('DD MMM');

  const fromLocation = trip.from_location_display || trip.from_location;
  const toLocation = trip.to_location_display || trip.to_location;

  // Форматируем телефон для ссылки
  const phoneNumber = trip.contact_phone || trip.passenger_phone;
  const cleanPhone = phoneNumber?.replace(/\D/g, '');

  // Открыть Telegram
  const handleTelegram = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trip.passenger_telegram) {
      window.open(`https://t.me/${trip.passenger_telegram}`, '_blank');
    } else if (cleanPhone) {
      window.open(`https://t.me/+${cleanPhone}`, '_blank');
    }
  };

  // Позвонить
  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cleanPhone) {
      window.location.href = `tel:+${cleanPhone}`;
    }
  };

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      style={{
        borderRadius: 12,
        marginBottom: 12,
        cursor: onClick ? 'pointer' : 'default',
      }}
      styles={{ body: { padding: 16 } }}
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

          {/* Цена или Договорная */}
          <Space size={4}>
            <DollarOutlined style={{ color: '#52c41a' }} />
            {trip.price ? (
              <>
                <Text strong style={{ color: '#52c41a' }}>
                  {trip.price} сом
                </Text>
                {trip.is_negotiable && (
                  <Tag color="orange" style={{ marginLeft: 4 }}>
                    {t('trip.negotiable')}
                  </Tag>
                )}
              </>
            ) : (
              <Tag color="orange">{t('trip.negotiable')}</Tag>
            )}
          </Space>
        </div>

        {/* Условия поездки */}
        <RideOptionsDisplay
          options={{
            allow_smoking: trip.allow_smoking,
            allow_pets: trip.allow_pets,
            allow_big_luggage: trip.allow_big_luggage,
            baggage_help: trip.baggage_help,
            with_child: trip.with_child,
          }}
          compact
        />

        {/* Информация о пассажире (для водителей) */}
        {showPassengerInfo && trip.passenger_name && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: 8,
            padding: '8px 0',
            borderTop: '1px solid #f0f0f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Text>{trip.passenger_name}</Text>
              {trip.passenger_verified && (
                <Tooltip title={t('profile.verifiedPassenger')}>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                </Tooltip>
              )}
            </div>

            {/* Кнопки связи */}
            {showContactButtons && (phoneNumber || trip.passenger_telegram) && (
              <Space size={8}>
                <Tooltip title={t('contact.telegram')}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<MessageOutlined />}
                    onClick={handleTelegram}
                  />
                </Tooltip>
                {phoneNumber && (
                  <Tooltip title={t('contact.call')}>
                    <Button
                      size="small"
                      icon={<PhoneOutlined />}
                      onClick={handleCall}
                    />
                  </Tooltip>
                )}
              </Space>
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