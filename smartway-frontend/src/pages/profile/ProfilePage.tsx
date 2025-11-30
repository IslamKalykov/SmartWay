// src/pages/profile/ProfilePage.tsx
import { useState, useEffect } from 'react';
import {
  Card, Typography, Avatar, Button, Form, Input, DatePicker,
  Upload, message, Tabs, Spin, Tag, Space, Divider, Rate, List, Empty, Modal
} from 'antd';
import {
  UserOutlined, EditOutlined, CameraOutlined, CarOutlined,
  SafetyCertificateOutlined, StarOutlined, PhoneOutlined,
  SaveOutlined, CloseOutlined, PlusOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import { useAuth } from '../../auth/AuthContext';
import { getMyProfile, updateProfile, uploadPhoto, getMyCars, deleteCar } from '../../api/auth';
import { getMyReceivedReviews } from '../../api/trips';
import CarForm from '../../components/CarForm';
import type { User, Car } from '../../api/auth';
import type { Review } from '../../api/trips';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user: authUser, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showCarModal, setShowCarModal] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);

  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, carsData, reviewsData] = await Promise.all([
        getMyProfile(),
        getMyCars().catch(() => []),
        getMyReceivedReviews().catch(() => []),
      ]);

      setProfile(profileData);
      setCars(carsData);
      setReviews(reviewsData);

      form.setFieldsValue({
        full_name: profileData.full_name,
        bio: profileData.bio || '',
        city: profileData.city || '',
        birth_date: profileData.birth_date ? dayjs(profileData.birth_date) : null,
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
      refreshUser?.();
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
      refreshUser?.();
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
                  <div>
                    <Text strong>{profile?.full_name || '—'}</Text>
                  </div>
                </div>
                <div>
                  <Text type="secondary">{t('profile.phone')}</Text>
                  <div>
                    <Text>{profile?.phone_number}</Text>
                  </div>
                </div>
                <div>
                  <Text type="secondary">{t('profile.city')}</Text>
                  <div>
                    <Text>{profile?.city || '—'}</Text>
                  </div>
                </div>
                {profile?.bio && (
                  <div>
                    <Text type="secondary">{t('profile.bio')}</Text>
                    <div>
                      <Paragraph>{profile.bio}</Paragraph>
                    </div>
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
                <Card
                  style={{ marginBottom: 12, borderRadius: 8 }}
                  bodyStyle={{ padding: 16 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <Text strong>
                        {car.brand} {car.model}
                      </Text>
                      <br />
                      <Text type="secondary">
                        {car.year} • {car.color} • {car.plate_number}
                      </Text>
                      <br />
                      <Text type="secondary">
                        {car.passenger_seats} {t('trip.seats')}
                      </Text>
                      {car.is_verified && (
                        <Tag color="green" style={{ marginLeft: 8 }}>
                          {t('car.verified')}
                        </Tag>
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
                      <Button
                        size="small"
                        danger
                        onClick={() => handleDeleteCar(car.id)}
                      >
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
                <Card
                  style={{ marginBottom: 12, borderRadius: 8 }}
                  bodyStyle={{ padding: 16 }}
                >
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

  return (
    <div>
      {/* Header Card */}
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Upload
            showUploadList={false}
            beforeUpload={handlePhotoUpload}
            accept="image/*"
          >
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <Avatar
                size={80}
                icon={<UserOutlined />}
                src={profile?.photo}
              />
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
                <Tag color="blue">
                  <CarOutlined /> {t('trip.driver')}
                </Tag>
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
          </div>
        </div>

        {/* Stats */}
        <Divider />
        <Space size={24}>
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
              <StarOutlined /> {profile?.average_rating?.toFixed(1) || '—'}
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

      {/* Car Modal */}
      <Modal
        open={showCarModal}
        onCancel={() => setShowCarModal(false)}
        footer={null}
        title={editingCar ? t('car.editTitle') : t('car.addTitle')}
        destroyOnClose
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