// src/pages/profile/ProfilePage.tsx
import { useState, useEffect } from 'react';
import {
  Card, Typography, Avatar, Button, Form, Input, DatePicker,
  Upload, message, Tabs, Spin, Tag, Space, Divider, Rate, List, Empty, Badge
} from 'antd';
import {
  UserOutlined, EditOutlined, CameraOutlined, CarOutlined,
  SafetyCertificateOutlined, StarOutlined, PhoneOutlined,
  EnvironmentOutlined, CalendarOutlined, CheckCircleOutlined,
  SaveOutlined, CloseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { useAuth } from '../../auth/AuthContext';
import { getMyProfile, updateProfile, uploadPhoto, getMyCars } from '../../api/auth';
import { getMyReceivedReviews } from '../../api/trips';
import type { User, Car } from '../../api/auth';
import type { Review } from '../../api/trips';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function ProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editMode, setEditMode] = useState(false);
  
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
      message.error('Ошибка загрузки профиля');
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
      message.success('Профиль сохранён');
      setEditMode(false);
    } catch (error) {
      console.error(error);
      message.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      const result = await uploadPhoto(file);
      message.success('Фото обновлено');
      loadData();
      refreshUser?.();
    } catch (error) {
      console.error(error);
      message.error('Ошибка загрузки фото');
    }
    return false;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!profile) {
    return <Empty description="Профиль не найден" />;
  }

  const isVerified = profile.is_driver ? profile.is_verified_driver : profile.is_verified_passenger;
  const rating = profile.is_driver ? profile.average_rating_as_driver : profile.average_rating_as_passenger;
  const tripsCount = profile.is_driver ? profile.trips_completed_as_driver : profile.trips_completed_as_passenger;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      {/* Header Card */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <Badge
              count={isVerified ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} /> : null}
              offset={[-8, 70]}
            >
              <Avatar
                size={90}
                src={profile.photo}
                icon={<UserOutlined />}
                style={{ border: '3px solid #f0f0f0' }}
              />
            </Badge>
            <Upload
              showUploadList={false}
              beforeUpload={handlePhotoUpload}
              accept="image/*"
            >
              <Button
                shape="circle"
                icon={<CameraOutlined />}
                size="small"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              />
            </Upload>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <Title level={4} style={{ margin: 0 }}>
              {profile.full_name || 'Имя не указано'}
            </Title>
            
            <Space style={{ marginTop: 8 }} wrap>
              <Tag color={profile.is_driver ? 'blue' : 'green'}>
                {profile.is_driver ? '🚗 Водитель' : '👤 Пассажир'}
              </Tag>
              {isVerified && (
                <Tag icon={<SafetyCertificateOutlined />} color="success">
                  Подтверждён
                </Tag>
              )}
            </Space>
            
            <div style={{ marginTop: 12 }}>
              <Text type="secondary"><PhoneOutlined /> {profile.phone_number}</Text>
            </div>
            {profile.city && (
              <div><Text type="secondary"><EnvironmentOutlined /> {profile.city}</Text></div>
            )}
            
            {/* Stats */}
            <Space style={{ marginTop: 16 }} split={<Divider type="vertical" />}>
              <div style={{ textAlign: 'center' }}>
                <div><StarOutlined style={{ color: '#faad14' }} /></div>
                <Text strong>{rating?.toFixed(1) || '—'}</Text>
                <div><Text type="secondary" style={{ fontSize: 11 }}>Рейтинг</Text></div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div><CarOutlined /></div>
                <Text strong>{tripsCount || 0}</Text>
                <div><Text type="secondary" style={{ fontSize: 11 }}>Поездок</Text></div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div><CalendarOutlined /></div>
                <Text strong>{dayjs(profile.created_at).format('MMM YY')}</Text>
                <div><Text type="secondary" style={{ fontSize: 11 }}>С нами</Text></div>
              </div>
            </Space>
          </div>

          {/* Edit Button */}
          <div>
            {!editMode && (
              <Button icon={<EditOutlined />} onClick={() => setEditMode(true)}>
                Редактировать
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs
          defaultActiveKey="info"
          items={[
            {
              key: 'info',
              label: 'Информация',
              children: editMode ? (
                <Form form={form} layout="vertical" onFinish={handleSaveProfile}>
                  <Form.Item
                    name="full_name"
                    label="ФИО"
                    rules={[{ required: true, message: 'Введите имя' }]}
                  >
                    <Input placeholder="Ваше полное имя" />
                  </Form.Item>
                  
                  <Form.Item name="city" label="Город">
                    <Input placeholder="Бишкек" />
                  </Form.Item>
                  
                  <Form.Item name="birth_date" label="Дата рождения">
                    <DatePicker style={{ width: '100%' }} placeholder="Выберите дату" />
                  </Form.Item>
                  
                  <Form.Item name="bio" label="О себе">
                    <TextArea rows={3} placeholder="Расскажите о себе" maxLength={500} showCount />
                  </Form.Item>
                  
                  <Space>
                    <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                      Сохранить
                    </Button>
                    <Button onClick={() => setEditMode(false)} icon={<CloseOutlined />}>
                      Отмена
                    </Button>
                  </Space>
                </Form>
              ) : (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {profile.bio && (
                    <div>
                      <Text type="secondary">О себе</Text>
                      <Paragraph style={{ marginBottom: 0 }}>{profile.bio}</Paragraph>
                    </div>
                  )}
                  <div>
                    <Text type="secondary">Телефон</Text>
                    <Paragraph style={{ marginBottom: 0 }}>{profile.phone_number}</Paragraph>
                  </div>
                  {profile.city && (
                    <div>
                      <Text type="secondary">Город</Text>
                      <Paragraph style={{ marginBottom: 0 }}>{profile.city}</Paragraph>
                    </div>
                  )}
                  {profile.birth_date && (
                    <div>
                      <Text type="secondary">Дата рождения</Text>
                      <Paragraph style={{ marginBottom: 0 }}>{dayjs(profile.birth_date).format('DD.MM.YYYY')}</Paragraph>
                    </div>
                  )}
                  <div>
                    <Text type="secondary">ID</Text>
                    <Paragraph copyable style={{ marginBottom: 0 }}>{profile.public_id}</Paragraph>
                  </div>
                </Space>
              ),
            },
            {
              key: 'cars',
              label: `Авто (${cars.length})`,
              children: cars.length > 0 ? (
                <List
                  dataSource={cars}
                  renderItem={(car) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={car.photo ? <Avatar src={car.photo} shape="square" size={64} /> : <CarOutlined style={{ fontSize: 32 }} />}
                        title={`${car.brand} ${car.model} ${car.year || ''}`}
                        description={
                          <Space direction="vertical" size={4}>
                            <Text>{car.plate_number} • {car.passenger_seats} мест</Text>
                            <Space size={4}>
                              {car.has_air_conditioning && <Tag>Кондиционер</Tag>}
                              {car.is_verified && <Tag color="green">Проверен</Tag>}
                            </Space>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="Нет автомобилей" />
              ),
            },
            {
              key: 'reviews',
              label: `Отзывы (${reviews.length})`,
              children: reviews.length > 0 ? (
                <List
                  dataSource={reviews}
                  renderItem={(review) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar src={review.author_photo} icon={<UserOutlined />} />}
                        title={
                          <Space>
                            <Text strong>{review.author_name}</Text>
                            <Rate disabled value={review.rating} style={{ fontSize: 12 }} />
                          </Space>
                        }
                        description={
                          <>
                            {review.text && <Paragraph style={{ marginBottom: 4 }}>{review.text}</Paragraph>}
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(review.created_at).format('DD.MM.YYYY')}
                            </Text>
                          </>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="Пока нет отзывов" />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}