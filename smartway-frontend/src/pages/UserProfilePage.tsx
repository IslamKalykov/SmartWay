// src/pages/UserProfilePage.tsx
import { useState, useEffect } from 'react';
import {
  Card, Typography, Avatar, Spin, Tag, Space, Divider, Rate, List, Empty,
  Button, Modal, Form, Input, message
} from 'antd';
import {
  UserOutlined, CarOutlined, SafetyCertificateOutlined, StarOutlined,
  PhoneOutlined, SendOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useAuth } from '../auth/AuthContext';
import { getUserReviews, createReview, type Review } from '../api/trips';
import api from '../api/client';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ==================== Типы ====================
interface CarInfo {
  id: number;
  brand: string;
  model: string;
  color: string;
  plate_number: string;
  year?: number;
  passenger_seats?: number;
  is_verified?: boolean;
}

interface PublicUser {
  id: number;
  full_name: string;
  phone_number?: string;
  photo?: string;
  bio?: string;
  city?: string;
  telegram_username?: string;
  
  is_driver: boolean;
  is_verified_driver: boolean;
  is_verified_passenger: boolean;
  
  trips_completed_as_driver: number;
  trips_completed_as_passenger: number;
  average_rating: number | null;
  
  cars?: CarInfo[];
  created_at?: string;
}

// ==================== Стили ====================
const styles = {
  container: {
    maxWidth: 600,
    margin: '0 auto',
  },
  backButton: {
    marginBottom: 16,
  },
  profileCard: {
    borderRadius: 16,
    marginBottom: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  nameSection: {
    flex: 1,
  },
  userName: {
    margin: 0,
    fontSize: 22,
    fontWeight: 600,
  },
  statsSection: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap' as const,
  },
  statItem: {
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 600,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  contactButtons: {
    display: 'flex',
    gap: 10,
    marginTop: 16,
  },
  contactBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    fontWeight: 500,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
  },
  reviewCard: {
    marginBottom: 12,
    borderRadius: 12,
    border: '1px solid #f0f0f0',
  },
  reviewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  reviewAuthor: {
    flex: 1,
  },
  writeReviewBtn: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    color: '#fff',
    fontWeight: 600,
    height: 44,
    borderRadius: 10,
    width: '100%',
    marginBottom: 16,
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
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 20,
  },
};

// ==================== API ====================

async function getUserProfile(userId: number): Promise<PublicUser> {
  const response = await api.get(`/users/${userId}/profile/`);
  return response.data;
}

// ==================== Компонент ====================

