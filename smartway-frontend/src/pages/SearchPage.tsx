// src/pages/SearchPage.tsx
import { useState, useEffect } from 'react';
import {
  Typography, Empty, Spin, Modal, InputNumber, Form, Input, message, Alert, Tabs,
  Tag, Button, Divider, Avatar, Tooltip
} from 'antd';
import {
  UserOutlined, PhoneOutlined, ClockCircleOutlined,
  CheckOutlined, CloseOutlined, SendOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import { useAuth } from '../auth/AuthContext';
import SearchFilter from '../components/SearchFilter';
import type { SearchFilters } from '../components/SearchFilter';
import TripCard from '../components/TripCard';
import AnnouncementCard from '../components/AnnouncementCard';

import {
  fetchAvailableAnnouncements,
  createBooking,
  type Announcement,
} from '../api/announcements';
import {
  fetchAvailableTrips,
  takeTrip,
  fetchMyDriverTrips,
  releaseTrip,
  finishTrip,
  type Trip,
} from '../api/trips';
import { getMyCars, type Car } from '../api/auth';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ==================== Стили ====================
const styles = {
  routeBlock: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    marginBottom: 16,
  },
  routeText: {
    fontSize: 18,
    fontWeight: 600,
    color: '#fff',
    marginBottom: 8,
  },
  routeMeta: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap' as const,
  },
  routeMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  personCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: '#f8f9fa',
    borderRadius: 10,
  },
  personInfo: {
    flex: 1,
    minWidth: 0,
  },
  personName: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 2,
  },
  contactButtons: {
    display: 'flex',
    gap: 8,
  },
  contactBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telegramBtn: {
    background: 'linear-gradient(135deg, #0088cc 0%, #00c6ff 100%)',
    border: 'none',
    color: '#fff',
  },
  phoneBtn: {
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    border: 'none',
    color: '#fff',
  },
  conditionsGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  conditionTag: {
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 13,
    margin: 0,
  },
  priceBlock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#f0fdf4',
    borderRadius: 10,
    border: '1px solid #bbf7d0',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#16a34a',
  },
  actionButtons: {
    display: 'flex',
    gap: 10,
    marginTop: 20,
  },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    fontWeight: 600,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
  },
  dangerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    fontWeight: 500,
  },
  successBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    fontWeight: 600,
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    border: 'none',
  },
  comment: {
    padding: 12,
    background: '#f8f9fa',
    borderRadius: 10,
    borderLeft: '3px solid #667eea',
    fontStyle: 'italic' as const,
    color: '#555',
  },
};

// ==================== Компонент детальной модалки поездки ====================
interface TripDetailModalProps {
  trip: Trip | null;
  visible: boolean;
  onClose: () => void;
  onTake?: () => void;
  onRelease?: () => void;
  onFinish?: () => void;
  cars?: Car[];
  isMyTrip?: boolean;
  loading?: boolean;
  t: (key: string) => string;
}

