// src/pages/UserProfilePage.tsx
import { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Avatar,
  Tag,
  Rate,
  Spin,
  Empty,
  Divider,
  Space,
  Button,
  List,
  Progress,
} from 'antd';
import {
  UserOutlined,
  StarFilled,
  CheckCircleOutlined,
  CarOutlined,
  PhoneOutlined,
  SendOutlined,
  ArrowLeftOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  LikeOutlined,
  ClockCircleOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import { useAuth } from '../auth/AuthContext';
// import api from '../api/axios';

const { Title, Text, Paragraph } = Typography;

interface UserProfile {
  id: number;
  full_name: string;
  phone_number?: string;
  photo?: string;
  telegram_username?: string;
  is_driver: boolean;
  is_verified_driver?: boolean;
  is_verified_passenger?: boolean;
  average_rating?: number;
  average_rating_as_driver?: number;
  average_rating_as_passenger?: number;
  trips_completed_as_driver?: number;
  trips_completed_as_passenger?: number;
  reviews_count?: number;
  date_joined?: string;
  cars?: Array<{
    id: number;
    brand: string;
    model: string;
    color: string;
    year?: number;
    plate_number?: string;
    is_verified?: boolean;
  }>;
}

interface Review {
  id: number;
  author_name: string;
  author_photo?: string;
  rating: number;
  text: string;
  was_on_time?: boolean;
  was_polite?: boolean;
  car_was_clean?: boolean;
  created_at: string;
}

// ==================== Стили ====================
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '20px 16px',
    paddingBottom: 100,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: '3px solid #fff',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 4,
    color: '#1a1a2e',
  },
  ratingBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: 600,
    color: '#faad14',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    background: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#667eea',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#1a1a2e',
  },
  carCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 8,
  },
  carIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 20,
  },
  reviewCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    border: '1px solid #f0f0f0',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewAuthor: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  contactBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
  },
  telegramBtn: {
    background: 'linear-gradient(135deg, #0088cc 0%, #00c6ff 100%)',
    color: '#fff',
  },
  phoneBtn: {
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    color: '#fff',
  },
  backButton: {
    marginBottom: 16,
  },
  badgesRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
    marginTop: 8,
  },
  ratingBreakdown: {
    marginTop: 16,
  },
  ratingBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
};

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadReviews();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/users/${userId}/`);
      setProfile(response.data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await api.get(`/api/users/${userId}/reviews/`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleTelegram = () => {
    if (profile?.telegram_username) {
      window.open(`https://t.me/${profile.telegram_username.replace('@', '')}`, '_blank');
    } else if (profile?.phone_number) {
      const cleanPhone = profile.phone_number.replace(/\D/g, '');
      window.open(`https://t.me/+${cleanPhone}`, '_blank');
    }
  };

  const handleCall = () => {
    if (profile?.phone_number) {
      const cleanPhone = profile.phone_number.replace(/\D/g, '');
      window.location.href = `tel:+${cleanPhone}`;
    }
  };

  // Подсчёт статистики отзывов
  const reviewStats = reviews.reduce(
    (acc, review) => {
      acc.total++;
      if (review.was_on_time) acc.onTime++;
      if (review.was_polite) acc.polite++;
      if (review.car_was_clean) acc.cleanCar++;
      return acc;
    },
    { total: 0, onTime: 0, polite: 0, cleanCar: 0 }
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.container}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
          style={styles.backButton}
        >
          Назад
        </Button>
        <Empty description="Пользователь не найден" />
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const rating = profile.average_rating || profile.average_rating_as_driver || profile.average_rating_as_passenger || 0;
  const tripsCount = (profile.trips_completed_as_driver || 0) + (profile.trips_completed_as_passenger || 0);
  const memberSince = profile.date_joined ? dayjs(profile.date_joined).format('MMMM YYYY') : null;

  return (
    <div style={styles.container}>
      {/* Кнопка назад */}
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate(-1)}
        style={styles.backButton}
        type="text"
      >
        Назад
      </Button>

      {/* Шапка профиля */}
      <Card style={{ borderRadius: 16, marginBottom: 16 }}>
        <div style={styles.header}>
          <div style={styles.avatarContainer}>
            <Avatar
              src={profile.photo}
              icon={<UserOutlined />}
              size={80}
              style={styles.avatar}
            />
          </div>
          
          <div style={styles.userInfo}>
            <div style={styles.userName}>{profile.full_name}</div>
            
            {rating > 0 && (
              <div style={styles.ratingBlock}>
                <StarFilled style={{ color: '#faad14', fontSize: 18 }} />
                <span style={styles.ratingValue}>{rating.toFixed(1)}</span>
                <Text type="secondary">({reviews.length} отзывов)</Text>
              </div>
            )}
            
            <div style={styles.badgesRow}>
              {profile.is_driver && (
                <Tag color="blue" icon={<CarOutlined />}>Водитель</Tag>
              )}
              {profile.is_verified_driver && (
                <Tag color="green" icon={<SafetyCertificateOutlined />}>Верифицирован</Tag>
              )}
              {profile.is_verified_passenger && (
                <Tag color="cyan" icon={<CheckCircleOutlined />}>Проверенный пассажир</Tag>
              )}
              {memberSince && (
                <Tag icon={<CalendarOutlined />}>С {memberSince}</Tag>
              )}
            </div>
          </div>
          
          {/* Кнопки контактов (не для своего профиля) */}
          {!isOwnProfile && (
            <div style={{ display: 'flex', gap: 8 }}>
              {(profile.telegram_username || profile.phone_number) && (
                <button
                  onClick={handleTelegram}
                  style={{ ...styles.contactBtn, ...styles.telegramBtn }}
                  title="Telegram"
                >
                  <SendOutlined style={{ fontSize: 18 }} />
                </button>
              )}
              {profile.phone_number && (
                <button
                  onClick={handleCall}
                  style={{ ...styles.contactBtn, ...styles.phoneBtn }}
                  title="Позвонить"
                >
                  <PhoneOutlined style={{ fontSize: 18 }} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Статистика */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{tripsCount}</div>
            <div style={styles.statLabel}>Поездок</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{reviews.length}</div>
            <div style={styles.statLabel}>Отзывов</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#faad14' }}>
              {rating > 0 ? rating.toFixed(1) : '—'}
            </div>
            <div style={styles.statLabel}>Рейтинг</div>
          </div>
        </div>

        {/* Показатели отзывов */}
        {reviewStats.total > 0 && (
          <div style={styles.ratingBreakdown}>
            <Divider style={{ margin: '16px 0' }} />
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <div style={styles.ratingBar}>
                <ClockCircleOutlined style={{ color: '#667eea' }} />
                <Text style={{ width: 120 }}>Пунктуальность</Text>
                <Progress 
                  percent={Math.round((reviewStats.onTime / reviewStats.total) * 100)} 
                  size="small"
                  style={{ flex: 1 }}
                  strokeColor="#667eea"
                />
              </div>
              <div style={styles.ratingBar}>
                <SmileOutlined style={{ color: '#52c41a' }} />
                <Text style={{ width: 120 }}>Вежливость</Text>
                <Progress 
                  percent={Math.round((reviewStats.polite / reviewStats.total) * 100)} 
                  size="small"
                  style={{ flex: 1 }}
                  strokeColor="#52c41a"
                />
              </div>
              {profile.is_driver && (
                <div style={styles.ratingBar}>
                  <CarOutlined style={{ color: '#1890ff' }} />
                  <Text style={{ width: 120 }}>Чистота авто</Text>
                  <Progress 
                    percent={Math.round((reviewStats.cleanCar / reviewStats.total) * 100)} 
                    size="small"
                    style={{ flex: 1 }}
                    strokeColor="#1890ff"
                  />
                </div>
              )}
            </Space>
          </div>
        )}
      </Card>

      {/* Автомобили (для водителей) */}
      {profile.is_driver && profile.cars && profile.cars.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <CarOutlined />
            Автомобили
          </div>
          {profile.cars.map(car => (
            <div key={car.id} style={styles.carCard}>
              <div style={styles.carIcon}>
                <CarOutlined />
              </div>
              <div style={{ flex: 1 }}>
                <Text strong>{car.brand} {car.model}</Text>
                <div>
                  <Text type="secondary">
                    {car.color}{car.year ? `, ${car.year}` : ''}
                  </Text>
                </div>
              </div>
              {car.is_verified && (
                <Tag color="green" icon={<CheckCircleOutlined />}>Проверен</Tag>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Отзывы */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <StarFilled style={{ color: '#faad14' }} />
          Отзывы ({reviews.length})
        </div>
        
        {reviewsLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : reviews.length > 0 ? (
          reviews.map(review => (
            <div key={review.id} style={styles.reviewCard}>
              <div style={styles.reviewHeader}>
                <div style={styles.reviewAuthor}>
                  <Avatar src={review.author_photo} icon={<UserOutlined />} size={40} />
                  <div>
                    <Text strong>{review.author_name}</Text>
                    <div>
                      <Rate disabled value={review.rating} style={{ fontSize: 14 }} />
                    </div>
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(review.created_at).format('DD.MM.YYYY')}
                </Text>
              </div>
              
              {review.text && (
                <Paragraph style={{ marginBottom: 8, marginTop: 8 }}>
                  "{review.text}"
                </Paragraph>
              )}
              
              <Space size={4} wrap>
                {review.was_on_time && (
                  <Tag color="blue" icon={<ClockCircleOutlined />}>Вовремя</Tag>
                )}
                {review.was_polite && (
                  <Tag color="green" icon={<SmileOutlined />}>Вежливый</Tag>
                )}
                {review.car_was_clean && (
                  <Tag color="cyan" icon={<CarOutlined />}>Чистое авто</Tag>
                )}
              </Space>
            </div>
          ))
        ) : (
          <Empty 
            description="Пока нет отзывов" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>
    </div>
  );
}