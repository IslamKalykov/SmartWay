// src/components/AnnouncementCard.tsx
import { Card, Tag, Space, Typography, Avatar, Button, Tooltip, Progress } from 'antd';
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CarOutlined,
  CheckCircleOutlined,
  StarOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { RideOptionsDisplay } from './RideOptionsForm';
import type { Announcement } from '../api/announcements';

const { Text, Title } = Typography;

interface AnnouncementCardProps {
  announcement: Announcement;
  onClick?: () => void;
  onBook?: () => void;
  bookLoading?: boolean;
  showDriverInfo?: boolean;
}

export default function AnnouncementCard({
  announcement,
  onClick,
  onBook,
  bookLoading,
  showDriverInfo = true,
}: AnnouncementCardProps) {
  const { t } = useTranslation();

  const statusConfig: Record<string, { color: string; text: string }> = {
    active: { color: 'green', text: t('announcementStatus.active') },
    full: { color: 'orange', text: t('announcementStatus.full') },
    completed: { color: 'default', text: t('announcementStatus.completed') },
    cancelled: { color: 'red', text: t('announcementStatus.cancelled') },
    expired: { color: 'default', text: t('announcementStatus.expired') },
  };

  const status = statusConfig[announcement.status] || { color: 'default', text: announcement.status };

  const departureDate = dayjs(announcement.departure_time);
  const isToday = departureDate.isSame(dayjs(), 'day');
  const isTomorrow = departureDate.isSame(dayjs().add(1, 'day'), 'day');

  const dateLabel = isToday
    ? t('common.today')
    : isTomorrow
    ? t('common.tomorrow')
    : departureDate.format('DD MMM');

  const freeSeats = announcement.free_seats ?? 
    (announcement.available_seats - (announcement.booked_seats || 0));
  
  const seatsPercent = announcement.available_seats > 0
    ? ((announcement.available_seats - freeSeats) / announcement.available_seats) * 100
    : 0;

  // Используем локализованные названия если есть
  const fromLocation = announcement.from_location_display || announcement.from_location;
  const toLocation = announcement.to_location_display || announcement.to_location;

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
      <Space orientation="vertical" size={12} style={{ width: '100%' }}>
        {/* Маршрут */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EnvironmentOutlined style={{ color: '#52c41a', fontSize: 16 }} />
          <Text strong style={{ fontSize: 15 }}>{fromLocation}</Text>
          <ArrowRightOutlined style={{ color: '#999' }} />
          <Text strong style={{ fontSize: 15 }}>{toLocation}</Text>
        </div>

        {/* Дата, время и места */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Space size={4}>
            <ClockCircleOutlined style={{ color: '#1677ff' }} />
            <Text>
              {dateLabel}, {departureDate.format('HH:mm')}
            </Text>
          </Space>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text type="secondary">{t('trip.seats')}:</Text>
            <Progress
              percent={seatsPercent}
              size="small"
              style={{ width: 60, margin: 0 }}
              showInfo={false}
              strokeColor={freeSeats === 0 ? '#ff4d4f' : '#52c41a'}
            />
            <Text strong style={{ color: freeSeats === 0 ? '#ff4d4f' : '#52c41a' }}>
              {freeSeats}/{announcement.available_seats}
            </Text>
          </div>
        </div>

        {/* Цена */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ fontSize: 18, color: '#52c41a' }}>
            {announcement.price_per_seat} сом
          </Text>
          <Text type="secondary">/{t('trip.seat')}</Text>
          {announcement.is_negotiable && (
            <Tag color="orange">{t('trip.negotiable')}</Tag>
          )}
        </div>

        {/* Условия поездки */}
        <RideOptionsDisplay
          options={{
            allow_smoking: announcement.allow_smoking,
            allow_pets: announcement.allow_pets,
            allow_big_luggage: announcement.allow_big_luggage,
            baggage_help: announcement.baggage_help,
            allow_children: announcement.allow_children,
            has_air_conditioning: announcement.has_air_conditioning,
          }}
          compact
        />

        {/* Информация о водителе */}
        {showDriverInfo && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '8px 0',
            borderTop: '1px solid #f0f0f0',
          }}>
            <Space>
              <Avatar 
                size="small" 
                src={announcement.driver_photo}
                icon={<UserOutlined />} 
              />
              <Text>{announcement.driver_name}</Text>
              {announcement.driver_verified && (
                <Tooltip title={t('profile.verifiedDriver')}>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                </Tooltip>
              )}
              {announcement.driver_rating && (
                <Space size={2}>
                  <StarOutlined style={{ color: '#faad14' }} />
                  <Text>{announcement.driver_rating.toFixed(1)}</Text>
                </Space>
              )}
            </Space>

            {/* Информация об авто */}
            {announcement.car_info && (
              <Space size={4}>
                <CarOutlined style={{ color: '#666' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {announcement.car_info.brand} {announcement.car_info.model}
                </Text>
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

          {onBook && freeSeats > 0 && announcement.status === 'active' && (
            <Button
              type="primary"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onBook();
              }}
              loading={bookLoading}
            >
              {t('trip.book')}
            </Button>
          )}
        </div>
      </Space>
    </Card>
  );
}