function TripDetailModal({
  trip, visible, onClose, onTake, onRelease, onFinish,
  cars = [], isMyTrip = false, loading = false, t
}: TripDetailModalProps) {
  if (!trip) return null;

  const phoneNumber = trip.contact_phone || trip.passenger_phone;
  const cleanPhone = phoneNumber?.replace(/\D/g, '');
  const telegramUsername = trip.passenger_telegram;

  const handleTelegram = () => {
    if (telegramUsername) {
      window.open(`https://t.me/${telegramUsername.replace('@', '')}`, '_blank');
    } else if (cleanPhone) {
      window.open(`https://t.me/+${cleanPhone}`, '_blank');
    }
  };

  const handleCall = () => {
    if (cleanPhone) {
      window.location.href = `tel:+${cleanPhone}`;
    }
  };

  const hasCar = cars.length > 0;
  const canTake = trip.status === 'open' && hasCar && !isMyTrip;
  const canRelease = isMyTrip && ['taken', 'in_progress'].includes(trip.status);
  const canFinish = isMyTrip && ['taken', 'in_progress'].includes(trip.status);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={420}
      styles={{ content: { borderRadius: 16, padding: 20 } }}
      centered
    >
      {/* Маршрут */}
      <div style={styles.routeBlock}>
        <div style={styles.routeText}>
          {trip.from_location_display || trip.from_location}
          <span style={{ margin: '0 8px', opacity: 0.7 }}>→</span>
          {trip.to_location_display || trip.to_location}
        </div>
        <div style={styles.routeMeta}>
          <div style={styles.routeMetaItem}>
            <ClockCircleOutlined />
            {dayjs(trip.departure_time).format('DD MMM, HH:mm')}
          </div>
          <div style={styles.routeMetaItem}>
            <UserOutlined />
            {trip.passengers_count} {trip.passengers_count === 1 ? t('trip.seat') : t('trip.seats')}
          </div>
        </div>
      </div>

      {/* Цена */}
      <div style={styles.priceBlock}>
        <Text type="secondary">{t('create.priceLabel')}</Text>
        <div style={{ textAlign: 'right' }}>
          {trip.price ? (
            <>
              <span style={styles.priceValue}>{trip.price} сом</span>
              {trip.is_negotiable && (
                <div><Text type="secondary" style={{ fontSize: 12 }}>{t('trip.negotiable')}</Text></div>
              )}
            </>
          ) : (
            <Tag color="orange" style={{ fontSize: 14, padding: '4px 12px', margin: 0 }}>
              {t('trip.negotiable')}
            </Tag>
          )}
        </div>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Пассажир */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>{t('trip.passenger')}</div>
        <div style={styles.personCard}>
          <Avatar
            size={48}
            icon={<UserOutlined />}
            src={trip.passenger_photo}
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          />
          <div style={styles.personInfo}>
            <div style={styles.personName}>
              {trip.passenger_name || t('trip.passenger')}
            </div>
            {trip.passenger_verified && (
              <Tag color="green" style={{ margin: 0, fontSize: 11 }}>
                <SafetyCertificateOutlined /> {t('profile.verified')}
              </Tag>
            )}
          </div>
          <div style={styles.contactButtons}>
            {(telegramUsername || cleanPhone) && (
              <Tooltip title="Telegram">
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleTelegram}
                  style={{ ...styles.contactBtn, ...styles.telegramBtn }}
                />
              </Tooltip>
            )}
            {cleanPhone && (
              <Tooltip title={t('contact.call')}>
                <Button
                  type="primary"
                  icon={<PhoneOutlined />}
                  onClick={handleCall}
                  style={{ ...styles.contactBtn, ...styles.phoneBtn }}
                />
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Условия поездки */}
      {(trip.allow_smoking || trip.allow_pets || trip.allow_big_luggage ||
        trip.baggage_help || trip.with_child || trip.prefer_verified_driver) && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>{t('search.conditions')}</div>
          <div style={styles.conditionsGrid}>
            {trip.allow_smoking && <Tag style={styles.conditionTag}>🚬 {t('filter.smoking')}</Tag>}
            {trip.allow_pets && <Tag style={styles.conditionTag}>🐾 {t('filter.pets')}</Tag>}
            {trip.allow_big_luggage && <Tag style={styles.conditionTag}>🧳 {t('filter.luggage')}</Tag>}
            {trip.baggage_help && <Tag style={styles.conditionTag}>💪 {t('filter.baggageHelp')}</Tag>}
            {trip.with_child && <Tag style={styles.conditionTag}>👶 {t('filter.withChild')}</Tag>}
            {trip.prefer_verified_driver && (
              <Tag color="blue" style={styles.conditionTag}>✓ {t('filter.verifiedDriver')}</Tag>
            )}
          </div>
        </div>
      )}

      {/* Комментарий */}
      {trip.comment && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>{t('create.commentLabel')}</div>
          <div style={styles.comment}>"{trip.comment}"</div>
        </div>
      )}

      {/* Кнопки действий */}
      <div style={styles.actionButtons}>
        {canTake && (
          <Button
            type="primary"
            size="large"
            onClick={onTake}
            loading={loading}
            style={styles.primaryBtn}
          >
            {t('trip.take')}
          </Button>
        )}

        {trip.status === 'open' && !hasCar && !isMyTrip && (
          <Button size="large" disabled style={{ ...styles.dangerBtn, flex: 1 }}>
            {t('trip.addCarFirst')}
          </Button>
        )}

        {canFinish && (
          <Button
            type="primary"
            size="large"
            icon={<CheckOutlined />}
            onClick={onFinish}
            loading={loading}
            style={styles.successBtn}
          >
            {t('trip.finish')}
          </Button>
        )}

        {canRelease && (
          <Button
            danger
            size="large"
            icon={<CloseOutlined />}
            onClick={onRelease}
            loading={loading}
            style={styles.dangerBtn}
          >
            {t('trip.release')}
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ==================== Главный компонент ====================
export default function SearchPage() {
  const { t, i18n } = useTranslation();
  const { user, isAuth } = useAuth();
  const isDriver = user?.is_driver ?? false;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [activeTab, setActiveTab] = useState('available');

  // Модальные окна
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedMyTrip, setSelectedMyTrip] = useState<Trip | null>(null);
  const [bookingSeats, setBookingSeats] = useState(1);
  const [bookingMessage, setBookingMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isAuth) {
      setLoading(false);
      setError('Требуется авторизация');
      return;
    }
    loadData();
  }, [isAuth, isDriver, i18n.language]);

  const loadData = async (searchFilters?: SearchFilters) => {
    setError(null);
    const currentFilters = searchFilters || filters;

    try {
      setLoading(true);

      const lng = i18n.language?.slice(0, 2);

      const annPromise = fetchAvailableAnnouncements(currentFilters, lng);

      if (isDriver) {
        const [annData, tripsRes, carsRes, myTripsRes] = await Promise.all([
          annPromise,
          fetchAvailableTrips(currentFilters, lng),
          getMyCars(),
          fetchMyDriverTrips(lng),
        ]);

        setAnnouncements(annData || []);
        setTrips(tripsRes || []);
        setCars(carsRes || []);
        setMyTrips(myTripsRes || []);
      } else {
        const annData = await annPromise;
        setAnnouncements(annData || []);
      }

    } catch (err: any) {
      console.error('Load data error:', err);
      setError(err?.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (newFilters: SearchFilters) => {
    setFilters(newFilters);
    loadData(newFilters);
  };

  // === Действия для пассажира ===
  const handleBookAnnouncement = async () => {
    if (!selectedAnnouncement) return;

    try {
      setActionLoading(true);
      await createBooking({
        announcement: selectedAnnouncement.id,
        seats_count: bookingSeats,
        message: bookingMessage,
      });
      message.success(t('common.success'));
      setSelectedAnnouncement(null);
      setBookingSeats(1);
      setBookingMessage('');
      loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || t('errors.serverError'));
    } finally {
      setActionLoading(false);
    }
  };

  // === Действия для водителя ===
  const handleTakeTrip = async () => {
    if (!selectedTrip || cars.length === 0) return;

    try {
      setActionLoading(true);
      await takeTrip(selectedTrip.id, cars[0].id);
      message.success(t('trip.taken'));
      setSelectedTrip(null);
      loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || t('errors.serverError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseTrip = async () => {
    if (!selectedMyTrip) return;

    Modal.confirm({
      title: t('trip.releaseConfirm'),
      content: t('trip.releaseHint'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          setActionLoading(true);
          await releaseTrip(selectedMyTrip.id);
          message.success(t('trip.released'));
          setSelectedMyTrip(null);
          loadData();
        } catch (err: any) {
          message.error(err?.response?.data?.detail || t('errors.serverError'));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleFinishTrip = async () => {
    if (!selectedMyTrip) return;

    Modal.confirm({
      title: t('trip.finishConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          setActionLoading(true);
          await finishTrip(selectedMyTrip.id);
          message.success(t('trip.finished'));
          setSelectedMyTrip(null);
          loadData();
        } catch (err: any) {
          message.error(err?.response?.data?.detail || t('errors.serverError'));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Фильтрация на клиенте
  const filterData = <T extends {
    from_location?: number | string;
    to_location?: number | string;
    departure_time?: string;
    allow_smoking?: boolean;
    allow_pets?: boolean;
    allow_big_luggage?: boolean;
  }>(items: T[]): T[] => {
    return items.filter(item => {
      if (filters.from_location) {
        const itemFromId = typeof item.from_location === 'number'
          ? item.from_location
          : parseInt(item.from_location as string);
        if (itemFromId !== filters.from_location) return false;
      }

      if (filters.to_location) {
        const itemToId = typeof item.to_location === 'number'
          ? item.to_location
          : parseInt(item.to_location as string);
        if (itemToId !== filters.to_location) return false;
      }

      if (filters.date && item.departure_time) {
        const itemDate = new Date(item.departure_time).toISOString().split('T')[0];
        if (itemDate !== filters.date) return false;
      }

      if (filters.allow_smoking && !item.allow_smoking) return false;
      if (filters.allow_pets && !item.allow_pets) return false;
      if (filters.allow_big_luggage && !item.allow_big_luggage) return false;

      return true;
    });
  };

  const filteredAnnouncements = filterData(announcements);
  const filteredTrips = filterData(trips);
  const activeMyTrips = myTrips.filter(t => ['taken', 'in_progress'].includes(t.status));

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

  // Табы для водителя
  const driverTabs = [
    {
      key: 'available',
      label: `📋 ${t('search.available')} (${filteredTrips.length})`,
      children: filteredTrips.length > 0 ? (
        <div>
          {filteredTrips.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              onClick={() => setSelectedTrip(trip)}
              showPassengerInfo={true}
            />
          ))}
        </div>
      ) : (
        <Empty description={t('search.noResults')} />
      ),
    },
    {
      key: 'my',
      label: `🚗 ${t('search.myTrips')} (${activeMyTrips.length})`,
      children: activeMyTrips.length > 0 ? (
        <div>
          {activeMyTrips.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              onClick={() => setSelectedMyTrip(trip)}
              showPassengerInfo={true}
            />
          ))}
        </div>
      ) : (
        <Empty description={t('search.noMyTrips')} />
      ),
    },
    {
      key: 'announcements',
      label: `🚘 ${t('search.driverAnnouncements')} (${filteredAnnouncements.length})`,
      children: filteredAnnouncements.length > 0 ? (
        <div>
          {filteredAnnouncements.map(ann => (
            <AnnouncementCard
              key={ann.id}
              announcement={ann}
              onClick={() => setSelectedAnnouncement(ann)}
              showDriverInfo={true}
            />
          ))}
        </div>
      ) : (
        <Empty description={t('search.noResults')} />
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        {isDriver ? t('search.titleDriver') : t('search.title')}
      </Title>

      {error && (
        <Alert
          message={error}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      <SearchFilter onSearch={handleSearch} loading={loading} showRideOptions={true} />

      {isDriver ? (
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={driverTabs} />
      ) : (
        filteredAnnouncements.length > 0 ? (
          <div>
            {filteredAnnouncements.map(ann => (
              <AnnouncementCard
                key={ann.id}
                announcement={ann}
                onClick={() => setSelectedAnnouncement(ann)}
                onBook={() => setSelectedAnnouncement(ann)}
                showDriverInfo={true}
              />
            ))}
          </div>
        ) : (
          <Empty
            description={
              <span>
                {t('search.noResults')}<br />
                <Text type="secondary">{t('search.noResultsHint')}</Text>
              </span>
            }
          />
        )
      )}

      {/* Модалка детали поездки (доступные) */}
      <TripDetailModal
        trip={selectedTrip}
        visible={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onTake={handleTakeTrip}
        cars={cars}
        isMyTrip={false}
        loading={actionLoading}
        t={t}
      />

      {/* Модалка детали поездки (мои) */}
      <TripDetailModal
        trip={selectedMyTrip}
        visible={!!selectedMyTrip}
        onClose={() => setSelectedMyTrip(null)}
        onRelease={handleReleaseTrip}
        onFinish={handleFinishTrip}
        cars={cars}
        isMyTrip={true}
        loading={actionLoading}
        t={t}
      />

      {/* Модалка бронирования объявления */}
      <Modal
        title={t('booking.title')}
        open={!!selectedAnnouncement}
        onCancel={() => setSelectedAnnouncement(null)}
        onOk={handleBookAnnouncement}
        okText={t('booking.confirm')}
        cancelText={t('common.cancel')}
        confirmLoading={actionLoading}
        styles={{ content: { borderRadius: 16 } }}
      >
        {selectedAnnouncement && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16 }}>
                {selectedAnnouncement.from_location_display || selectedAnnouncement.from_location}
                {' → '}
                {selectedAnnouncement.to_location_display || selectedAnnouncement.to_location}
              </Text>
              <br />
              <Text type="secondary">
                {selectedAnnouncement.price_per_seat} сом / {t('trip.seat')}
              </Text>
            </div>

            <Form layout="vertical">
              <Form.Item label={t('booking.seatsCount')}>
                <InputNumber
                  min={1}
                  max={selectedAnnouncement.free_seats || 1}
                  value={bookingSeats}
                  onChange={(v) => setBookingSeats(v || 1)}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label={t('booking.message')}>
                <TextArea
                  value={bookingMessage}
                  onChange={(e) => setBookingMessage(e.target.value)}
                  placeholder={t('booking.messagePlaceholder')}
                  rows={3}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}