export default function UserProfilePage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, isAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  const [form] = Form.useForm();

  const isOwnProfile = currentUser?.id === Number(userId);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, reviewsData] = await Promise.all([
        getUserProfile(Number(userId)),
        getUserReviews(Number(userId)),
      ]);
      setProfile(profileData);
      setReviews(reviewsData);
    } catch (error) {
      console.error(error);
      message.error(t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (values: { rating: number; text: string }) => {
    if (!userId) return;

    try {
      setReviewLoading(true);
      await createReview({
        recipient: Number(userId),
        rating: values.rating,
        text: values.text,
      });
      message.success(t('review.submitted'));
      setShowReviewModal(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.response?.data?.error;
      message.error(errorMsg || t('errors.serverError'));
    } finally {
      setReviewLoading(false);
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

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Empty description={t('profile.notFound')} />
        <Button onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Кнопка назад */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={styles.backButton}
      >
        {t('common.back')}
      </Button>

      {/* Основная информация */}
      <Card style={styles.profileCard}>
        <div style={styles.avatarSection}>
          <Avatar
            size={80}
            icon={<UserOutlined />}
            src={profile.photo}
            style={styles.avatar}
          />
          <div style={styles.nameSection}>
            <Title level={4} style={styles.userName}>
              {profile.full_name || t('profile.anonymous')}
            </Title>
            <Space size={8} wrap style={{ marginTop: 8 }}>
              {profile.is_driver && (
                <Tag color="blue">
                  <CarOutlined /> {t('trip.driver')}
                </Tag>
              )}
              {profile.is_verified_driver && (
                <Tag color="green" icon={<SafetyCertificateOutlined />}>
                  {t('profile.verifiedDriver')}
                </Tag>
              )}
              {profile.is_verified_passenger && (
                <Tag color="cyan" icon={<SafetyCertificateOutlined />}>
                  {t('profile.verifiedPassenger')}
                </Tag>
              )}
            </Space>
          </div>
        </div>

        {/* Статистика */}
        <Divider style={{ margin: '16px 0' }} />
        <div style={styles.statsSection}>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{profile.trips_completed_as_driver || 0}</div>
            <div style={styles.statLabel}>{t('profile.tripsAsDriver')}</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{profile.trips_completed_as_passenger || 0}</div>
            <div style={styles.statLabel}>{t('profile.tripsAsPassenger')}</div>
          </div>
          <div style={styles.statItem}>
            <div style={{ ...styles.statValue, color: '#faad14' }}>
              <StarOutlined /> {profile.average_rating?.toFixed(1) || '—'}
            </div>
            <div style={styles.statLabel}>{t('review.rating')}</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{reviews.length}</div>
            <div style={styles.statLabel}>{t('profile.reviewsCount')}</div>
          </div>
        </div>

        {/* О себе */}
        {profile.bio && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Text type="secondary">{t('profile.bio')}</Text>
            <Paragraph style={{ marginTop: 4 }}>{profile.bio}</Paragraph>
          </>
        )}

        {/* Город */}
        {profile.city && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">{t('profile.city')}: </Text>
            <Text>{profile.city}</Text>
          </div>
        )}

        {/* Кнопки связи (только если не свой профиль) */}
        {!isOwnProfile && (profile.phone_number || profile.telegram_username) && (
          <div style={styles.contactButtons}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleTelegram}
              style={{ ...styles.contactBtn, ...styles.telegramBtn }}
            >
              Telegram
            </Button>
            {profile.phone_number && (
              <Button
                type="primary"
                icon={<PhoneOutlined />}
                onClick={handleCall}
                style={{ ...styles.contactBtn, ...styles.phoneBtn }}
              >
                {t('contact.call')}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Автомобили (если водитель) */}
      {profile.is_driver && profile.cars && profile.cars.length > 0 && (
        <Card style={styles.profileCard}>
          <div style={styles.sectionTitle}>
            <CarOutlined /> {t('profile.myCars')}
          </div>
          {profile.cars.map(car => (
            <div key={car.id} style={styles.carCard}>
              <div style={styles.carIcon}>
                <CarOutlined />
              </div>
              <div>
                <Text strong>{car.brand} {car.model}</Text>
                <br />
                <Text type="secondary">
                  {car.color} • {car.plate_number}
                  {car.year && ` • ${car.year}`}
                </Text>
                {car.is_verified && (
                  <Tag color="green" style={{ marginLeft: 8 }}>
                    {t('car.verified')}
                  </Tag>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Отзывы */}
      <Card style={styles.profileCard}>
        <div style={styles.sectionTitle}>
          <StarOutlined /> {t('profile.reviews')} ({reviews.length})
        </div>

        {/* Кнопка написать отзыв (только если не свой профиль и авторизован) */}
        {isAuth && !isOwnProfile && (
          <Button
            type="primary"
            icon={<StarOutlined />}
            onClick={() => setShowReviewModal(true)}
            style={styles.writeReviewBtn}
          >
            {t('review.write')}
          </Button>
        )}

        {reviews.length > 0 ? (
          <List
            dataSource={reviews}
            renderItem={(review) => (
              <Card style={styles.reviewCard} styles={{ body: { padding: 14 } }}>
                <div style={styles.reviewHeader}>
                  <Avatar
                    size={40}
                    icon={<UserOutlined />}
                    src={review.author_photo}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/user/${review.author}`)}
                  />
                  <div style={styles.reviewAuthor}>
                    <Text
                      strong
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/user/${review.author}`)}
                    >
                      {review.author_name || t('profile.anonymous')}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(review.created_at).format('DD.MM.YYYY')}
                    </Text>
                  </div>
                  <Rate disabled defaultValue={review.rating} style={{ fontSize: 14 }} />
                </div>
                {review.text && (
                  <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                    {review.text}
                  </Paragraph>
                )}
              </Card>
            )}
          />
        ) : (
          <Empty description={t('profile.noReviews')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      {/* Модалка написания отзыва */}
      <Modal
        title={t('review.write')}
        open={showReviewModal}
        onCancel={() => setShowReviewModal(false)}
        footer={null}
        styles={{ content: { borderRadius: 16 } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitReview}
          initialValues={{ rating: 5 }}
        >
          <Form.Item
            name="rating"
            label={t('review.rating')}
            rules={[{ required: true, message: t('review.ratingRequired') }]}
          >
            <Rate style={{ fontSize: 28 }} />
          </Form.Item>

          <Form.Item
            name="text"
            label={t('review.text')}
          >
            <TextArea
              rows={4}
              placeholder={t('review.textPlaceholder')}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowReviewModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={reviewLoading}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}
              >
                {t('review.submit')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}