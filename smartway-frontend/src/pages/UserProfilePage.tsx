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
  Modal,
  Form,
  Input,
  Checkbox,
  message,
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
  ClockCircleOutlined,
  SmileOutlined,
  EditOutlined,
  LikeOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import { useAuth } from '../auth/AuthContext';
import api from '../api/client';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

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

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [form] = Form.useForm();

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadReviews();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${userId}/`);
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
      const response = await api.get(`/users/${userId}/reviews/`);
      const data = response.data;
      const normalizedReviews = Array.isArray(data)
        ? data
        : Array.isArray((data as { results?: unknown[] })?.results)
          ? (data as { results: Review[] }).results
          : [];
      setReviews(normalizedReviews);
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

  const handleSubmitReview = async (values: any) => {
    try {
      setSubmitting(true);
      await api.post(`/users/${userId}/reviews/`, {
        rating: values.rating,
        text: values.text || '',
        was_on_time: values.was_on_time || false,
        was_polite: values.was_polite || false,
        car_was_clean: values.car_was_clean || false,
      });
      message.success(t('reviews.submitted', 'Отзыв отправлен!'));
      setReviewModalOpen(false);
      form.resetFields();
      loadReviews();
      loadProfile();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      message.error(detail || t('errors.serverError'));
    } finally {
      setSubmitting(false);
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
          {t('common.back', 'Назад')}
        </Button>
        <Empty description={t('errors.userNotFound', 'Пользователь не найден')} />
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
        {t('common.back', 'Назад')}
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
                <Text type="secondary">({reviews.length} {t('reviews.reviews', 'отзывов')})</Text>
              </div>
            )}
            
            <div style={styles.badgesRow}>
              {profile.is_driver && (
                <Tag color="blue" icon={<CarOutlined />}>{t('trip.driver', 'Водитель')}</Tag>
              )}
              {profile.is_verified_driver && (
                <Tag color="green" icon={<SafetyCertificateOutlined />}>{t('profile.verified', 'Верифицирован')}</Tag>
              )}
              {profile.is_verified_passenger && (
                <Tag color="cyan" icon={<CheckCircleOutlined />}>{t('profile.verifiedPassenger', 'Проверенный пассажир')}</Tag>
              )}
              {memberSince && (
                <Tag icon={<CalendarOutlined />}>{t('profile.memberSince', 'С')} {memberSince}</Tag>
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
                  title={t('common.call', 'Позвонить')}
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
            <div style={styles.statLabel}>{t('profile.trips', 'Поездок')}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{reviews.length}</div>
            <div style={styles.statLabel}>{t('reviews.reviews', 'Отзывов')}</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#faad14' }}>
              {rating > 0 ? rating.toFixed(1) : '—'}
            </div>
            <div style={styles.statLabel}>{t('profile.rating', 'Рейтинг')}</div>
          </div>
        </div>

        {/* Метрики отзывов - красивые карточки */}
        {reviewStats.total > 0 && (
          <>
            <Divider style={{ margin: '20px 0 16px' }} />
            <div style={styles.metricsGrid}>
              <MetricCard
                icon={<ClockCircleOutlined />}
                count={reviewStats.onTime}
                label={t('reviews.punctual', 'Пунктуальный')}
                color="#667eea"
                bgColor="rgba(102, 126, 234, 0.1)"
              />
              <MetricCard
                icon={<SmileOutlined />}
                count={reviewStats.polite}
                label={t('reviews.polite', 'Вежливый')}
                color="#52c41a"
                bgColor="rgba(82, 196, 26, 0.1)"
              />
              {profile.is_driver && (
                <MetricCard
                  icon={<CarOutlined />}
                  count={reviewStats.cleanCar}
                  label={t('reviews.cleanCar', 'Чистое авто')}
                  color="#1890ff"
                  bgColor="rgba(24, 144, 255, 0.1)"
                />
              )}
            </div>
          </>
        )}
      </Card>

      {/* Автомобили (для водителей) */}
      {profile.is_driver && profile.cars && profile.cars.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            <CarOutlined />
            {t('profile.cars', 'Автомобили')}
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
                <Tag color="green" icon={<CheckCircleOutlined />}>{t('profile.verified', 'Проверен')}</Tag>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Отзывы */}
      <div style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={styles.sectionTitle}>
            <StarFilled style={{ color: '#faad14' }} />
            {t('reviews.title', 'Отзывы')} ({reviews.length})
          </div>
          
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
                <Paragraph style={{ marginBottom: 8, marginTop: 8, color: '#555' }}>
                  "{review.text}"
                </Paragraph>
              )}
              
              <Space size={4} wrap>
                {review.was_on_time && (
                  <Tag 
                    style={styles.reviewTag}
                    icon={<ClockCircleOutlined />}
                  >
                    {t('reviews.punctual', 'Пунктуальный')}
                  </Tag>
                )}
                {review.was_polite && (
                  <Tag 
                    style={{ ...styles.reviewTag, background: 'rgba(82, 196, 26, 0.1)', color: '#52c41a', borderColor: 'rgba(82, 196, 26, 0.3)' }}
                    icon={<SmileOutlined />}
                  >
                    {t('reviews.polite', 'Вежливый')}
                  </Tag>
                )}
              </Space>
            </div>
          ))
        ) : (
          <Empty 
            description={t('reviews.noReviews', 'Пока нет отзывов')} 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {!isOwnProfile && currentUser && (
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={() => setReviewModalOpen(true)}
              >
                {t('reviews.beFirst', 'Будьте первым!')}
              </Button>
            )}
          </Empty>
        )}
      </div>

      {/* Модалка для отзыва */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarFilled style={{ color: '#faad14' }} />
            {t('reviews.leaveReviewFor', 'Оставить отзыв для')} {profile.full_name}
          </div>
        }
        open={reviewModalOpen}
        onCancel={() => {
          setReviewModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        centered
        width={400}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitReview}
          initialValues={{ rating: 5 }}
        >
          <Form.Item
            name="rating"
            label={t('reviews.yourRating', 'Ваша оценка')}
            rules={[{ required: true, message: t('reviews.ratingRequired', 'Поставьте оценку') }]}
          >
            <Rate style={{ fontSize: 32 }} />
          </Form.Item>

          <Form.Item
            name="text"
            label={t('reviews.comment', 'Комментарий')}
          >
            <TextArea 
              rows={3} 
              placeholder={t('reviews.commentPlaceholder', 'Расскажите о вашем опыте...')}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item label={t('reviews.qualities', 'Отметьте качества')}>
            <div style={styles.qualitiesGrid}>
              <Form.Item name="was_on_time" valuePropName="checked" noStyle>
                <QualityCheckbox
                  icon={<ClockCircleOutlined />}
                  label={t('reviews.punctual', 'Пунктуальный')}
                  color="#667eea"
                />
              </Form.Item>
              <Form.Item name="was_polite" valuePropName="checked" noStyle>
                <QualityCheckbox
                  icon={<SmileOutlined />}
                  label={t('reviews.polite', 'Вежливый')}
                  color="#52c41a"
                />
              </Form.Item>
              {profile.is_driver && (
                <Form.Item name="car_was_clean" valuePropName="checked" noStyle>
                  <QualityCheckbox
                    icon={<CarOutlined />}
                    label={t('reviews.cleanCar', 'Чистое авто')}
                    color="#1890ff"
                  />
                </Form.Item>
              )}
            </div>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
              size="large"
              style={{ borderRadius: 8, height: 44 }}
            >
              {t('reviews.submit', 'Отправить отзыв')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ==================== Компонент метрики ====================
interface MetricCardProps {
  icon: React.ReactNode;
  count: number;
  label: string;
  color: string;
  bgColor: string;
}

function MetricCard({ icon, count, label, color, bgColor }: MetricCardProps) {
  return (
    <div style={{ ...styles.metricCard, background: bgColor }}>
      <div style={{ ...styles.metricIcon, color, background: `${color}20` }}>
        {icon}
      </div>
      <div style={{ ...styles.metricCount, color }}>{count}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

// ==================== Компонент чекбокса качества ====================
interface QualityCheckboxProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

function QualityCheckbox({ icon, label, color, checked, onChange }: QualityCheckboxProps) {
  return (
    <div
      onClick={() => onChange?.(!checked)}
      style={{
        ...styles.qualityItem,
        background: checked ? `${color}15` : '#f5f5f5',
        borderColor: checked ? color : '#e8e8e8',
        cursor: 'pointer',
      }}
    >
      <div style={{ color: checked ? color : '#999', fontSize: 20 }}>
        {icon}
      </div>
      <div style={{ 
        fontSize: 12, 
        color: checked ? color : '#666',
        fontWeight: checked ? 500 : 400,
      }}>
        {label}
      </div>
      {checked && (
        <CheckCircleOutlined style={{ color, fontSize: 14, position: 'absolute', top: 6, right: 6 }} />
      )}
    </div>
  );
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
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },
  metricCard: {
    borderRadius: 12,
    padding: '12px 8px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 6,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
  },
  metricCount: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center' as const,
    lineHeight: 1.2,
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
  reviewTag: {
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    borderColor: 'rgba(102, 126, 234, 0.3)',
    borderRadius: 6,
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
  addReviewBtn: {
    borderRadius: 8,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
  },
  qualitiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
    gap: 10,
  },
  qualityItem: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 6,
    padding: '14px 8px',
    borderRadius: 12,
    border: '2px solid',
    transition: 'all 0.2s ease',
  },
};