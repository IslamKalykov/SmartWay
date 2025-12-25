// src/pages/MyAdsPage.tsx
import { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Button,
  Tabs,
  Empty,
  Spin,
  Modal,
  message,
  Badge,
  Space,
  Avatar,
  Tag,
  Rate,
  Input,
  Checkbox,
  Divider,
} from 'antd';
import {
  PlusOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UserOutlined, PhoneOutlined, ClockCircleOutlined, 
  CheckOutlined, StopOutlined, SendOutlined,
  DollarOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useAuth } from '../auth/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
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
  createReview,
  type Trip,
} from '../api/trips';

const { Text } = Typography;
const { TextArea } = Input;

type PassengerBookingSummary = {
  announcement: number;
  announcement_info?: Booking['announcement_info'];
  passenger: number;
  passenger_name: string;
  passenger_phone?: string;
  passenger_photo?: string;
  passenger_verified: boolean;
  seats_count: number;
  contact_phone?: string;
  contact_telegram?: string;
  has_review_from_me?: boolean;
  bookingIds: number[];
  message?: string;
};

type ReviewTarget = { type: 'trip'; trip: Trip } | { type: 'booking'; booking: { id: number; announcement_info?: Booking['announcement_info'] } };

// ==================== Стили ====================
const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: {
    padding: 0,
    paddingBottom: 100, // место для FAB кнопки
    position: 'relative',
    minHeight: '100%',
  },
  
  // Отступ для контента под фиксированными табами
  tabsPlaceholder: {
    height: 56, // высота табов
  },
  
  // FAB кнопка создания - СПРАВА
  fabButton: {
    position: 'fixed',
    left: 'auto', // явно убираем left
    right: 20, // справа
    bottom: 80, // выше нижней навигации
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
  
  // Контент
  contentArea: {
    paddingTop: 16,
  },
  
  emptyState: {
    padding: '40px 0',
  },
  
  // Карточки заявок
  bookingCard: {
    marginBottom: 16,
    borderRadius: 16,
    border: '1px solid #f0f0f0',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
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
  },
  rejectButton: {
    background: '#fff',
    border: '1px solid #ff4d4f',
    color: '#ff4d4f',
    fontWeight: 500,
    borderRadius: 8,
    height: 36,
  },
  
  // Обёртка объявлений
  announcementWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  announcementActions: {
    display: 'flex',
    gap: 10,
    marginTop: -8,
    paddingTop: 16,
    paddingBottom: 4,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    background: '#fff',
    border: '1px solid #ff4d4f',
    color: '#ff4d4f',
    fontWeight: 500,
    borderRadius: 8,
    height: 40,
    paddingLeft: 20,
    paddingRight: 20,
  },
  completeButton: {
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    border: 'none',
    color: '#fff',
    fontWeight: 600,
    borderRadius: 8,
    height: 40,
    paddingLeft: 20,
    paddingRight: 20,
  },
};

// ==================== Компонент карточки заявки ====================
interface BookingCardItemProps {
  booking: Booking;
  onConfirm: (id: number) => void;
  onReject: (id: number) => void;
  t: (key: string) => string;
}

