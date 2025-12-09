// src/pages/MyAdsPage.tsx
import { useState, useEffect } from 'react';
import {
  Card, Typography, Button, Tabs, Empty, Spin, Modal, message, Badge, Space, Avatar, Tag, Tooltip
} from 'antd';
import {
  PlusOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UserOutlined, PhoneOutlined, MessageOutlined,
  ClockCircleOutlined, CarOutlined, CheckOutlined, StopOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useAuth } from '../auth/AuthContext';
import TripCard from '../components/TripCard';
import AnnouncementCard from '../components/AnnouncementCard';
import CreateTripForm from '../components/CreateTripForm';
import CreateAnnouncementForm from '../components/CreateAnnouncementForm';

import {
  fetchMyAnnouncements,
  cancelAnnouncement,
  completeAnnouncement,
  fetchIncomingBookings,
  confirmBooking,
  rejectBooking,
  type Announcement,
  type Booking,
} from '../api/announcements';
import {
  fetchMyTrips,
  cancelTrip,
  type Trip,
} from '../api/trips';

const { Title, Text } = Typography;

// Стили для улучшенного дизайна
const styles = {
  pageContainer: {
    padding: '0 0 24px 0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 16,
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
  },
  headerTitle: {
    margin: 0,
    color: '#fff',
    fontWeight: 600,
  },
  createButton: {
    background: '#fff',
    color: '#667eea',
    border: 'none',
    fontWeight: 600,
    height: 40,
    borderRadius: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  tabsCard: {
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: 'none',
  },
  bookingCard: {
    marginBottom: 16,
    borderRadius: 16,
    border: '1px solid #f0f0f0',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  bookingCardHover: {
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    transform: 'translateY(-2px)',
  },
  bookingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bookingAvatar: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    flexShrink: 0,
  },
  bookingInfo: {
    flex: 1,
    minWidth: 0,
  },
  bookingName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: 2,
  },
  bookingMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  seatsTag: {
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontWeight: 500,
  },
  timeTag: {
    background: '#f5f5f5',
    color: '#666',
    border: 'none',
    borderRadius: 6,
  },
  bookingMessage: {
    background: '#f8f9fa',
    borderRadius: 10,
    padding: '10px 14px',
    marginBottom: 14,
    borderLeft: '3px solid #667eea',
  },
  bookingMessageText: {
    color: '#555',
    fontSize: 14,
    fontStyle: 'italic' as const,
    margin: 0,
  },
  actionButtons: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  },
  confirmButton: {
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    border: 'none',
    color: '#fff',
    fontWeight: 600,
    borderRadius: 8,
    height: 36,
    paddingLeft: 16,
    paddingRight: 16,
    boxShadow: '0 2px 8px rgba(17, 153, 142, 0.3)',
  },
  rejectButton: {
    background: '#fff',
    border: '1px solid #ff4d4f',
    color: '#ff4d4f',
    fontWeight: 500,
    borderRadius: 8,
    height: 36,
    paddingLeft: 16,
    paddingRight: 16,
  },
  completeButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    color: '#fff',
    fontWeight: 500,
    borderRadius: 8,
    height: 34,
    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
  },
  cancelButton: {
    background: '#fff',
    border: '1px solid #d9d9d9',
    color: '#666',
    fontWeight: 500,
    borderRadius: 8,
    height: 34,
  },
  announcementWrapper: {
    marginBottom: 16,
    position: 'relative' as const,
  },
  announcementActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid #f0f0f0',
  },
  statusBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    zIndex: 1,
  },
  emptyState: {
    padding: '40px 20px',
  },
  tripInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#888',
    fontSize: 13,
  },
};

// Компонент карточки бронирования
interface BookingCardProps {
  booking: Booking;
  onConfirm: (id: number) => void;
  onReject: (id: number) => void;
  t: (key: string) => string;
}

