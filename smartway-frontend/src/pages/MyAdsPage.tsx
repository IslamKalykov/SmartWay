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
  Space,
  Avatar,
  Tag,
  Rate,
  Input,
  Checkbox,
  Divider,
  Badge,
} from 'antd';
import {
  PlusOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UserOutlined, PhoneOutlined, ClockCircleOutlined,
  CheckOutlined, StopOutlined, SendOutlined,
  DollarOutlined, EnvironmentOutlined, CarOutlined,
  RightOutlined, TeamOutlined, InfoCircleOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useAuth } from '../auth/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import TripCard from '../components/TripCard';
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

const { Text, Title } = Typography;
const { TextArea } = Input;

type PassengerBookingSummary = {
  announcement: number;
  announcement_info?: Booking['announcement_info'];
  passenger: number;
  passenger_name: string;
  passenger_phone?: string;
  passenger_photo?: string;
  passenger_verified: boolean;
  passenger_rating?: number;
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
    paddingBottom: 100,
    position: 'relative',
    minHeight: '100%',
  },
  tabsPlaceholder: {
    height: 56,
  },
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
  contentArea: {
    paddingTop: 16,
  },
  emptyState: {
    padding: '40px 0',
  },
  // Компактная карточка объявления
  tripCard: {
    marginBottom: 12,
    borderRadius: 16,
    border: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  tripCardHover: {
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    borderColor: '#667eea',
  },
  tripCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  tripMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap' as const,
    marginTop: 8,
  },
  tripCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #f5f5f5',
  },
  // Модальное окно деталей
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#666',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    fontWeight: 500,
    fontSize: 14,
    color: '#1a1a2e',
  },
  // Карточка пассажира - обновлённая
  passengerCard: {
    background: '#fafafa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  passengerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  passengerInfo: {
    flex: 1,
    minWidth: 0,
  },
  passengerName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1a1a2e',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  ratingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 12,
    color: '#faad14',
    marginLeft: 8,
  },
  // Кнопки контактов - как в SearchPage
  contactButtonsRow: {
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
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  telegramBtn: {
    background: 'linear-gradient(135deg, #0088cc 0%, #00c6ff 100%)',
    color: '#fff',
  },
  phoneBtn: {
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    color: '#fff',
  },
  // Старые стили для обратной совместимости
  contactButtons: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap' as const,
  },
  seatsTag: {
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontWeight: 500,
  },
  pendingTag: {
    background: '#fff7e6',
    color: '#fa8c16',
    border: '1px solid #ffd591',
  },
  confirmedTag: {
    background: '#f6ffed',
    color: '#52c41a',
    border: '1px solid #b7eb8f',
  },
  actionButtons: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
  },
  bookingMessage: {
    background: '#fff',
    borderRadius: 8,
    padding: '8px 12px',
    marginTop: 8,
    borderLeft: '3px solid #667eea',
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic' as const,
  },
  clickableAvatar: {
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
};

// ==================== Компонент контактных кнопок ====================
interface ContactButtonsProps {
  phone?: string;
  telegram?: string;
  size?: 'small' | 'default';
}

function ContactButtons({ phone, telegram, size = 'default' }: ContactButtonsProps) {
  const cleanPhone = phone?.replace(/\D/g, '');
  const btnSize = size === 'small' ? 36 : 40;
  const iconSize = size === 'small' ? 16 : 18;
  
  const handleTelegram = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (telegram) {
      window.open(`https://t.me/${telegram.replace('@', '')}`, '_blank');
    } else if (cleanPhone) {
      window.open(`https://t.me/+${cleanPhone}`, '_blank');
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cleanPhone) {
      window.location.href = `tel:+${cleanPhone}`;
    }
  };

  return (
    <div style={styles.contactButtonsRow}>
      {(telegram || cleanPhone) && (
        <button
          onClick={handleTelegram}
          style={{
            ...styles.contactBtn,
            ...styles.telegramBtn,
            width: btnSize,
            height: btnSize,
          }}
          title="Telegram"
        >
          <SendOutlined style={{ fontSize: iconSize }} />
        </button>
      )}
      {cleanPhone && (
        <button
          onClick={handleCall}
          style={{
            ...styles.contactBtn,
            ...styles.phoneBtn,
            width: btnSize,
            height: btnSize,
          }}
          title="Позвонить"
        >
          <PhoneOutlined style={{ fontSize: iconSize }} />
        </button>
      )}
    </div>
  );
}

