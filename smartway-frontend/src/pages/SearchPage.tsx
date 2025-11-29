// src/pages/SearchPage.tsx
import { useState, useEffect } from 'react';
import {
  Card, Typography, Input, Button, List, Tag, Space, Empty, Spin,
  Avatar, Modal, InputNumber, Form, message, Rate, Divider
} from 'antd';
import {
  SearchOutlined, CarOutlined, UserOutlined, ClockCircleOutlined,
  EnvironmentOutlined, StarOutlined, CheckCircleOutlined, PhoneOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { 
  fetchAvailableAnnouncements, createBooking,
  type Announcement 
} from '../api/announcements';
import { 
    fetchAvailableTrips, 
    fetchMyActiveTrips,
    fetchMyCompletedTrips,
    takeTrip, 
    type Trip 
  } from '../api/trips';
  
import { getMyCars, type Car } from '../api/auth';



const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function SearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDriver = user?.is_driver;
  
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [cars, setCars] = useState<Car[]>([]);

  const [myActiveTrips, setMyActiveTrips] = useState<Trip[]>([]);
  const [myCompletedTrips, setMyCompletedTrips] = useState<Trip[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'my'>('search');

  
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [bookingSeats, setBookingSeats] = useState(1);
  const [bookingMessage, setBookingMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [isDriver]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (isDriver) {
        // Водитель видит заказы пассажиров
        const [tripsData, carsData, myActive, myCompleted] = await Promise.all([
            fetchAvailableTrips({ from: searchFrom, to: searchTo }),
            getMyCars(),
            fetchMyActiveTrips(),
            fetchMyCompletedTrips(),
          ]);
        setTrips(tripsData);
        setCars(carsData);
        setMyActiveTrips(myActive);
        setMyCompletedTrips(myCompleted);
      } else {
        // Пассажир видит объявления водителей
        const annData = await fetchAvailableAnnouncements({ from: searchFrom, to: searchTo });
        setAnnouncements(annData);
      }
    } catch (error) {
      console.error(error);
      message.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadData();
  };

  const handleBook = async () => {
    if (!selectedAnnouncement) return;
    
    try {
      await createBooking({
        announcement: selectedAnnouncement.id,
        seats_count: bookingSeats,
        message: bookingMessage,
      });
      message.success('Заявка отправлена водителю!');
      setSelectedAnnouncement(null);
      setBookingSeats(1);
      setBookingMessage('');
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || 'Ошибка бронирования');
    }
  };

  const handleTakeTrip = async () => {
    if (!selectedTrip) return;
    
    try {
      const carId = cars.length > 0 ? cars[0].id : undefined;
      await takeTrip(selectedTrip.id, carId);
      message.success('Заказ взят!');
      setSelectedTrip(null);
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.detail || 'Ошибка');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        {isDriver ? '📋 Заказы пассажиров' : '🚗 Поездки водителей'}
      </Title>

      {/* Search */}
      <Card size="small" style={{ marginBottom: 24 }}>
        <Space wrap style={{ width: '100%' }}>
          <Input
            placeholder="Откуда"
            prefix={<EnvironmentOutlined />}
            value={searchFrom}
            onChange={(e) => setSearchFrom(e.target.value)}
            style={{ width: 200 }}
          />
          <Input
            placeholder="Куда"
            prefix={<EnvironmentOutlined />}
            value={searchTo}
            onChange={(e) => setSearchTo(e.target.value)}
            style={{ width: 200 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            Найти
          </Button>
        </Space>
      </Card>

      {isDriver ? (
        // ===== ВОДИТЕЛЬ ВИДИТ ЗАКАЗЫ ПАССАЖИРОВ =====
        trips.length > 0 ? (
          <List
            dataSource={trips}
            renderItem={(trip) => (
              <Card 
                size="small" 
                style={{ marginBottom: 12, cursor: 'pointer' }}
                hoverable
                onClick={() => setSelectedTrip(trip)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Space align="start">
                      <Avatar src={trip.passenger_photo} icon={<UserOutlined />} />
                      <div>
                        <Space>
                          <Text strong>{trip.passenger_name}</Text>
                          {trip.passenger_verified && (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          )}
                        </Space>
                        <div>
                          <Text strong style={{ fontSize: 16 }}>
                            {trip.from_location} → {trip.to_location}
                          </Text>
                        </div>
                        <Space style={{ marginTop: 4 }}>
                          <Text type="secondary">
                            <ClockCircleOutlined /> {dayjs(trip.departure_time).format('DD.MM HH:mm')}
                          </Text>
                          <Text type="secondary">
                            <UserOutlined /> {trip.passengers_count} чел.
                          </Text>
                        </Space>
                      </div>
                    </Space>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>
                      <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                        {trip.price || 'Договорная'} {trip.price && 'сом'}
                      </Text>
                    </div>
                    {trip.is_negotiable && <Tag>Торг</Tag>}
                  </div>
                </div>
              </Card>
            )}
          />
        ) : (
          <Empty description="Нет доступных заказов" />
        )
      ) : (
        // ===== ПАССАЖИР ВИДИТ ОБЪЯВЛЕНИЯ ВОДИТЕЛЕЙ =====
        announcements.length > 0 ? (
          <List
            dataSource={announcements}
            renderItem={(ann) => (
              <Card 
                size="small" 
                style={{ marginBottom: 12, cursor: 'pointer' }}
                hoverable
                onClick={() => setSelectedAnnouncement(ann)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Space align="start">
                      <Avatar src={ann.driver_photo} icon={<UserOutlined />} size={48} />
                      <div>
                        <Space>
                          <Text strong>{ann.driver_name}</Text>
                          {ann.driver_verified && (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          )}
                          {ann.driver_rating && (
                            <span>
                              <StarOutlined style={{ color: '#faad14' }} /> {ann.driver_rating.toFixed(1)}
                            </span>
                          )}
                        </Space>
                        <div>
                          <Text strong style={{ fontSize: 16 }}>
                            {ann.from_location} → {ann.to_location}
                          </Text>
                        </div>
                        <Space style={{ marginTop: 4 }}>
                          <Text type="secondary">
                            <ClockCircleOutlined /> {dayjs(ann.departure_time).format('DD.MM HH:mm')}
                          </Text>
                          <Text>
                            <CarOutlined /> {ann.free_seats} мест
                          </Text>
                          {ann.car_info && (
                            <Text type="secondary">{ann.car_info.full_name || `${ann.car_info.brand} ${ann.car_info.model}`}</Text>
                          )}
                        </Space>
                      </div>
                    </Space>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>
                      <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                        {ann.price_per_seat} сом
                      </Text>
                      <Text type="secondary"> /место</Text>
                    </div>
                    {ann.is_negotiable && <Tag>Торг</Tag>}
                  </div>
                </div>
              </Card>
            )}
          />
        ) : (
          <Empty description="Нет доступных поездок" />
        )
      )}

      {/* Booking Modal (для пассажира) */}
      <Modal
        title="Забронировать место"
        open={!!selectedAnnouncement}
        onCancel={() => setSelectedAnnouncement(null)}
        onOk={handleBook}
        okText="Отправить заявку"
      >
        {selectedAnnouncement && (
          <div>
            <Paragraph>
              <Text strong>{selectedAnnouncement.from_location}</Text> → <Text strong>{selectedAnnouncement.to_location}</Text>
            </Paragraph>
            <Paragraph>
              <ClockCircleOutlined /> {dayjs(selectedAnnouncement.departure_time).format('DD.MM.YYYY HH:mm')}
            </Paragraph>
            <Paragraph>
              Водитель: <Text strong>{selectedAnnouncement.driver_name}</Text>
            </Paragraph>
            <Paragraph>
              Цена: <Text strong>{selectedAnnouncement.price_per_seat} сом</Text> за место
            </Paragraph>
            <Divider />
            <Form layout="vertical">
              <Form.Item label="Количество мест">
                <InputNumber
                  min={1}
                  max={selectedAnnouncement.free_seats}
                  value={bookingSeats}
                  onChange={(v) => setBookingSeats(v || 1)}
                />
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  Доступно: {selectedAnnouncement.free_seats}
                </Text>
              </Form.Item>
              <Form.Item label="Сообщение водителю">
                <TextArea
                  rows={2}
                  value={bookingMessage}
                  onChange={(e) => setBookingMessage(e.target.value)}
                  placeholder="Откуда вас забрать, особые пожелания..."
                />
              </Form.Item>
            </Form>
            <Paragraph>
              <Text strong>Итого: {Number(selectedAnnouncement.price_per_seat) * bookingSeats} сом</Text>
            </Paragraph>
          </div>
        )}
      </Modal>

      {/* Take Trip Modal (для водителя) */}
      <Modal
        title="Взять заказ"
        open={!!selectedTrip}
        onCancel={() => setSelectedTrip(null)}
        onOk={handleTakeTrip}
        okText="Взять заказ"
      >
        {selectedTrip && (
          <div>
            <Paragraph>
              <Text strong>{selectedTrip.from_location}</Text> → <Text strong>{selectedTrip.to_location}</Text>
            </Paragraph>
            <Paragraph>
              <ClockCircleOutlined /> {dayjs(selectedTrip.departure_time).format('DD.MM.YYYY HH:mm')}
            </Paragraph>
            <Paragraph>
              Пассажир: <Text strong>{selectedTrip.passenger_name}</Text>
            </Paragraph>
            <Paragraph>
              Пассажиров: <Text strong>{selectedTrip.passengers_count}</Text>
            </Paragraph>
            <Paragraph>
              Цена: <Text strong>{selectedTrip.price || 'Договорная'} {selectedTrip.price && 'сом'}</Text>
              {selectedTrip.is_negotiable && <Tag style={{ marginLeft: 8 }}>Торг</Tag>}
            </Paragraph>
            {selectedTrip.comment && (
              <Paragraph>
                Комментарий: <Text type="secondary">{selectedTrip.comment}</Text>
              </Paragraph>
            )}
            {cars.length > 0 && (
              <Paragraph type="secondary">
                Будет использован: {cars[0].brand} {cars[0].model}
              </Paragraph>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}