function BookingCardItem({ booking, onConfirm, onReject, t }: BookingCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Получаем информацию о поездке из бронирования
  const tripInfo = booking.announcement_info;

  return (
    <Card
      style={{
        ...styles.bookingCard,
        ...(isHovered ? styles.bookingCardHover : {}),
      }}
      styles={{ body: { padding: 16 } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Информация о поездке */}
      {tripInfo && (
        <div style={{ 
          marginBottom: 12, 
          padding: '8px 12px', 
          background: '#f8f9fa', 
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <CarOutlined style={{ color: '#667eea' }} />
          <Text style={{ fontWeight: 500 }}>
            {tripInfo.from_location} → {tripInfo.to_location}
          </Text>
          {tripInfo.departure_time && (
            <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12 }}>
              {dayjs(tripInfo.departure_time).format('DD.MM HH:mm')}
            </Text>
          )}
        </div>
      )}

      {/* Шапка с пассажиром */}
      <div style={styles.bookingHeader}>
        <Avatar 
          size={48} 
          icon={<UserOutlined />} 
          src={booking.passenger_photo}
          style={styles.bookingAvatar}
        />
        <div style={styles.bookingInfo}>
          <div style={styles.bookingName}>
            {booking.passenger_name || t('booking.passenger')}
          </div>
          <div style={styles.bookingMeta}>
            <Tag style={styles.seatsTag}>
              {booking.seats_count} {booking.seats_count === 1 ? t('trip.seat') : t('trip.seats')}
            </Tag>
            {booking.created_at && (
              <Tag icon={<ClockCircleOutlined />} style={styles.timeTag}>
                {dayjs(booking.created_at).format('DD.MM HH:mm')}
              </Tag>
            )}
          </div>
        </div>
        
        {/* Контакты */}
        <Space size={4}>
          {booking.passenger_phone && (
            <Tooltip title={t('contact.call')}>
              <Button
                type="text"
                size="small"
                icon={<PhoneOutlined />}
                onClick={() => window.location.href = `tel:${booking.passenger_phone}`}
                style={{ color: '#667eea' }}
              />
            </Tooltip>
          )}
          {booking.passenger_telegram && (
            <Tooltip title={t('contact.telegram')}>
              <Button
                type="text"
                size="small"
                icon={<MessageOutlined />}
                onClick={() => window.open(`https://t.me/${booking.passenger_telegram}`, '_blank')}
                style={{ color: '#667eea' }}
              />
            </Tooltip>
          )}
        </Space>
      </div>

      {/* Сообщение от пассажира */}
      {booking.message && (
        <div style={styles.bookingMessage}>
          <Text style={styles.bookingMessageText}>
            "{booking.message}"
          </Text>
        </div>
      )}

      {/* Кнопки действий */}
      <div style={styles.actionButtons}>
        <Button
          icon={<CloseCircleOutlined />}
          onClick={() => onReject(booking.id)}
          style={styles.rejectButton}
        >
          {t('booking.reject')}
        </Button>
        <Button
          icon={<CheckCircleOutlined />}
          onClick={() => onConfirm(booking.id)}
          style={styles.confirmButton}
        >
          {t('booking.accept')}
        </Button>
      </div>
    </Card>
  );
}

// Компонент обёртки для объявления с кнопками
interface AnnouncementWrapperProps {
  announcement: Announcement;
  onComplete: (id: number) => void;
  onCancel: (id: number) => void;
  t: (key: string) => string;
}

function AnnouncementWrapper({ announcement, onComplete, onCancel, t }: AnnouncementWrapperProps) {
  return (
    <div style={styles.announcementWrapper}>
      {/* Бейдж статуса */}
      {announcement.status === 'full' && (
        <div style={styles.statusBadge}>
          <Tag color="orange">{t('announcementStatus.full')}</Tag>
        </div>
      )}
      
      <AnnouncementCard
        announcement={announcement}
        showDriverInfo={false}
      />
      
      {/* Кнопки действий */}
      {['active', 'full'].includes(announcement.status) && (
        <div style={styles.announcementActions}>
          <Button
            icon={<StopOutlined />}
            onClick={() => onCancel(announcement.id)}
            style={styles.cancelButton}
          >
            {t('common.cancel')}
          </Button>
          <Button
            icon={<CheckOutlined />}
            onClick={() => onComplete(announcement.id)}
            style={styles.completeButton}
          >
            {t('trip.finish')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MyAdsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isDriver = user?.is_driver;

  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadData();
  }, [isDriver, i18n.language]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const lng = i18n.language?.slice(0, 2);
  
      if (isDriver) {
        const [annData, bookingsData] = await Promise.all([
          fetchMyAnnouncements(lng),
          fetchIncomingBookings(lng),
        ]);
  
        setAnnouncements(annData);
        setBookings(bookingsData);
      } else {
        const tripsData = await fetchMyTrips(lng);
        setTrips(tripsData);
      }
    } catch (error) {
      console.error(error);
      message.error(t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };
  

  // === Действия для пассажира ===
  const handleCancelTrip = async (tripId: number) => {
    Modal.confirm({
      title: t('trip.cancelConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await cancelTrip(tripId);
          message.success(t('common.success'));
          loadData();
        } catch (error: any) {
          message.error(error?.response?.data?.detail || t('errors.serverError'));
        }
      },
    });
  };

  // === Действия для водителя ===
  const handleCancelAnnouncement = async (announcementId: number) => {
    Modal.confirm({
      title: t('announcement.cancelConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await cancelAnnouncement(announcementId);
          message.success(t('common.success'));
          loadData();
        } catch (error: any) {
          message.error(error?.response?.data?.detail || t('errors.serverError'));
        }
      },
    });
  };

  const handleCompleteAnnouncement = async (announcementId: number) => {
    Modal.confirm({
      title: t('announcement.completeConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await completeAnnouncement(announcementId);
          message.success(t('common.success'));
          loadData();
        } catch (error: any) {
          message.error(error?.response?.data?.detail || t('errors.serverError'));
        }
      },
    });
  };

  const handleConfirmBooking = async (bookingId: number) => {
    try {
      await confirmBooking(bookingId);
      message.success(t('booking.confirmed'));
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || t('errors.serverError'));
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    Modal.confirm({
      title: t('booking.rejectConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await rejectBooking(bookingId);
          message.success(t('common.success'));
          loadData();
        } catch (error: any) {
          message.error(error?.response?.data?.detail || t('errors.serverError'));
        }
      },
    });
  };

  // Фильтрация по статусу
  const activeAnnouncements = announcements.filter(a =>
    ['active', 'full'].includes(a.status)
  );
  const completedAnnouncements = announcements.filter(a =>
    ['completed', 'cancelled', 'expired'].includes(a.status)
  );

  const activeTrips = trips.filter(t =>
    ['open', 'taken', 'in_progress'].includes(t.status)
  );
  const completedTrips = trips.filter(t =>
    ['completed', 'cancelled', 'expired'].includes(t.status)
  );

  const pendingBookings = bookings.filter(b => b.status === 'pending');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">{t('common.loading')}</Text>
        </div>
      </div>
    );
  }

  const tabItems = isDriver
    ? [
        {
          key: 'active',
          label: (
            <span style={{ fontWeight: activeTab === 'active' ? 600 : 400 }}>
              📋 {t('announcementStatus.active')} ({activeAnnouncements.length})
            </span>
          ),
          children: (
            <div style={{ padding: '8px 0' }}>
              {activeAnnouncements.length > 0 ? (
                activeAnnouncements.map(ann => (
                  <AnnouncementWrapper
                    key={ann.id}
                    announcement={ann}
                    onComplete={handleCompleteAnnouncement}
                    onCancel={handleCancelAnnouncement}
                    t={t}
                  />
                ))
              ) : (
                <Empty 
                  description={t('common.noData')} 
                  style={styles.emptyState}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          ),
        },
        {
          key: 'bookings',
          label: (
            <Badge count={pendingBookings.length} size="small" offset={[8, 0]}>
              <span style={{ fontWeight: activeTab === 'bookings' ? 600 : 400 }}>
                📩 {t('booking.requests')}
              </span>
            </Badge>
          ),
          children: (
            <div style={{ padding: '8px 0' }}>
              {pendingBookings.length > 0 ? (
                pendingBookings.map(booking => (
                  <BookingCardItem
                    key={booking.id}
                    booking={booking}
                    onConfirm={handleConfirmBooking}
                    onReject={handleRejectBooking}
                    t={t}
                  />
                ))
              ) : (
                <Empty 
                  description={t('booking.noRequests')} 
                  style={styles.emptyState}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          ),
        },
        {
          key: 'completed',
          label: (
            <span style={{ fontWeight: activeTab === 'completed' ? 600 : 400 }}>
              ✅ {t('tripStatus.completed')} ({completedAnnouncements.length})
            </span>
          ),
          children: (
            <div style={{ padding: '8px 0' }}>
              {completedAnnouncements.length > 0 ? (
                completedAnnouncements.map(ann => (
                  <div key={ann.id} style={{ marginBottom: 16, opacity: 0.8 }}>
                    <AnnouncementCard
                      announcement={ann}
                      showDriverInfo={false}
                    />
                  </div>
                ))
              ) : (
                <Empty 
                  description={t('common.noData')} 
                  style={styles.emptyState}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          ),
        },
      ]
    : [
        {
          key: 'active',
          label: (
            <span style={{ fontWeight: activeTab === 'active' ? 600 : 400 }}>
              📋 {t('tripStatus.open')} ({activeTrips.length})
            </span>
          ),
          children: (
            <div style={{ padding: '8px 0' }}>
              {activeTrips.length > 0 ? (
                activeTrips.map(trip => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onAction={
                      trip.status === 'open'
                        ? () => handleCancelTrip(trip.id)
                        : undefined
                    }
                    actionLabel={trip.status === 'open' ? t('trip.cancel') : undefined}
                  />
                ))
              ) : (
                <Empty 
                  description={t('common.noData')} 
                  style={styles.emptyState}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          ),
        },
        {
          key: 'completed',
          label: (
            <span style={{ fontWeight: activeTab === 'completed' ? 600 : 400 }}>
              ✅ {t('tripStatus.completed')} ({completedTrips.length})
            </span>
          ),
          children: (
            <div style={{ padding: '8px 0' }}>
              {completedTrips.length > 0 ? (
                completedTrips.map(trip => (
                  <div key={trip.id} style={{ marginBottom: 16, opacity: 0.8 }}>
                    <TripCard trip={trip} />
                  </div>
                ))
              ) : (
                <Empty 
                  description={t('common.noData')} 
                  style={styles.emptyState}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          ),
        },
      ];

  return (
    <div style={styles.pageContainer}>
      {/* Красивая шапка */}
      <div style={styles.header}>
        <Title level={4} style={styles.headerTitle}>
          {isDriver ? t('create.announcementTitle') : t('create.tripTitle')}
        </Title>

        <Button
          icon={<PlusOutlined />}
          onClick={() => setShowCreateModal(true)}
          style={styles.createButton}
        >
          {t('common.create')}
        </Button>
      </div>

      {/* Табы */}
      <Card style={styles.tabsCard} styles={{ body: { padding: '12px 16px' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ marginBottom: -12 }}
        />
      </Card>

      {/* Модалка создания */}
      <Modal
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={600}
        destroyOnClose
        styles={{ 
          content: { borderRadius: 16 },
          header: { borderRadius: '16px 16px 0 0' }
        }}
      >
        {isDriver ? (
          <CreateAnnouncementForm
            onSuccess={() => {
              setShowCreateModal(false);
              loadData();
            }}
            onCancel={() => setShowCreateModal(false)}
            onAddCar={() => navigate('/profile')}
          />
        ) : (
          <CreateTripForm
            onSuccess={() => {
              setShowCreateModal(false);
              loadData();
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
      </Modal>
    </div>
  );
}