function BookingCardItem({ booking, onConfirm, onReject, t }: BookingCardItemProps) {
  // Получаем телефон и telegram из всех возможных полей
  const phone = booking.contact_phone || booking.passenger_phone;
  const telegram = (booking as any).contact_telegram || (booking as any).passenger_telegram;

  return (
    <Card style={styles.bookingCard} styles={{ body: { padding: 16 } }}>
      {/* Header с аватаром */}
      <div style={styles.bookingHeader}>
        <Avatar 
          size={48} 
          icon={<UserOutlined />} 
          src={booking.passenger_photo}
          style={styles.bookingAvatar}
        />
        <div style={styles.bookingInfo}>
          <div style={styles.bookingName}>
            {booking.passenger_name}
          </div>
          <div style={styles.bookingMeta}>
            <Tag style={styles.seatsTag}>
              {booking.seats_requested} {t('trip.seats')}
            </Tag>
            <Tag style={styles.timeTag} icon={<ClockCircleOutlined />}>
              {dayjs(booking.created_at).format('DD.MM HH:mm')}
            </Tag>
          </div>
        </div>
      </div>

      {/* Информация о маршруте */}
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">
          <EnvironmentOutlined style={{ marginRight: 4 }} />
          {booking.announcement_from} → {booking.announcement_to}
        </Text>
      </div>

      {/* Сообщение */}
      {booking.message && (
        <div style={styles.bookingMessage}>
          <p style={styles.bookingMessageText}>"{booking.message}"</p>
        </div>
      )}

      {/* Контакты */}
      <div style={{ marginBottom: 14 }}>
        <Space wrap>
          {phone && (
            <Button 
              type="text" 
              size="small"
              icon={<PhoneOutlined />}
              href={`tel:${phone}`}
            >
              {phone}
            </Button>
          )}
          {telegram && (
            <Button 
              type="text" 
              size="small"
              icon={<SendOutlined />}
              onClick={() => {
                window.location.href = `https://t.me/${telegram.replace('@', '')}`;
              }}
              style={{ color: '#0088cc' }}
            >
              Telegram
            </Button>
          )}
        </Space>
      </div>

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
          type="primary"
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

// ==================== Компонент обёртки для объявления с кнопками ====================
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

// ==================== FAB компонент ====================
interface FABProps {
  onClick: () => void;
  label: string;
}

function FloatingActionButton({ onClick, label }: FABProps) {
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
      aria-label={label}
    >
      <PlusOutlined style={styles.fabIcon} />
    </button>
  );
}

// ==================== Главный компонент ====================
export default function MyAdsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile(768);
  const isDriver = user?.is_driver;

  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewFlags, setReviewFlags] = useState({
    was_on_time: false,
    was_polite: false,
    car_was_clean: false,
  });
  const [reviewLoading, setReviewLoading] = useState(false);
  // Локальный трекер оставленных отзывов (для мгновенного UI обновления)
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<number>>(new Set());
  const [reviewedTripIds, setReviewedTripIds] = useState<Set<number>>(new Set());

  // Адаптивные стили для фиксированного header
  const stickyHeaderStyle: React.CSSProperties = {
    position: 'fixed',
    top: isMobile ? 56 : 64, // высота хедера
    left: isMobile ? 0 : '50%',
    right: isMobile ? 0 : 'auto',
    transform: isMobile ? 'none' : 'translateX(-50%)',
    width: isMobile ? '100%' : '100%',
    maxWidth: isMobile ? '100%' : 968, // как у контента
    zIndex: 50,
    background: '#fff',
    padding: '8px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  useEffect(() => {
    loadData();
  }, [isDriver, i18n.language]);

  useEffect(() => {
    setActiveTab('active');
  }, [isDriver]);

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

  // === Отзывы ===
  const handleOpenReview = (trip: Trip) => {
    setReviewTarget({ type: 'trip', trip });
    setReviewRating(5);
    setReviewText('');
    setReviewFlags({
      was_on_time: false,
      was_polite: false,
      car_was_clean: false,
    });
  };

  const handleOpenBookingReview = (booking: PassengerBookingSummary) => {
    setReviewTarget({ type: 'booking', booking: { id: booking.bookingIds[0], announcement_info: booking.announcement_info } });
    setReviewRating(5);
    setReviewText('');
    setReviewFlags({
      was_on_time: false,
      was_polite: false,
      car_was_clean: false,
    });
  };

  const handleSubmitReview = async () => {
    if (!reviewTarget) return;
    if (!reviewRating) {
      message.error(t('review.ratingRequired'));
      return;
    }
    try {
      setReviewLoading(true);
      await createReview({
        trip: reviewTarget.type === 'trip' ? reviewTarget.trip.id : undefined,
        booking: reviewTarget.type === 'booking' ? reviewTarget.booking.id : undefined,
        rating: reviewRating,
        text: reviewText,
        ...reviewFlags,
      });
      message.success(t('review.submitted'));
      
      // Оптимистичное обновление - сразу помечаем как оставлен отзыв
      if (reviewTarget.type === 'booking') {
        setReviewedBookingIds(prev => new Set([...prev, reviewTarget.booking.id]));
      } else if (reviewTarget.type === 'trip') {
        setReviewedTripIds(prev => new Set([...prev, reviewTarget.trip.id]));
      }
      
      setReviewTarget(null);
      setReviewText('');
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || t('errors.serverError'));
    } finally {
      setReviewLoading(false);
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
      message.success(t('booking.confirmed'));
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

  // Фильтрация данных
  const activeAnnouncements = announcements.filter(a => ['active', 'full'].includes(a.status));
  const completedAnnouncements = announcements.filter(a => ['completed', 'cancelled'].includes(a.status));
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const completedBookingsByAnnouncement = completedBookings.reduce<Record<number, PassengerBookingSummary[]>>((acc, booking) => {
    if (!acc[booking.announcement]) {
      acc[booking.announcement] = [];
    }
    const existingSummary = acc[booking.announcement].find(item => item.passenger === booking.passenger);
    if (existingSummary) {
      existingSummary.seats_count += booking.seats_count;
      existingSummary.bookingIds.push(booking.id);
      existingSummary.has_review_from_me = existingSummary.has_review_from_me || !!booking.has_review_from_me;
      if (!existingSummary.contact_phone) existingSummary.contact_phone = booking.contact_phone;
      if (!existingSummary.contact_telegram) existingSummary.contact_telegram = (booking as any).contact_telegram;
      if (!existingSummary.passenger_phone) existingSummary.passenger_phone = booking.passenger_phone;
      if (!existingSummary.message && booking.message) existingSummary.message = booking.message;
      if (!existingSummary.announcement_info) existingSummary.announcement_info = booking.announcement_info;
    } else {
      acc[booking.announcement].push({
        announcement: booking.announcement,
        announcement_info: booking.announcement_info,
        passenger: booking.passenger,
        passenger_name: booking.passenger_name,
        passenger_phone: booking.passenger_phone,
        passenger_photo: booking.passenger_photo,
        passenger_verified: booking.passenger_verified,
        seats_count: booking.seats_count,
        contact_phone: booking.contact_phone,
        contact_telegram: (booking as any).contact_telegram,
        has_review_from_me: booking.has_review_from_me,
        bookingIds: [booking.id],
        message: booking.message,
      });
    }
    return acc;
  }, {});

  const activeTrips = trips.filter(t => ['open', 'taken', 'in_progress'].includes(t.status));
  const completedTrips = trips.filter(t => ['completed', 'cancelled'].includes(t.status));

  // Проверка оставлен ли отзыв (с учётом локального состояния)
  const isBookingReviewed = (bookingIds: number[], hasReviewFromServer?: boolean): boolean => {
    if (hasReviewFromServer) return true;
    return bookingIds.some(id => reviewedBookingIds.has(id));
  };

  const isTripReviewed = (tripId: number, hasReviewFromServer?: boolean): boolean => {
    if (hasReviewFromServer) return true;
    return reviewedTripIds.has(tripId);
  };

  const renderCompletedTripCard = (trip: Trip) => {
    const departureLabel = dayjs(trip.departure_time).format('DD MMM, HH:mm');
    const roleLabel =
      trip.my_role === 'driver'
        ? t('trip.driver')
        : trip.my_role === 'passenger'
        ? t('trip.passenger')
        : t('tripStatus.completed');
    const counterpartLabel = trip.my_role === 'driver' ? t('trip.passenger') : t('trip.driver');
    const counterpartName = trip.my_role === 'driver' ? trip.passenger_name : trip.driver_name;
    const phone = trip.my_role === 'driver' ? trip.passenger_phone : trip.driver_phone || trip.contact_phone;
    const cleanPhone = phone?.replace(/\D/g, '');
    const alreadyReviewed = isTripReviewed(trip.id, trip.has_review_from_me);
    const canReview = trip.status === 'completed' && !alreadyReviewed && !!(trip.driver || trip.passenger);
    const statusText = t(`tripStatus.${trip.status}`, { defaultValue: trip.status });

    return (
      <Card
        key={trip.id}
        style={{ marginBottom: 12, borderRadius: 14, border: '1px solid #f0f0f0' }}
        styles={{ body: { padding: 16 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Space size={8}>
            <Tag color={trip.status === 'completed' ? 'green' : 'red'}>{statusText}</Tag>
            <Tag color="blue">{roleLabel}</Tag>
            {alreadyReviewed && (
              <Tag color="purple" icon={<CheckCircleOutlined />}>
                {t('review.alreadyLeft')}
              </Tag>
            )}
          </Space>
          <Text type="secondary">{departureLabel}</Text>
        </div>

        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Space>
            <EnvironmentOutlined style={{ color: '#1677ff' }} />
            <Text strong>
              {trip.from_location_display || trip.from_location} → {trip.to_location_display || trip.to_location}
            </Text>
          </Space>

          <Space size={12} wrap>
            <Tag icon={<UserOutlined />}>{trip.passengers_count} {trip.passengers_count === 1 ? t('trip.seat') : t('trip.seats')}</Tag>
            {trip.price ? (
              <Tag color="green" icon={<DollarOutlined />}>
                {trip.price} сом
              </Tag>
            ) : (
              <Tag color="orange">{t('trip.negotiable')}</Tag>
            )}
          </Space>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text type="secondary">
              {counterpartLabel}: {counterpartName || t('common.noData')}
            </Text>
            {phone && (
              <Button
                size="small"
                icon={<PhoneOutlined />}
                onClick={() => cleanPhone && window.open(`tel:+${cleanPhone}`)}
              >
                {t('trip.call')}
              </Button>
            )}
          </div>

          {trip.comment && (
            <Text type="secondary" style={{ display: 'block' }}>
              {trip.comment}
            </Text>
          )}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {canReview ? (
            <Button type="primary" icon={<SendOutlined />} onClick={() => handleOpenReview(trip)}>
              {t('review.leaveReview')}
            </Button>
          ) : (
            <Text type="secondary">
              {alreadyReviewed ? t('review.alreadyLeft') : t('tripStatus.completed')}
            </Text>
          )}
        </div>
      </Card>
    );
  };

  const renderCompletedAnnouncementCard = (announcement: Announcement) => {
    const bookingsForAnnouncement = completedBookingsByAnnouncement[announcement.id] || [];
    const routeLabel = `${announcement.from_location_display || announcement.from_location} → ${announcement.to_location_display || announcement.to_location}`;
    const statusText = t(`announcementStatus.${announcement.status}`, { defaultValue: announcement.status });
    const departureLabel = dayjs(announcement.departure_time).format('DD MMM, HH:mm');

    return (
      <Card
        key={announcement.id}
        style={{ marginBottom: 16, borderRadius: 14, border: '1px solid #f0f0f0' }}
        styles={{ body: { padding: 16 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Space size={8}>
          <Tag color={announcement.status === 'completed' ? 'green' : 'red'}>{statusText}</Tag>
            <Tag color="blue">{t('trip.driver')}</Tag>
          </Space>
          <Text type="secondary">{departureLabel}</Text>
        </div>

        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Space>
            <EnvironmentOutlined style={{ color: '#1677ff' }} />
            <Text strong>{routeLabel}</Text>
          </Space>

          <Space size={12} wrap>
            <Tag icon={<UserOutlined />}>{announcement.available_seats} {announcement.available_seats === 1 ? t('trip.seat') : t('trip.seats')}</Tag>
              {announcement.price_per_seat ? (
                <Tag color="green" icon={<DollarOutlined />}>
                  {announcement.price_per_seat} сом
                </Tag>
              ) : (
                <Tag color="orange">{t('trip.negotiable')}</Tag>
              )}
          </Space>

          {announcement.comment && (
            <Text type="secondary" style={{ display: 'block' }}>
              {announcement.comment}
            </Text>
          )}
        </div>
        <Divider style={{ margin: '12px 0' }}>{t('booking.completedTitle')} ({bookingsForAnnouncement.length})</Divider>

        {bookingsForAnnouncement.length > 0 ? (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {bookingsForAnnouncement.map((booking) => {
              const phone = booking.contact_phone || booking.passenger_phone;
              const telegram = booking.contact_telegram;
              const cleanPhone = phone?.replace(/\D/g, '');
              const alreadyReviewed = isBookingReviewed(booking.bookingIds, booking.has_review_from_me);
              const canReview = !alreadyReviewed;

              return (
                <Card key={`${booking.announcement}-${booking.passenger}`} size="small" style={{ borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <Space size={8}>
                      <Avatar icon={<UserOutlined />} src={booking.passenger_photo} />
                      <div>
                        <div style={styles.bookingName}>{booking.passenger_name}</div>
                        <Space size={6} wrap>
                          <Tag icon={<UserOutlined />} style={styles.seatsTag}>
                            {booking.seats_count} {t('trip.seats')}
                          </Tag>
                          <Tag color="green">{t('booking.status.completed')}</Tag>
                          {alreadyReviewed && (
                            <Tag color="purple" icon={<CheckCircleOutlined />}>
                              {t('review.alreadyLeft')}
                            </Tag>
                          )}
                        </Space>
                      </div>
                    </Space>
                    <Space>
                      {telegram && (
                        <Button
                          size="small"
                          icon={<SendOutlined />}
                          onClick={() => window.open(`https://t.me/${telegram.replace('@', '')}`)}
                          style={{ color: '#0088cc' }}
                        >
                          Telegram
                        </Button>
                      )}
                      {phone && (
                        <Button
                          size="small"
                          icon={<PhoneOutlined />}
                          onClick={() => cleanPhone && window.open(`tel:+${cleanPhone}`)}
                        >
                          {t('trip.call')}
                        </Button>
                      )}
                    </Space>
                  </div>

                  {booking.message && (
                    <div style={styles.bookingMessage}>
                      <p style={styles.bookingMessageText}>"{booking.message}"</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    {canReview ? (
                      <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handleOpenBookingReview(booking)}>
                        {t('booking.ratePassenger')}
                      </Button>
                    ) : (
                      <Tag color="purple" icon={<CheckCircleOutlined />}>
                        {t('review.alreadyLeft')}
                      </Tag>
                    )}
                  </div>
                </Card>
              );
            })}
          </Space>
        ) : (
          <Text type="secondary">{t('booking.noCompleted')}</Text>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Табы для водителя / пассажира
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
            <div style={styles.contentArea}>
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
            <div style={styles.contentArea}>
              <div style={{ marginBottom: 16 }}>
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
            <div style={styles.contentArea}>
              {completedAnnouncements.length > 0 ? (
                completedAnnouncements.map(ann => renderCompletedAnnouncementCard(ann))
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
            <div style={styles.contentArea}>
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
            <div style={styles.contentArea}>
              {completedTrips.length > 0 ? (
                completedTrips.map(trip => renderCompletedTripCard(trip))
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
      {/* Плейсхолдер для фиксированных табов */}
      <div style={styles.tabsPlaceholder} />
      
      {/* Фиксированный блок с табами */}
      <div style={stickyHeaderStyle}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems.map(item => ({
            ...item,
            children: null, // убираем children из табов
          }))}
          style={{ margin: 0 }}
        />
      </div>

      {/* Контент табов */}
      <div style={{ padding: '0 0 20px 0' }}>
        {tabItems.find(item => item.key === activeTab)?.children}
      </div>

      {/* FAB кнопка создания - СПРАВА */}
      <FloatingActionButton
        onClick={() => setShowCreateModal(true)}
        label={t('common.create')}
      />

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

      {/* Модалка отзыва по завершённой поездке */}
      <Modal
        title={t('review.leaveReview')}
        open={!!reviewTarget}
        onCancel={() => setReviewTarget(null)}
        onOk={handleSubmitReview}
        okText={t('review.submit')}
        cancelText={t('common.cancel')}
        okButtonProps={{ loading: reviewLoading }}
        destroyOnClose
      >
        {reviewTarget && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Text type="secondary">
            {reviewTarget.type === 'trip'
                ? `${reviewTarget.trip.from_location_display || reviewTarget.trip.from_location} → ${reviewTarget.trip.to_location_display || reviewTarget.trip.to_location}`
                : `${reviewTarget.booking.announcement_info?.from_location || t('common.noData')} → ${reviewTarget.booking.announcement_info?.to_location || t('common.noData')}`}
            </Text>

            <div>
              <Text strong>{t('review.rating')}</Text>
              <div>
                <Rate value={reviewRating} onChange={setReviewRating} />
              </div>
            </div>

            <div>
              <Text strong>{t('review.comment')}</Text>
              <TextArea
                rows={4}
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder={t('review.textPlaceholder')}
                maxLength={500}
                showCount
              />
            </div>

            <Space direction="vertical">
              <Checkbox
                checked={reviewFlags.was_on_time}
                onChange={e => setReviewFlags(prev => ({ ...prev, was_on_time: e.target.checked }))}
              >
                {t('review.wasOnTime')}
              </Checkbox>
              <Checkbox
                checked={reviewFlags.was_polite}
                onChange={e => setReviewFlags(prev => ({ ...prev, was_polite: e.target.checked }))}
              >
                {t('review.wasPolite')}
              </Checkbox>
              <Checkbox
                checked={reviewFlags.car_was_clean}
                onChange={e => setReviewFlags(prev => ({ ...prev, car_was_clean: e.target.checked }))}
              >
                {t('review.carWasClean')}
              </Checkbox>
            </Space>
          </Space>
        )}
      </Modal>
    </div>
  );
}