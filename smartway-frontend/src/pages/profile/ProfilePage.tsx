// src/pages/profile/ProfilePage.tsx
import { useState, useEffect } from 'react';
import {
  Card, Typography, Avatar, Button, Form, Input, DatePicker,
  Upload, message, Tabs, Spin, Tag, Space, Divider, Rate, List, Empty, Modal
} from 'antd';
import {
  UserOutlined, EditOutlined, CameraOutlined, CarOutlined,
  SafetyCertificateOutlined, StarOutlined,
  SaveOutlined, CloseOutlined, PlusOutlined, LogoutOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useAuth } from '../../auth/AuthContext';
import { getMyProfile, updateProfile, uploadPhoto, getMyCars, deleteCar, switchRole } from '../../api/auth';
import { getMyReceivedReviews } from '../../api/trips';
import CarForm from '../../components/CarForm';
import type { User, Car } from '../../api/auth';
import type { Review } from '../../api/trips';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const calculateAverageRating = (list: Review[]): number | null => {
  if (!list || list.length === 0) return null;
  const sum = list.reduce((acc, review) => acc + (review.rating || 0), 0);
  return Number((sum / list.length).toFixed(1));
};

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: authUser, logout, updateUser } = useAuth();
  const isDriver = authUser?.is_driver ?? false;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleChanging, setRoleChanging] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showCarModal, setShowCarModal] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);

  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [authUser?.id, authUser?.is_driver]);

  const loadData = async (roleOverride?: boolean) => {
    try {
      setLoading(true);
      const driverMode = roleOverride ?? isDriver;
      const promises: Promise<any>[] = [
        getMyProfile(),
        getMyReceivedReviews().catch(() => []),
      ];
      
      // Загружаем авто только для водителей
      if (driverMode) {
        promises.push(getMyCars().catch(() => []));
      }

      const results = await Promise.all(promises);
      
      setProfile(results[0]);
      updateUser(results[0]);
      setReviews(results[1]);
      if (driverMode && results[2]) {
        setCars(results[2]);
      } else if (!driverMode) {
        setCars([]);
      }

      form.setFieldsValue({
        full_name: results[0].full_name,
        bio: results[0].bio || '',
        city: results[0].city || '',
        birth_date: results[0].birth_date ? dayjs(results[0].birth_date) : null,
      });
    } catch (error) {
      console.error(error);
      message.error(t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (values: any) => {
    try {
      setSaving(true);
      const data = {
        full_name: values.full_name,
        bio: values.bio,
        city: values.city,
        birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
      };

      const updated = await updateProfile(data);
      setProfile(updated);
      updateUser(updated);
      message.success(t('common.success'));
      setEditMode(false);
    } catch (error) {
      console.error(error);
      message.error(t('errors.serverError'));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      await uploadPhoto(file);
      message.success(t('common.success'));
      loadData();
    } catch (error) {
      message.error(t('errors.serverError'));
    }
    return false;
  };

  const handleDeleteCar = async (carId: number) => {
    try {
      await deleteCar(carId);
      message.success(t('common.success'));
      loadData();
    } catch (error) {
      message.error(t('errors.serverError'));
    }
  };

  const handleSwitchRole = async () => {
    if (!profile) return;
    const nextRole = profile.is_driver ? 'passenger' : 'driver';
    try {
      setRoleChanging(true);
      await switchRole(nextRole);
      const freshProfile = await getMyProfile();
      setProfile(freshProfile);
      updateUser(freshProfile);
      await loadData(nextRole === 'driver');
      message.success(t('profile.roleSwitched'));
    } catch (error: any) {
      message.error(error?.response?.data?.detail || t('errors.serverError'));
    } finally {
      setRoleChanging(false);
    }
  };

  const handleLogout = () => {
    Modal.confirm({
      title: t('profile.logoutConfirm'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () => {
        logout();
        navigate('/login');
      },
    });
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

  const averageRating = profile?.average_rating ?? calculateAverageRating(reviews);
  const formattedRating = averageRating !== null ? averageRating.toFixed(1) : '—';

  // Базовые табы
  const tabItems = [
    {
      key: 'info',
      label: t('profile.title'),
      children: (
        <div>
          {editMode ? (
            <Form form={form} layout="vertical" onFinish={handleSaveProfile}>
              <Form.Item name="full_name" label={t('profile.fullName')}>
                <Input />
              </Form.Item>
              <Form.Item name="city" label={t('profile.city')}>
                <Input />
              </Form.Item>
              <Form.Item name="birth_date" label={t('profile.birthDate')}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="bio" label={t('profile.bio')}>
                <TextArea rows={3} />
              </Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                  icon={<SaveOutlined />}
                >
                  {t('profile.saveProfile')}
                </Button>
                <Button onClick={() => setEditMode(false)} icon={<CloseOutlined />}>
                  {t('profile.cancelEdit')}
                </Button>
              </Space>
            </Form>
          ) : (
            <div>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">{t('profile.fullName')}</Text>
                  <div><Text strong>{profile?.full_name || '—'}</Text></div>
                </div>
                <div>
                  <Text type="secondary">{t('profile.phone')}</Text>
                  <div><Text>{profile?.phone_number}</Text></div>
                </div>
                <div>
                  <Text type="secondary">{t('profile.city')}</Text>
                  <div><Text>{profile?.city || '—'}</Text></div>
                </div>
                {profile?.bio && (
                  <div>
                    <Text type="secondary">{t('profile.bio')}</Text>
                    <div><Paragraph>{profile.bio}</Paragraph></div>
                  </div>
                )}
              </Space>
              <Divider />
              <Button icon={<EditOutlined />} onClick={() => setEditMode(true)}>
                {t('profile.editProfile')}
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'reviews',
      label: (
        <span>
          <StarOutlined /> {t('profile.reviews')} ({reviews.length})
        </span>
      ),
      children: (
        <div>
          {reviews.length > 0 ? (
            <List
              dataSource={reviews}
              renderItem={(review) => (
                <Card style={{ marginBottom: 12, borderRadius: 8 }} styles={{ body: { padding: 16 } }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Avatar icon={<UserOutlined />} src={review.author_photo} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>{review.author_name}</Text>
                        <Rate disabled defaultValue={review.rating} style={{ fontSize: 14 }} />
                      </div>
                      {review.text && (
                        <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                          {review.text}
                        </Paragraph>
                      )}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(review.created_at).format('DD.MM.YYYY')}
                      </Text>
                    </div>
                  </div>
                </Card>
              )}
            />
          ) : (
            <Empty description={t('profile.noReviews')} />
          )}
        </div>
      ),
    },
  ];

  // Добавляем вкладку авто ТОЛЬКО для водителей
  if (isDriver) {
    tabItems.splice(1, 0, {
      key: 'cars',
      label: (
        <span>
          <CarOutlined /> {t('profile.myCars')} ({cars.length})
        </span>
      ),
      children: (
        <div>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCar(null);
              setShowCarModal(true);
            }}
            style={{ marginBottom: 16 }}
          >
            {t('profile.addCar')}
          </Button>

          {cars.length > 0 ? (
            <List
              dataSource={cars}
              renderItem={(car) => (
                <Card style={{ marginBottom: 12, borderRadius: 8 }} styles={{ body: { padding: 16 } }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <Text strong>{car.brand} {car.model}</Text>
                      <br />
                      <Text type="secondary">
                        {car.year} • {car.color} • {car.plate_number}
                      </Text>
                      <br />
                      <Text type="secondary">{car.passenger_seats} {t('trip.seats')}</Text>
                      {car.is_verified && (
                        <Tag color="green" style={{ marginLeft: 8 }}>{t('car.verified')}</Tag>
                      )}
                    </div>
                    <Space>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingCar(car);
                          setShowCarModal(true);
                        }}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button size="small" danger onClick={() => handleDeleteCar(car.id)}>
                        {t('common.delete')}
                      </Button>
                    </Space>
                  </div>
                </Card>
              )}
            />
          ) : (
            <Empty description={t('common.noData')} />
          )}
        </div>
      ),
    });
  }

  return (
    <div>
      {/* Header Card */}
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Upload showUploadList={false} beforeUpload={handlePhotoUpload} accept="image/*">
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <Avatar size={80} icon={<UserOutlined />} src={profile?.photo} />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: '#1677ff',
                  borderRadius: '50%',
                  padding: 4,
                }}
              >
                <CameraOutlined style={{ color: '#fff', fontSize: 12 }} />
              </div>
            </div>
          </Upload>

          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0 }}>
              {profile?.full_name || t('profile.title')}
            </Title>
            <Space size={8} wrap style={{ marginTop: 8 }}>
              {profile?.is_driver && (
                <Tag color="blue"><CarOutlined /> {t('trip.driver')}</Tag>
              )}
              {!profile?.is_driver && (
                <Tag color="geekblue"><UserOutlined /> {t('trip.passenger')}</Tag>
              )}
              {profile?.is_verified_driver && (
                <Tag color="green" icon={<SafetyCertificateOutlined />}>
                  {t('profile.verifiedDriver')}
                </Tag>
              )}
              {profile?.is_verified_passenger && (
                <Tag color="cyan" icon={<SafetyCertificateOutlined />}>
                  {t('profile.verifiedPassenger')}
                </Tag>
              )}
            </Space>
            <div style={{ marginTop: 12 }}>
              <Button
                size="small"
                onClick={handleSwitchRole}
                loading={roleChanging}
              >
                {profile?.is_driver ? t('profile.switchToPassenger') : t('profile.switchToDriver')}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <Divider />
        <Space size={24} wrap>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {profile?.trips_completed_as_driver || 0}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('profile.tripsAsDriver')}
            </Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {profile?.trips_completed_as_passenger || 0}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('profile.tripsAsPassenger')}
            </Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#faad14' }}>
              <StarOutlined /> {formattedRating}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('review.rating')}
            </Text>
          </div>
        </Space>
      </Card>

      {/* Tabs */}
      <Card style={{ borderRadius: 12 }}>
        <Tabs items={tabItems} />
      </Card>

      {/* Кнопка выхода — внизу, заметная */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Button
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          size="large"
          style={{ 
            borderRadius: 8,
            minWidth: 200,
          }}
        >
          {t('profile.logout')}
        </Button>
      </div>

      {/* Car Modal */}
      <Modal
        open={showCarModal}
        onCancel={() => setShowCarModal(false)}
        footer={null}
        title={editingCar ? t('car.editTitle') : t('car.addTitle')}
        destroyOnHidden
      >
        <CarForm
          car={editingCar}
          onSuccess={() => {
            setShowCarModal(false);
            loadData();
          }}
          onCancel={() => setShowCarModal(false)}
        />
      </Modal>
    </div>
  );
}