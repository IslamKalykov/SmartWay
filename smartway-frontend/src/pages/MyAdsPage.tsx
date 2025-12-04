// src/pages/MyAdsPage.tsx
import { useState, useEffect } from 'react';
import {
  Card, Typography, Button, Tabs, Empty, Spin, Modal, message, Badge, Space
} from 'antd';
import {
  PlusOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

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
      if (isDriver) {
        const [annData, bookingsData] = await Promise.all([
          fetchMyAnnouncements(),
          fetchIncomingBookings(),
        ]);
        setAnnouncements(annData);
        setBookings(bookingsData);
      } else {
        const tripsData = await fetchMyTrips();
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
    try {
      await cancelTrip(tripId);
      message.success(t('common.success'));
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || t('errors.serverError'));
    }
  };

  // === Действия для водителя ===
  const handleCancelAnnouncement = async (announcementId: number) => {
    try {
      await cancelAnnouncement(announcementId);
      message.success(t('common.success'));
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || t('errors.serverError'));
    }
  };

  const handleCompleteAnnouncement = async (announcementId: number) => {
    try {
      await completeAnnouncement(announcementId);
      message.success(t('common.success'));
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || t('errors.serverError'));
    }
  };

  const handleConfirmBooking = async (bookingId: number) => {
    try {
      await confirmBooking(bookingId);
      message.success(t('common.success'));
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || t('errors.serverError'));
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    try {
      await rejectBooking(bookingId);
      message.success(t('common.success'));
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || t('errors.serverError'));
    }
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
            <span>
              {t('announcementStatus.active')} ({activeAnnouncements.length})
            </span>
          ),
          children: (
            <div>
              {activeAnnouncements.length > 0 ? (
                activeAnnouncements.map(ann => (
                  <AnnouncementCard
                    key={ann.id}
                    announcement={ann}
                    showDriverInfo={false}
                  />
                ))
              ) : (
                <Empty description={t('common.noData')} />
              )}
            </div>
          ),
        },
        {
          key: 'bookings',
          label: (
            <Badge count={pendingBookings.length} size="small">
              <span style={{ paddingRight: pendingBookings.length > 0 ? 12 : 0 }}>
                {t('booking.title')}
              </span>
            </Badge>
          ),
          children: (
            <div>
              {bookings.length > 0 ? (
                bookings.map(booking => (
                  <Card
                    key={booking.id}
                    style={{ marginBottom: 12, borderRadius: 12 }}
                    bodyStyle={{ padding: 16 }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>{booking.passenger_name}</Text>
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        {booking.seats_count} {t('trip.seats')}
                      </Text>
                    </div>

                    {booking.message && (
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary">{booking.message}</Text>
                      </div>
                    )}

                    {booking.status === 'pending' && (
                      <Space>
                        <Button
                          type="primary"
                          size="small"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleConfirmBooking(booking.id)}
                        >
                          {t('common.confirm')}
                        </Button>
                        <Button
                          danger
                          size="small"
                          icon={<CloseCircleOutlined />}
                          onClick={() => handleRejectBooking(booking.id)}
                        >
                          {t('common.cancel')}
                        </Button>
                      </Space>
                    )}

                    {booking.status !== 'pending' && (
                      <Text
                        type={booking.status === 'confirmed' ? 'success' : 'danger'}
                      >
                        {booking.status === 'confirmed'
                          ? t('booking.confirmed')
                          : t('booking.rejected')}
                      </Text>
                    )}
                  </Card>
                ))
              ) : (
                <Empty description={t('common.noData')} />
              )}
            </div>
          ),
        },
        {
          key: 'completed',
          label: `${t('tripStatus.completed')} (${completedAnnouncements.length})`,
          children: (
            <div>
              {completedAnnouncements.length > 0 ? (
                completedAnnouncements.map(ann => (
                  <AnnouncementCard
                    key={ann.id}
                    announcement={ann}
                    showDriverInfo={false}
                  />
                ))
              ) : (
                <Empty description={t('common.noData')} />
              )}
            </div>
          ),
        },
      ]
    : [
        {
          key: 'active',
          label: `${t('tripStatus.open')} (${activeTrips.length})`,
          children: (
            <div>
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
                <Empty description={t('common.noData')} />
              )}
            </div>
          ),
        },
        {
          key: 'completed',
          label: `${t('tripStatus.completed')} (${completedTrips.length})`,
          children: (
            <div>
              {completedTrips.length > 0 ? (
                completedTrips.map(trip => (
                  <TripCard key={trip.id} trip={trip} />
                ))
              ) : (
                <Empty description={t('common.noData')} />
              )}
            </div>
          ),
        },
      ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          {isDriver ? t('create.announcementTitle') : t('create.tripTitle')}
        </Title>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowCreateModal(true)}
        >
          {isDriver ? t('home.createAnnouncement') : t('home.createTrip')}
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      {/* Модалка создания */}
      <Modal
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={600}
        destroyOnClose
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