// ==================== Компонент кликабельного пользователя ====================
interface UserProfileLinkProps {
  userId: number;
  userName: string;
  userPhoto?: string;
  userRating?: number;
  verified?: boolean;
  showAvatar?: boolean;
  avatarSize?: number;
  onClick?: () => void;
}

function UserProfileLink({
  userId,
  userName,
  userPhoto,
  userRating,
  verified,
  showAvatar = true,
  avatarSize = 44,
  onClick,
}: UserProfileLinkProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      navigate(`/user/${userId}`);
    }
  };

  return (
    <Space
      size={10}
      style={{ cursor: 'pointer' }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showAvatar && (
        <Avatar
          src={userPhoto}
          icon={<UserOutlined />}
          size={avatarSize}
          style={{
            ...styles.clickableAvatar,
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            boxShadow: isHovered ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        />
      )}
      <div>
        <div
          style={{
            ...styles.passengerName,
            color: isHovered ? '#667eea' : '#1a1a2e',
          }}
        >
          {userName}
          {userRating !== undefined && userRating > 0 && (
            <span style={styles.ratingBadge}>
              <StarFilled /> {userRating.toFixed(1)}
            </span>
          )}
        </div>
        {verified && (
          <Tag color="green" style={{ margin: 0, fontSize: 11 }}>
            <CheckCircleOutlined /> Верифицирован
          </Tag>
        )}
      </div>
    </Space>
  );
}

// ==================== Компактная карточка объявления ====================
interface AnnouncementCompactCardProps {
  announcement: Announcement;
  pendingCount: number;
  confirmedCount: number;
  onClick: () => void;
  t: (key: string) => string;
}

function AnnouncementCompactCard({
  announcement,
  pendingCount,
  confirmedCount,
  onClick,
  t,
}: AnnouncementCompactCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const route = `${announcement.from_location_display || announcement.from_location} → ${announcement.to_location_display || announcement.to_location}`;
  const departureTime = dayjs(announcement.departure_time).format('DD MMM, HH:mm');

  return (
    <Card
      style={{
        ...styles.tripCard,
        ...(isHovered ? styles.tripCardHover : {}),
      }}
      styles={{ body: { padding: 16 } }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div style={styles.tripCardHeader}>
        <div>
          <div style={styles.routeText}>
            <EnvironmentOutlined style={{ color: '#667eea' }} />
            {route}
          </div>
          <div style={styles.tripMeta}>
            <Tag icon={<ClockCircleOutlined />} color="default">
              {departureTime}
            </Tag>
            {announcement.price_per_seat ? (
              <Tag icon={<DollarOutlined />} color="green">
                {announcement.price_per_seat} сом
              </Tag>
            ) : (
              <Tag color="orange">{t('trip.negotiable')}</Tag>
            )}
            <Tag icon={<UserOutlined />}>
              {announcement.available_seats} {t('trip.seats')}
            </Tag>
          </div>
        </div>
        <RightOutlined style={{ color: '#ccc', fontSize: 16 }} />
      </div>

      <div style={styles.tripCardFooter}>
        <Space size={12}>
          {pendingCount > 0 && (
            <Badge count={pendingCount} size="small">
              <Tag style={styles.pendingTag}>
                📩 {t('booking.requests')}
              </Tag>
            </Badge>
          )}
          {confirmedCount > 0 && (
            <Tag style={styles.confirmedTag} icon={<TeamOutlined />}>
              {confirmedCount} {t('booking.passengers')}
            </Tag>
          )}
        </Space>
        {announcement.status === 'full' && (
          <Tag color="orange">{t('announcementStatus.full')}</Tag>
        )}
      </div>
    </Card>
  );
}

// ==================== Модальное окно деталей поездки ====================
interface TripDetailModalProps {
  announcement: Announcement | null;
  bookings: Booking[];
  onClose: () => void;
  onComplete: (id: number) => void;
  onCancel: (id: number) => void;
  onConfirmBooking: (id: number) => void;
  onRejectBooking: (id: number) => void;
  onReviewPassenger: (booking: PassengerBookingSummary) => void;
  reviewedBookingIds: Set<number>;
  t: (key: string) => string;
  isCompleted?: boolean;
}

function TripDetailModal({
  announcement,
  bookings,
  onClose,
  onComplete,
  onCancel,
  onConfirmBooking,
  onRejectBooking,
  onReviewPassenger,
  reviewedBookingIds,
  t,
  isCompleted = false,
}: TripDetailModalProps) {
  const navigate = useNavigate();
  
  if (!announcement) return null;

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => ['confirmed', 'completed'].includes(b.status));
  
  // Группировка подтверждённых по пассажирам
  const confirmedSummary = confirmedBookings.reduce<PassengerBookingSummary[]>((acc, booking) => {
    const existing = acc.find(item => item.passenger === booking.passenger);
    const bookingTelegram = (booking as any).contact_telegram || (booking as any).passenger_telegram;
    
    if (existing) {
      existing.seats_count += booking.seats_count;
      existing.bookingIds.push(booking.id);
      existing.has_review_from_me = existing.has_review_from_me || !!booking.has_review_from_me;
      if (!existing.contact_phone) existing.contact_phone = booking.contact_phone;
      if (!existing.contact_telegram) existing.contact_telegram = bookingTelegram;
    } else {
      acc.push({
        announcement: booking.announcement,
        announcement_info: booking.announcement_info,
        passenger: booking.passenger,
        passenger_name: booking.passenger_name,
        passenger_phone: booking.passenger_phone,
        passenger_photo: booking.passenger_photo,
        passenger_verified: booking.passenger_verified,
        passenger_rating: (booking as any).passenger_rating,
        seats_count: booking.seats_count,
        contact_phone: booking.contact_phone,
        contact_telegram: bookingTelegram,
        has_review_from_me: booking.has_review_from_me,
        bookingIds: [booking.id],
        message: booking.message,
      });
    }
    return acc;
  }, []);

  const route = `${announcement.from_location_display || announcement.from_location} → ${announcement.to_location_display || announcement.to_location}`;

  const isBookingReviewed = (bookingIds: number[], hasReviewFromServer?: boolean): boolean => {
    if (hasReviewFromServer) return true;
    return bookingIds.some(id => reviewedBookingIds.has(id));
  };

  return (
    <Modal
      open={!!announcement}
      onCancel={onClose}
      footer={null}
      width={600}
      title={
        <Space>
          <CarOutlined style={{ color: '#667eea' }} />
          <span>Подробнее</span>
        </Space>
      }
      styles={{
        content: { borderRadius: 16 },
        header: { borderRadius: '16px 16px 0 0', borderBottom: '1px solid #f0f0f0' },
        body: { maxHeight: '70vh', overflowY: 'auto' },
      }}
    >
      {/* Информация о поездке */}
      <div style={styles.detailSection}>
        <div style={styles.sectionTitle}>
          <InfoCircleOutlined />
          Информация о поездке
        </div>
        
        <Card size="small" style={{ borderRadius: 12, background: '#f8f9fa' }}>
          <div style={{ ...styles.routeText, marginBottom: 12, fontSize: 18 }}>
            <EnvironmentOutlined style={{ color: '#667eea' }} />
            {route}
          </div>
          
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Время отправления</span>
            <span style={styles.infoValue}>
              {dayjs(announcement.departure_time).format('DD MMMM YYYY, HH:mm')}
            </span>
          </div>
          
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Цена</span>
            <span style={styles.infoValue}>
              {announcement.price_per_seat ? `${announcement.price_per_seat} сом` : t('trip.negotiable')}
            </span>
          </div>
          
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Свободных мест</span>
            <span style={styles.infoValue}>{announcement.available_seats}</span>
          </div>
          
          {announcement.car_info && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Автомобиль</span>
              <span style={styles.infoValue}>
                {announcement.car_info.brand} {announcement.car_info.model} ({announcement.car_info.color})
              </span>
            </div>
          )}
          
          {announcement.comment && (
            <div style={{ marginTop: 12 }}>
              <span style={styles.infoLabel}>Комментарий</span>
              <p style={{ margin: '4px 0 0', color: '#555' }}>{announcement.comment}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Запросы на бронирование (только для активных) */}
      {!isCompleted && pendingBookings.length > 0 && (
        <div style={styles.detailSection}>
          <div style={styles.sectionTitle}>
            <Badge count={pendingBookings.length} size="small" offset={[8, 0]}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                📩 {t('booking.requests')}
              </span>
            </Badge>
          </div>
          
          {pendingBookings.map(booking => {
            const phone = booking.contact_phone || booking.passenger_phone;
            const telegram = (booking as any).contact_telegram || (booking as any).passenger_telegram;
            
            return (
              <div key={booking.id} style={styles.passengerCard}>
                <div style={styles.passengerHeader}>
                  <UserProfileLink
                    userId={booking.passenger}
                    userName={booking.passenger_name}
                    userPhoto={booking.passenger_photo}
                    userRating={(booking as any).passenger_rating}
                    verified={booking.passenger_verified}
                    avatarSize={40}
                  />
                  <ContactButtons phone={phone} telegram={telegram} size="small" />
                </div>
                
                <Space size={4} style={{ marginBottom: 8 }}>
                  <Tag style={styles.seatsTag}>
                    {booking.seats_count} {t('trip.seats')}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(booking.created_at).format('DD.MM HH:mm')}
                  </Text>
                </Space>
                
                {booking.message && (
                  <div style={styles.bookingMessage}>"{booking.message}"</div>
                )}
                
                <div style={styles.actionButtons}>
                  <Button
                    icon={<CloseCircleOutlined />}
                    onClick={() => onRejectBooking(booking.id)}
                    danger
                  >
                    {t('booking.reject')}
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => onConfirmBooking(booking.id)}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    {t('booking.accept')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Подтверждённые пассажиры */}
      {confirmedSummary.length > 0 && (
        <div style={styles.detailSection}>
          <div style={styles.sectionTitle}>
            <TeamOutlined />
            {isCompleted ? t('booking.completedTitle') : t('booking.confirmed')} ({confirmedSummary.length})
          </div>
          
          {confirmedSummary.map(passenger => {
            const phone = passenger.contact_phone || passenger.passenger_phone;
            const telegram = passenger.contact_telegram;
            const alreadyReviewed = isBookingReviewed(passenger.bookingIds, passenger.has_review_from_me);
            
            return (
              <div key={passenger.passenger} style={styles.passengerCard}>
                <div style={styles.passengerHeader}>
                  <UserProfileLink
                    userId={passenger.passenger}
                    userName={passenger.passenger_name}
                    userPhoto={passenger.passenger_photo}
                    userRating={passenger.passenger_rating}
                    verified={passenger.passenger_verified}
                    avatarSize={44}
                  />
                  <ContactButtons phone={phone} telegram={telegram} />
                </div>
                
                <Space size={4} style={{ marginTop: 8 }}>
                  <Tag style={styles.seatsTag}>
                    {passenger.seats_count} {t('trip.seats')}
                  </Tag>
                  <Tag color={isCompleted ? 'green' : 'blue'}>
                    {isCompleted ? t('booking.status.completed') : t('booking.status.confirmed')}
                  </Tag>
                  {alreadyReviewed && (
                    <Tag color="purple" icon={<CheckCircleOutlined />}>
                      {t('review.alreadyLeft')}
                    </Tag>
                  )}
                </Space>
                
                {passenger.message && (
                  <div style={styles.bookingMessage}>"{passenger.message}"</div>
                )}
                
                {isCompleted && !alreadyReviewed && (
                  <div style={{ marginTop: 12 }}>
                    <Button
                      type="primary"
                      icon={<StarFilled />}
                      onClick={() => onReviewPassenger(passenger)}
                    >
                      {t('booking.ratePassenger')}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Если нет пассажиров */}
      {confirmedSummary.length === 0 && pendingBookings.length === 0 && (
        <Empty
          description={t('booking.noPassengers')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: '20px 0' }}
        />
      )}

      {/* Кнопки управления поездкой (только для активных) */}
      {!isCompleted && ['active', 'full'].includes(announcement.status) && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button
              icon={<StopOutlined />}
              danger
              onClick={() => {
                onCancel(announcement.id);
                onClose();
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => {
                onComplete(announcement.id);
                onClose();
              }}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              {t('trip.finish')}
            </Button>
          </div>
        </>
      )}
    </Modal>
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
  
  // Выбранное объявление для детального просмотра
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedIsCompleted, setSelectedIsCompleted] = useState(false);
  
  // Отзывы
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewFlags, setReviewFlags] = useState({
    was_on_time: false,
    was_polite: false,
    car_was_clean: false,
  });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<number>>(new Set());
  const [reviewedTripIds, setReviewedTripIds] = useState<Set<number>>(new Set());

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

  // Группировка бронирований по объявлениям
  const bookingsByAnnouncement = bookings.reduce<Record<number, Booking[]>>((acc, booking) => {
    if (!acc[booking.announcement]) {
      acc[booking.announcement] = [];
    }
    acc[booking.announcement].push(booking);
    return acc;
  }, {});

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
    setReviewFlags({ was_on_time: false, was_polite: false, car_was_clean: false });
  };

  const handleOpenBookingReview = (booking: PassengerBookingSummary) => {
    setReviewTarget({ type: 'booking', booking: { id: booking.bookingIds[0], announcement_info: booking.announcement_info } });
    setReviewRating(5);
    setReviewText('');
    setReviewFlags({ was_on_time: false, was_polite: false, car_was_clean: false });
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

  // Открытие деталей объявления
  const openAnnouncementDetails = (announcement: Announcement, isCompleted: boolean = false) => {
    setSelectedAnnouncement(announcement);
    setSelectedIsCompleted(isCompleted);
  };

  // Фильтрация данных
  const activeAnnouncements = announcements.filter(a => ['active', 'full'].includes(a.status));
  const completedAnnouncements = announcements.filter(a => ['completed', 'cancelled'].includes(a.status));
  const activeTrips = trips.filter(t => ['open', 'taken', 'in_progress'].includes(t.status));
  const completedTrips = trips.filter(t => ['completed', 'cancelled'].includes(t.status));

  const isTripReviewed = (tripId: number, hasReviewFromServer?: boolean): boolean => {
    if (hasReviewFromServer) return true;
    return reviewedTripIds.has(tripId);
  };

  const renderCompletedTripCard = (trip: Trip) => {
    const departureLabel = dayjs(trip.departure_time).format('DD MMM, HH:mm');
    const roleLabel = trip.my_role === 'driver' ? t('trip.driver') : trip.my_role === 'passenger' ? t('trip.passenger') : t('tripStatus.completed');
    const counterpartLabel = trip.my_role === 'driver' ? t('trip.passenger') : t('trip.driver');
    const counterpartName = trip.my_role === 'driver' ? trip.passenger_name : trip.driver_name;
    const counterpartId = trip.my_role === 'driver' ? trip.passenger : trip.driver;
    const counterpartPhoto = trip.my_role === 'driver' ? (trip as any).passenger_photo : (trip as any).driver_photo;
    const counterpartRating = trip.my_role === 'driver' ? (trip as any).passenger_rating : (trip as any).driver_rating;
    const phone = trip.my_role === 'driver' ? trip.passenger_phone : trip.driver_phone || trip.contact_phone;
    const telegram = trip.my_role === 'driver' ? (trip as any).passenger_telegram : (trip as any).driver_telegram;
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

        <div style={{ marginTop: 12 }}>
          <Space style={{ marginBottom: 8 }}>
            <EnvironmentOutlined style={{ color: '#1677ff' }} />
            <Text strong>
              {trip.from_location_display || trip.from_location} → {trip.to_location_display || trip.to_location}
            </Text>
          </Space>

          <Space size={12} wrap style={{ marginBottom: 12 }}>
            <Tag icon={<UserOutlined />}>{trip.passengers_count} {trip.passengers_count === 1 ? t('trip.seat') : t('trip.seats')}</Tag>
            {trip.price ? (
              <Tag color="green" icon={<DollarOutlined />}>{trip.price} сом</Tag>
            ) : (
              <Tag color="orange">{t('trip.negotiable')}</Tag>
            )}
          </Space>

          {/* Карточка контрагента с профилем и контактами */}
          {counterpartId && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: 12,
              background: '#f8f9fa',
              borderRadius: 10,
              marginBottom: 8,
            }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  {counterpartLabel}
                </Text>
                <UserProfileLink
                  userId={counterpartId}
                  userName={counterpartName || t('common.noData')}
                  userPhoto={counterpartPhoto}
                  userRating={counterpartRating}
                  avatarSize={36}
                />
              </div>
              <ContactButtons phone={phone} telegram={telegram} size="small" />
            </div>
          )}

          {trip.comment && <Text type="secondary" style={{ display: 'block' }}>{trip.comment}</Text>}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {canReview ? (
            <Button type="primary" icon={<StarFilled />} onClick={() => handleOpenReview(trip)}>
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

  // Компактная карточка для завершённых объявлений
  const renderCompletedAnnouncementCard = (announcement: Announcement) => {
    const annBookings = bookingsByAnnouncement[announcement.id] || [];
    const confirmedCount = annBookings.filter(b => ['confirmed', 'completed'].includes(b.status)).length;
    const route = `${announcement.from_location_display || announcement.from_location} → ${announcement.to_location_display || announcement.to_location}`;
    const departureTime = dayjs(announcement.departure_time).format('DD MMM, HH:mm');
    const statusText = t(`announcementStatus.${announcement.status}`, { defaultValue: announcement.status });

    return (
      <Card
        key={announcement.id}
        style={{ ...styles.tripCard, cursor: 'pointer' }}
        styles={{ body: { padding: 16 } }}
        onClick={() => openAnnouncementDetails(announcement, true)}
      >
        <div style={styles.tripCardHeader}>
          <div>
            <div style={styles.routeText}>
              <EnvironmentOutlined style={{ color: '#667eea' }} />
              {route}
            </div>
            <div style={styles.tripMeta}>
              <Tag color={announcement.status === 'completed' ? 'green' : 'red'}>
                {statusText}
              </Tag>
              <Tag icon={<ClockCircleOutlined />} color="default">
                {departureTime}
              </Tag>
              {announcement.price_per_seat && (
                <Tag icon={<DollarOutlined />} color="green">
                  {announcement.price_per_seat} сом
                </Tag>
              )}
            </div>
          </div>
          <RightOutlined style={{ color: '#ccc', fontSize: 16 }} />
        </div>

        {confirmedCount > 0 && (
          <div style={{ marginTop: 8 }}>
            <Tag style={styles.confirmedTag} icon={<TeamOutlined />}>
              {confirmedCount} {t('booking.passengers')}
            </Tag>
          </div>
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
                activeAnnouncements.map(ann => {
                  const annBookings = bookingsByAnnouncement[ann.id] || [];
                  const pendingCount = annBookings.filter(b => b.status === 'pending').length;
                  const confirmedCount = annBookings.filter(b => b.status === 'confirmed').length;
                  
                  return (
                    <AnnouncementCompactCard
                      key={ann.id}
                      announcement={ann}
                      pendingCount={pendingCount}
                      confirmedCount={confirmedCount}
                      onClick={() => openAnnouncementDetails(ann, false)}
                      t={t}
                    />
                  );
                })
              ) : (
                <Empty description={t('common.noData')} style={styles.emptyState} image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
            <div style={styles.contentArea}>
              {completedAnnouncements.length > 0 ? (
                completedAnnouncements.map(ann => renderCompletedAnnouncementCard(ann))
              ) : (
                <Empty description={t('common.noData')} style={styles.emptyState} image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                    onAction={trip.status === 'open' ? () => handleCancelTrip(trip.id) : undefined}
                    actionLabel={trip.status === 'open' ? t('trip.cancel') : undefined}
                  />
                ))
              ) : (
                <Empty description={t('common.noData')} style={styles.emptyState} image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                <Empty description={t('common.noData')} style={styles.emptyState} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          ),
        },
      ];

  return (
    <div style={styles.pageContainer}>
      <div style={styles.tabsPlaceholder} />
      
      <div style={stickyHeaderStyle}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems.map(item => ({ ...item, children: null }))}
          style={{ margin: 0 }}
        />
      </div>

      <div style={{ padding: '0 0 20px 0' }}>
        {tabItems.find(item => item.key === activeTab)?.children}
      </div>

      <FloatingActionButton onClick={() => setShowCreateModal(true)} label={t('common.create')} />

      {/* Модалка создания */}
      <Modal
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={600}
        destroyOnClose
        styles={{ content: { borderRadius: 16 }, header: { borderRadius: '16px 16px 0 0' } }}
      >
        {isDriver ? (
          <CreateAnnouncementForm
            onSuccess={() => { setShowCreateModal(false); loadData(); }}
            onCancel={() => setShowCreateModal(false)}
            onAddCar={() => navigate('/profile')}
          />
        ) : (
          <CreateTripForm
            onSuccess={() => { setShowCreateModal(false); loadData(); }}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
      </Modal>

      {/* Модалка деталей поездки */}
      <TripDetailModal
        announcement={selectedAnnouncement}
        bookings={selectedAnnouncement ? bookingsByAnnouncement[selectedAnnouncement.id] || [] : []}
        onClose={() => setSelectedAnnouncement(null)}
        onComplete={handleCompleteAnnouncement}
        onCancel={handleCancelAnnouncement}
        onConfirmBooking={handleConfirmBooking}
        onRejectBooking={handleRejectBooking}
        onReviewPassenger={handleOpenBookingReview}
        reviewedBookingIds={reviewedBookingIds}
        t={t}
        isCompleted={selectedIsCompleted}
      />

      {/* Модалка отзыва */}
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
              <div><Rate value={reviewRating} onChange={setReviewRating} /></div>
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
              <Checkbox checked={reviewFlags.was_on_time} onChange={e => setReviewFlags(prev => ({ ...prev, was_on_time: e.target.checked }))}>
                {t('review.wasOnTime')}
              </Checkbox>
              <Checkbox checked={reviewFlags.was_polite} onChange={e => setReviewFlags(prev => ({ ...prev, was_polite: e.target.checked }))}>
                {t('review.wasPolite')}
              </Checkbox>
              <Checkbox checked={reviewFlags.car_was_clean} onChange={e => setReviewFlags(prev => ({ ...prev, car_was_clean: e.target.checked }))}>
                {t('review.carWasClean')}
              </Checkbox>
            </Space>
          </Space>
        )}
      </Modal>
    </div>
  );
}