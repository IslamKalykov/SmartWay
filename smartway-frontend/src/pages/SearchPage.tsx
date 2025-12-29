// src/pages/SearchPage.tsx
import { useState, useEffect } from 'react';
import {
  Typography,
  Empty,
  Spin,
  Modal,
  InputNumber,
  Form,
  Input,
  message,
  Alert,
  Tabs,
  Tag,
  Button,
  Divider,
  Avatar,
  Card,
  DatePicker,
  Switch,
  Space,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  CheckOutlined,
  CloseOutlined,
  SendOutlined,
  SafetyCertificateOutlined,
  FilterOutlined,
  SearchOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import { useAuth } from '../auth/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import LocationSelect from '../components/LocationSelect';
import type { SearchFilters } from '../components/SearchFilter';
import TripCard from '../components/TripCard';
import AnnouncementCard from '../components/AnnouncementCard';

import {
  fetchAvailableAnnouncements,
  createBooking,
  type Announcement,
  fetchMyBookings,
  type Booking,
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

const { Text } = Typography;
const { TextArea } = Input;

// ==================== Стили ====================
const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    padding: 0,
    paddingBottom: 100,
    position: 'relative',
    minHeight: '100%',
  },
  
  tabsPlaceholder: {
    height: 56,
  },
  
  contentArea: {
    paddingTop: 16,
  },
  
  emptyState: {
    padding: '40px 0',
  },
  
  // FAB кнопка фильтра
  fabButton: {
    position: 'fixed',
    left: 'auto',
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    zIndex: 100,
  },
  
  fabButtonHover: {
    transform: 'scale(1.1)',
    boxShadow: '0 6px 25px rgba(102, 126, 234, 0.5)',
  },
  
  fabIcon: {
    fontSize: 24,
    color: '#fff',
  },
  
  // Индикатор активных фильтров
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#ff4d4f',
    color: '#fff',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
  },
  
  // Модалка деталей поездки
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

// ==================== FAB компонент ====================
interface FABProps {
  onClick: () => void;
  activeFiltersCount?: number;
}

function FilterFAB({ onClick, activeFiltersCount = 0 }: FABProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.fabButton,
        ...(isHovered ? styles.fabButtonHover : {}),
      }}
      aria-label="Фильтры"
    >
      <FilterOutlined style={styles.fabIcon} />
      {activeFiltersCount > 0 && (
        <span style={styles.filterBadge}>{activeFiltersCount}</span>
      )}
    </button>
  );
}

// ==================== Компонент модалки фильтров ====================
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  onClear: () => void;
  loading?: boolean;
  t: (key: string) => string;
}

