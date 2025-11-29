// src/pages/MyAdsPage.tsx
import { useState, useEffect } from 'react';
import {
  Card, Typography, Button, Tabs, List, Tag, Space, Empty, Spin,
  Modal, Form, Input, InputNumber, DatePicker, Select, Switch, message, Badge
} from 'antd';
import {
  PlusOutlined, CarOutlined, UserOutlined, ClockCircleOutlined,
  EnvironmentOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { 
  fetchMyAnnouncements, createAnnouncement, cancelAnnouncement, completeAnnouncement,
  fetchIncomingBookings, confirmBooking, rejectBooking,
  type Announcement, type Booking
} from '../api/announcements';
import { fetchMyTrips, createTrip, cancelTrip, type Trip } from '../api/trips';
import { getMyCars, type Car } from '../api/auth';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function MyAdsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDriver = user?.is_driver;
  
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [isDriver]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (isDriver) {
        const [annData, bookingsData, carsData] = await Promise.all([
          fetchMyAnnouncements(),
          fetchIncomingBookings(),
          getMyCars(),
        ]);
        setAnnouncements(annData);
        setBookings(bookingsData);
        setCars(carsData);
      } else {
        const tripsData = await fetchMyTrips();
        setTrips(tripsData);
      }
    } catch (error) {
      console.error(error);
      message.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const data = {
        ...values,
        departure_time: values.departure_time.toISOString(),
      };
      
      if (isDriver) {
        await createAnnouncement(data);
        message.success('Объявление создано!');
      } else {
        await createTrip(data);
        message.success('Заказ создан!');
      }
      
      setShowCreateModal(false);
      form.resetFields();
      loadData();
    } catch (error: any) {
      console.error(error);
      message.error(error?.response?.data?.detail || 'Ошибка создания');
    }
  };

  const handleCancelAnnouncement = async (id: number) => {
    try {
      await cancelAnnouncement(id);
      message.success('Объявление отменено');
      loadData();
    } catch (error) {
      message.error('Ошибка отмены');
    }
  };

  const handleCompleteAnnouncement = async (id: number) => {
    try {
      await completeAnnouncement(id);
      message.success('Объявление завершено');
      loadData();
    } catch (error) {
      message.error('Ошибка');
    }
  };

  const handleCancelTrip = async (id: number) => {
    try {
      await cancelTrip(id);
      message.success('Заказ отменён');
      loadData();
    } catch (error) {
      message.error('Ошибка отмены');
    }
  };

  const handleConfirmBooking = async (id: number) => {
    try {
      await confirmBooking(id);
      message.success('Бронирование подтверждено');
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || 'Ошибка');
    }
  };

  const handleRejectBooking = async (id: number) => {
    try {
      await rejectBooking(id);
      message.success('Бронирование отклонено');
      loadData();
    } catch (error) {
      message.error('Ошибка');
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: 'green', text: 'Активно' },
      open: { color: 'green', text: 'Открыт' },
      full: { color: 'orange', text: 'Мест нет' },
      taken: { color: 'blue', text: 'Взят' },
      in_progress: { color: 'processing', text: 'В пути' },
      completed: { color: 'default', text: 'Завершено' },
      cancelled: { color: 'red', text: 'Отменено' },
      pending: { color: 'orange', text: 'Ожидает' },
      confirmed: { color: 'green', text: 'Подтверждено' },
      rejected: { color: 'red', text: 'Отклонено' },
    };
    const s = statusMap[status] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
  }

  const pendingBookings = bookings.filter(b => b.status === 'pending');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          {isDriver ? '🚗 Мои объявления' : '📋 Мои заказы'}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
          {isDriver ? 'Новое объявление' : 'Новый заказ'}
        </Button>
      </div>

      {isDriver ? (
        // ===== ВОДИТЕЛЬ =====
        <Tabs
          defaultActiveKey="announcements"
          items={[
            {
              key: 'announcements',
              label: `Объявления (${announcements.length})`,
              children: announcements.length > 0 ? (
                <List
                  dataSource={announcements}
                  renderItem={(ann) => (
                    <Card size="small" style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <Space>
                            {getStatusTag(ann.status)}
                            <Text strong>{ann.from_location} → {ann.to_location}</Text>
                          </Space>
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary">
                              <ClockCircleOutlined /> {dayjs(ann.departure_time).format('DD.MM.YYYY HH:mm')}
                            </Text>
                            <Text style={{ marginLeft: 16 }}>
                              {ann.price_per_seat} сом/место • {ann.free_seats}/{ann.available_seats} мест
                            </Text>
                          </div>
                        </div>
                        <Space>
                          {ann.status === 'active' && (
                            <>
                              <Button size="small" type="primary" onClick={() => handleCompleteAnnouncement(ann.id)}>
                                Завершить
                              </Button>
                              <Button size="small" danger onClick={() => handleCancelAnnouncement(ann.id)}>
                                Отменить
                              </Button>
                            </>
                          )}
                        </Space>
                      </div>
                    </Card>
                  )}
                />
              ) : (
                <Empty description="Нет объявлений" />
              ),
            },
            {
              key: 'bookings',
              label: (
                <Badge count={pendingBookings.length} offset={[10, 0]}>
                  Заявки
                </Badge>
              ),
              children: bookings.length > 0 ? (
                <List
                  dataSource={bookings}
                  renderItem={(booking) => (
                    <Card size="small" style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <Space>
                            {getStatusTag(booking.status)}
                            <Text strong>{booking.passenger_name}</Text>
                            <Text type="secondary">• {booking.seats_count} мест</Text>
                          </Space>
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              {booking.announcement_info?.from_location} → {booking.announcement_info?.to_location}
                            </Text>
                          </div>
                          {booking.message && (
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary">"{booking.message}"</Text>
                            </div>
                          )}
                        </div>
                        <Space>
                          {booking.status === 'pending' && (
                            <>
                              <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleConfirmBooking(booking.id)}>
                                Принять
                              </Button>
                              <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleRejectBooking(booking.id)}>
                                Отклонить
                              </Button>
                            </>
                          )}
                        </Space>
                      </div>
                    </Card>
                  )}
                />
              ) : (
                <Empty description="Нет заявок" />
              ),
            },
          ]}
        />
      ) : (
        // ===== ПАССАЖИР =====
        trips.length > 0 ? (
          <List
            dataSource={trips}
            renderItem={(trip) => (
              <Card size="small" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <Space>
                      {getStatusTag(trip.status)}
                      <Text strong>{trip.from_location} → {trip.to_location}</Text>
                    </Space>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        <ClockCircleOutlined /> {dayjs(trip.departure_time).format('DD.MM.YYYY HH:mm')}
                      </Text>
                      <Text style={{ marginLeft: 16 }}>
                        {trip.passengers_count} пассажир(ов) • {trip.price || 'Договорная'} сом
                      </Text>
                    </div>
                    {trip.driver_name && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary">Водитель: {trip.driver_name}</Text>
                      </div>
                    )}
                  </div>
                  <Space>
                    {trip.status === 'open' && (
                      <Button size="small" danger onClick={() => handleCancelTrip(trip.id)}>
                        Отменить
                      </Button>
                    )}
                  </Space>
                </div>
              </Card>
            )}
          />
        ) : (
          <Empty description="Нет заказов. Создайте первый!" />
        )
      )}

      {/* Create Modal */}
      <Modal
        title={isDriver ? '🚗 Новое объявление' : '📋 Новый заказ'}
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="from_location" label="Откуда" rules={[{ required: true, message: 'Укажите откуда' }]}>
            <Input placeholder="Бишкек" />
          </Form.Item>
          
          <Form.Item name="to_location" label="Куда" rules={[{ required: true, message: 'Укажите куда' }]}>
            <Input placeholder="Ош" />
          </Form.Item>
          
          <Form.Item name="departure_time" label="Дата и время" rules={[{ required: true, message: 'Укажите время' }]}>
            <DatePicker 
              showTime 
              format="DD.MM.YYYY HH:mm" 
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          {isDriver ? (
            // Поля для водителя
            <>
              <Form.Item name="available_seats" label="Свободных мест" rules={[{ required: true }]} initialValue={4}>
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
              
              <Form.Item name="price_per_seat" label="Цена за место (сом)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} placeholder="500" />
              </Form.Item>
              
              {cars.length > 0 && (
                <Form.Item name="car" label="Автомобиль">
                  <Select placeholder="Выберите авто" allowClear>
                    {cars.map(car => (
                      <Select.Option key={car.id} value={car.id}>
                        {car.brand} {car.model} ({car.plate_number})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </>
          ) : (
            // Поля для пассажира
            <>
              <Form.Item name="passengers_count" label="Количество пассажиров" rules={[{ required: true }]} initialValue={1}>
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
              
              <Form.Item name="price" label="Желаемая цена (сом)">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="Оставьте пустым если договорная" />
              </Form.Item>
              
              <Form.Item name="is_negotiable" valuePropName="checked" initialValue={true}>
                <Switch /> Цена договорная
              </Form.Item>
            </>
          )}
          
          <Form.Item name="comment" label="Комментарий">
            <TextArea rows={2} placeholder="Дополнительная информация..." />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                Создать
              </Button>
              <Button onClick={() => setShowCreateModal(false)}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}