function FilterModal({ visible, onClose, filters, onApply, onClear, loading, t }: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, visible]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({});
    onClear();
    onClose();
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FilterOutlined />
          {t('search.filters')}
        </div>
      }
      styles={{ content: { borderRadius: 16 } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Откуда */}
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            {t('search.from')}
          </Text>
          <LocationSelect
            value={localFilters.from_location}
            onChange={(id) => updateFilter('from_location', id)}
            placeholder={t('search.fromPlaceholder')}
          />
        </div>

        {/* Куда */}
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            {t('search.to')}
          </Text>
          <LocationSelect
            value={localFilters.to_location}
            onChange={(id) => updateFilter('to_location', id)}
            placeholder={t('search.toPlaceholder')}
            excludeId={localFilters.from_location}
          />
        </div>

        {/* Дата */}
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            {t('search.date')}
          </Text>
          <DatePicker
            value={localFilters.date ? dayjs(localFilters.date) : undefined}
            onChange={(date) => updateFilter('date', date?.format('YYYY-MM-DD'))}
            style={{ width: '100%' }}
            placeholder={t('search.date')}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Дополнительные фильтры */}
        <div>
          <Text strong style={{ marginBottom: 12, display: 'block' }}>
            {t('search.conditions')}
          </Text>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🚬 {t('rideOptions.allowSmoking')}</span>
              <Switch
                checked={localFilters.allow_smoking}
                onChange={(v) => updateFilter('allow_smoking', v || undefined)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🐾 {t('rideOptions.allowPets')}</span>
              <Switch
                checked={localFilters.allow_pets}
                onChange={(v) => updateFilter('allow_pets', v || undefined)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🧳 {t('rideOptions.allowBigLuggage')}</span>
              <Switch
                checked={localFilters.allow_big_luggage}
                onChange={(v) => updateFilter('allow_big_luggage', v || undefined)}
              />
            </div>
          </Space>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Кнопки */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Button
            icon={<ClearOutlined />}
            onClick={handleClear}
            style={{ flex: 1 }}
          >
            {t('search.clearFilters')}
          </Button>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleApply}
            loading={loading}
            style={{ flex: 1 }}
          >
            {t('search.searchBtn')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

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
  trip,
  visible,
  onClose,
  onTake,
  onRelease,
  onFinish,
  cars = [],
  isMyTrip = false,
  loading = false,
  t,
}: TripDetailModalProps) {
  if (!trip) return null;

  const phoneNumber = trip.contact_phone || trip.passenger_phone;
  const cleanPhone = phoneNumber?.replace(/\D/g, '');
  const telegramUsername = trip.passenger_telegram;

  const handleTelegram = () => {
    if (telegramUsername) {
      window.location.href = `https://t.me/${telegramUsername.replace('@', '')}`;
    } else if (cleanPhone) {
      window.location.href = `https://t.me/+${cleanPhone}`;
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
            {trip.passengers_count}{' '}
            {trip.passengers_count === 1 ? t('trip.seat') : t('trip.seats')}
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
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('trip.negotiable')}
                  </Text>
                </div>
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
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
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
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleTelegram}
                style={{ ...styles.contactBtn, ...styles.telegramBtn }}
              />
            )}
            {cleanPhone && (
              <Button
                type="primary"
                icon={<PhoneOutlined />}
                onClick={handleCall}
                style={{ ...styles.contactBtn, ...styles.phoneBtn }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Условия поездки */}
      {(trip.allow_smoking ||
        trip.allow_pets ||
        trip.allow_big_luggage ||
        trip.baggage_help ||
        trip.with_child ||
        trip.prefer_verified_driver) && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>{t('search.conditions')}</div>
          <div style={styles.conditionsGrid}>
            {trip.allow_smoking && (
              <Tag style={styles.conditionTag}>🚬 {t('filter.smoking')}</Tag>
            )}
            {trip.allow_pets && (
              <Tag style={styles.conditionTag}>🐾 {t('filter.pets')}</Tag>
            )}
            {trip.allow_big_luggage && (
              <Tag style={styles.conditionTag}>🧳 {t('filter.luggage')}</Tag>
            )}
            {trip.baggage_help && (
              <Tag style={styles.conditionTag}>💪 {t('filter.baggageHelp')}</Tag>
            )}
            {trip.with_child && (
              <Tag style={styles.conditionTag}>👶 {t('filter.withChild')}</Tag>
            )}
            {trip.prefer_verified_driver && (
              <Tag color="blue" style={styles.conditionTag}>
                ✓ {t('filter.verifiedDriver')}
              </Tag>
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
  const { user, isAuth, loading: authLoading } = useAuth();
  const isMobile = useIsMobile(768);
  const isDriver = !!user?.is_driver;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [activeTab, setActiveTab] = useState('available');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Модальные окна
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedMyTrip, setSelectedMyTrip] = useState<Trip | null>(null);
  const [bookingSeats, setBookingSeats] = useState(1);
  const [bookingMessage, setBookingMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Адаптивные стили для фиксированного header
  const stickyHeaderStyle: React.CSSProperties = {
    position: 'fixed',
    top: isMobile ? 56 : 64,
    left: isMobile ? 0 : '50%',
    right: isMobile ? 0 : 'auto',
    transform: isMobile ? 'none' : 'translateX(-50%)',
    width: isMobile ? '100%' : '100%',
    maxWidth: isMobile ? '100%' : 968,
    zIndex: 50,
    background: '#fff',
    padding: '8px 12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  const loadData = async (searchFilters?: SearchFilters) => {
    if (!isAuth) {
      setLoading(false);
      setError(t('errors.authRequired'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const lang = i18n.language?.slice(0, 2) || 'ru';

      if (isDriver) {
        const [tripsData, myTripsData, carsData] = await Promise.all([
          fetchAvailableTrips(searchFilters, lang),
          fetchMyDriverTrips(lang),
          getMyCars(),
        ]);
        setTrips(tripsData);
        setMyTrips(myTripsData);
        setCars(carsData);
        setBookings([]);
      } else {
        const [announcementsData, bookingsData] = await Promise.all([
          fetchAvailableAnnouncements(searchFilters, lang),
          fetchMyBookings(),
        ]);
        setAnnouncements(announcementsData);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      }
    } catch (err) {
      console.error(err);
      setError(t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuth, isDriver, i18n.language]);

  useEffect(() => {
    setActiveTab('available');
  }, [isDriver]);

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    loadData(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    loadData({});
  };

  // Подсчёт активных фильтров
  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== null).length;

  // === Действия для водителя ===
  const handleTakeTrip = async () => {
    if (!selectedTrip) return;

    try {
      setActionLoading(true);
      const updatedTrip = await takeTrip(selectedTrip.id);
      message.success(t('trip.taken'));

      setMyTrips(prev => [...prev, updatedTrip]);
      setTrips(prev => prev.filter(trip => trip.id !== updatedTrip.id));
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
          const updatedTrip = await releaseTrip(selectedMyTrip.id);
          message.success(t('trip.released'));

          setMyTrips(prev => prev.filter(trip => trip.id !== updatedTrip.id));
          if (updatedTrip.status === 'open') {
            setTrips(prev => [...prev.filter(trip => trip.id !== updatedTrip.id), updatedTrip]);
          }
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
          setMyTrips(prev => prev.filter(trip => trip.id !== selectedMyTrip.id));
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

  // === Действия для пассажира ===
  const handleBookAnnouncement = async () => {
    if (!selectedAnnouncement) return;

    // Проверка количества мест
    if (bookingSeats > (selectedAnnouncement.free_seats || 0)) {
      message.error(t('booking.seatsExceeded'));
      return;
    }

    try {
      setActionLoading(true);
      await createBooking({
        announcement: selectedAnnouncement.id,
        seats_count: bookingSeats,
        message: bookingMessage,
      });
      message.success(t('booking.sent'));
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

  // Фильтрация на клиенте
  const normalizeLocationId = (value?: number | string) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

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
        const itemFromId = normalizeLocationId(item.from_location);
        if (itemFromId !== null && itemFromId !== filters.from_location) return false;
      }
      if (filters.to_location) {
        const itemToId = normalizeLocationId(item.to_location);
        if (itemToId !== null && itemToId !== filters.to_location) return false;
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
  const filteredMyTrips = filterData(myTrips);
  const activeMyTrips = filteredMyTrips.filter(t => ['taken', 'in_progress'].includes(t.status));
  const completedMyTrips = filteredMyTrips.filter(t => ['completed', 'cancelled'].includes(t.status));

  const filteredBookings = bookings.filter((booking) => {
    const info = booking.announcement_info;
    const fromId = normalizeLocationId(info?.from_location);
    const toId = normalizeLocationId(info?.to_location);

    if (filters.from_location && fromId !== null && fromId !== filters.from_location) {
      return false;
    }
    if (filters.to_location && toId !== null && toId !== filters.to_location) {
      return false;
    }
    if (filters.date && info?.departure_time) {
      const bookingDate = new Date(info.departure_time).toISOString().split('T')[0];
      if (bookingDate !== filters.date) return false;
    }
    return true;
  });

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">{t('common.loading')}</Text>
        </div>
      </div>
    );
  }

  // Стили для табов - компактные на мобилке
  const tabLabelStyle: React.CSSProperties = {
    fontSize: isMobile ? 12 : 14,
    whiteSpace: 'nowrap',
  };

  // Табы для водителя - короткие названия на мобилке
  const driverTabItems = [
    {
      key: 'available',
      label: (
        <span style={{ ...tabLabelStyle, fontWeight: activeTab === 'available' ? 600 : 400 }}>
          📋 {isMobile ? t('search.available') : t('search.available')} ({filteredTrips.length})
        </span>
      ),
      children: null,
    },
    {
      key: 'my',
      label: (
        <span style={{ ...tabLabelStyle, fontWeight: activeTab === 'my' ? 600 : 400 }}>
          🚗 {isMobile ? t('search.myTrips') : t('search.myTrips')} ({activeMyTrips.length})
        </span>
      ),
      children: null,
    },
    {
      key: 'completed',
      label: (
        <span style={{ ...tabLabelStyle, fontWeight: activeTab === 'completed' ? 600 : 400 }}>
          ✅ {isMobile ? t('search.history') : t('tripStatus.completed')} ({completedMyTrips.length})
        </span>
      ),
      children: null,
    },
  ];

  // Табы для пассажира - короткие названия на мобилке
  const passengerTabItems = [
    {
      key: 'available',
      label: (
        <span style={{ ...tabLabelStyle, fontWeight: activeTab === 'available' ? 600 : 400 }}>
          🚘 {isMobile ? t('search.available') : t('search.driverAnnouncements')} ({filteredAnnouncements.length})
        </span>
      ),
      children: null,
    },
    {
      key: 'history',
      label: (
        <span style={{ ...tabLabelStyle, fontWeight: activeTab === 'history' ? 600 : 400 }}>
          🕓 {t('search.history')} ({filteredBookings.length})
        </span>
      ),
      children: null,
    },
  ];

  const bookingStatusConfig: Record<Booking['status'], { color: string; text: string }> = {
    pending: { color: 'orange', text: t('booking.status.pending') },
    confirmed: { color: 'blue', text: t('booking.status.confirmed') },
    rejected: { color: 'red', text: t('booking.status.rejected') },
    cancelled: { color: 'default', text: t('booking.status.cancelled') },
    completed: { color: 'green', text: t('booking.status.completed') },
  };

  const renderBookingCard = (booking: Booking) => {
    const info = booking.announcement_info;
    const status = bookingStatusConfig[booking.status] || bookingStatusConfig.pending;
    const route = info
      ? `${info.from_location} → ${info.to_location}`
      : t('common.noData');
    const departureLabel = info?.departure_time
      ? dayjs(info.departure_time).format('DD MMM, HH:mm')
      : t('common.noData');

    return (
      <Card
        key={booking.id}
        style={{ marginBottom: 12, borderRadius: 12 }}
        styles={{ body: { padding: 16 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Space size={8} wrap>
            <Tag color={status.color}>{status.text}</Tag>
            <Tag icon={<UserOutlined />}>{booking.seats_count} {t('trip.seats')}</Tag>
          </Space>
          <Text type="secondary">
            <ClockCircleOutlined /> {departureLabel}
          </Text>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EnvironmentOutlined style={{ color: '#1677ff' }} />
            <Text strong>{route}</Text>
          </div>

          {info?.price_per_seat && (
            <Text type="secondary">
              {info.price_per_seat} сом / {t('trip.seat')}
            </Text>
          )}

          <Text type="secondary">
            {t('trip.driver')}: {info?.driver_name || '—'}
          </Text>

          {booking.message && (
            <div style={{ padding: 10, background: '#f8f9fa', borderRadius: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{t('booking.message')}</Text>
              <div>"{booking.message}"</div>
            </div>
          )}
        </Space>
      </Card>
    );
  };

  // Контент табов
  const renderTabContent = () => {
    if (isDriver) {
      switch (activeTab) {
        case 'available':
          return filteredTrips.length > 0 ? (
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
            <Empty description={t('search.noResults')} style={styles.emptyState} />
          );
        case 'my':
          return activeMyTrips.length > 0 ? (
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
            <Empty description={t('search.noMyTrips')} style={styles.emptyState} />
          );
        case 'completed':
          return completedMyTrips.length > 0 ? (
            <div>
              {completedMyTrips.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onClick={() => setSelectedMyTrip(trip)}
                  showPassengerInfo={true}
                />
              ))}
            </div>
          ) : (
            <Empty description={t('search.noCompletedTrips')} style={styles.emptyState} />
          );
        case 'announcements':
          return filteredAnnouncements.length > 0 ? (
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
            <Empty description={t('search.noResults')} style={styles.emptyState} />
          );
        default:
          return null;
      }
    } else {
      if (activeTab === 'history') {
        return filteredBookings.length > 0 ? (
          <div>
            {filteredBookings.map(renderBookingCard)}
          </div>
        ) : (
          <Empty description={t('search.noHistory')} style={styles.emptyState} />
        );
      }
      return filteredAnnouncements.length > 0 ? (
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
              {t('search.noResults')}
              <br />
              <Text type="secondary">{t('search.noResultsHint')}</Text>
            </span>
          }
          style={styles.emptyState}
        />
      );
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Плейсхолдер для фиксированных табов */}
      <div style={styles.tabsPlaceholder} />

      {/* Фиксированные табы */}
      <div style={stickyHeaderStyle}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={isDriver ? driverTabItems : passengerTabItems}
          style={{ margin: 0 }}
          size={isMobile ? 'small' : 'middle'}
          tabBarStyle={{ marginBottom: 0 }}
        />
      </div>

      {/* Ошибка */}
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

      {/* Контент табов */}
      <div style={styles.contentArea}>
        {renderTabContent()}
      </div>

      {/* FAB кнопка фильтра */}
      <FilterFAB
        onClick={() => setShowFilterModal(true)}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Модалка фильтров */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApply={handleSearch}
        onClear={handleClearFilters}
        loading={loading}
        t={t}
      />

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
              <Form.Item
                label={t('booking.seatsCount')}
                validateStatus={bookingSeats > (selectedAnnouncement.free_seats || 0) ? 'error' : ''}
                help={bookingSeats > (selectedAnnouncement.free_seats || 0) ? t('booking.seatsExceeded') : ''}
              >
                <InputNumber
                  min={1}
                  max={selectedAnnouncement.free_seats || 1}
                  value={bookingSeats}
                  onChange={v => setBookingSeats(v || 1)}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label={t('booking.message')}>
                <TextArea
                  value={bookingMessage}
                  onChange={e => setBookingMessage(e.target.value)}
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