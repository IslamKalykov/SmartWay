// src/pages/SearchPage.tsx
import { useState, useEffect } from 'react';
import {
  Typography, Empty, Spin, Modal, InputNumber, Form, Input, message, Alert
} from 'antd';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../auth/AuthContext';
import SearchFilter from '../components/SearchFilter';
import type { SearchFilters } from '../components/SearchFilter';
import TripCard from '../components/TripCard';
import AnnouncementCard from '../components/AnnouncementCard';

import {
  fetchAvailableAnnouncements,
  createBooking,
  type Announcement,
} from '../api/announcements';
import {
  fetchAvailableTrips,
  takeTrip,
  type Trip,
} from '../api/trips';
import { getMyCars, type Car } from '../api/auth';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function SearchPage() {
  const { t } = useTranslation();
  const { user, isAuth } = useAuth();
  const isDriver = user?.is_driver ?? false;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});

  // Модальные окна
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [bookingSeats, setBookingSeats] = useState(1);
  const [bookingMessage, setBookingMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    console.log('[SearchPage] isAuth:', isAuth, 'isDriver:', isDriver);
  
    if (!isAuth) {
      setLoading(false);
      setError('Требуется авторизация');
      return;
    }
  
    loadData();
  }, [isAuth, isDriver]);
  
  const loadData = async () => {
    setError(null);
    
    try {
      setLoading(true);
      
      console.log('[SearchPage] Loading data, isDriver:', isDriver);
      
      if (isDriver) {
        // Водитель видит заказы пассажиров
        const results = await Promise.allSettled([
          fetchAvailableTrips(),
          getMyCars(),
        ]);
        
        // Обрабатываем trips
        if (results[0].status === 'fulfilled') {
          setTrips(results[0].value || []);
        } else {
          console.error('Failed to load trips:', results[0].reason);
          const status = results[0].reason?.response?.status;
          if (status === 401) {
            localStorage.removeItem('access_token');
            setError('Сессия истекла, авторизуйтесь заново');
          } else if (status === 403) {
            setError('Для просмотра заказов нужно пройти верификацию водителя');
          }
        }
        
        // Обрабатываем cars
        if (results[1].status === 'fulfilled') {
          setCars(results[1].value || []);
        } else {
          console.error('Failed to load cars:', results[1].reason);
        }
        
      } else {
        // Пассажир видит объявления водителей
        try {
          const announcementsData = await fetchAvailableAnnouncements();
          setAnnouncements(announcementsData || []);
        } catch (err: any) {
          console.error('Failed to load announcements:', err);
      
          const status = err?.response?.status;
      
          if (status === 401) {
            // токен невалиден — можно почистить и попросить заново авторизоваться
            // localStorage.removeItem('access_token');
            setError('Сессия истекла, авторизуйтесь заново');
          } else if (status === 403) {
            setError('Нет доступа к объявлениям');
          } else {
            setError('Ошибка загрузки объявлений');
          }
        }
      }
      
    } catch (err: any) {
      console.error('Load data error:', err);
      setError(err?.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (newFilters: SearchFilters) => {
    setFilters(newFilters);
    loadData();
  };

  // === Действия для пассажира ===
  const handleBookAnnouncement = async () => {
    if (!selectedAnnouncement) return;

    try {
      setActionLoading(true);
      await createBooking({
        announcement: selectedAnnouncement.id,
        seats_count: bookingSeats,
        message: bookingMessage,
      });
      message.success(t('common.success'));
      setSelectedAnnouncement(null);
      setBookingSeats(1);
      setBookingMessage('');
      loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || t('errors.serverError'));
    } finally {
      setActionLoading(false);
    }
  };

  // === Действия для водителя ===
  const handleTakeTrip = async () => {
    if (!selectedTrip || cars.length === 0) return;

    try {
      setActionLoading(true);
      await takeTrip(selectedTrip.id, cars[0].id);
      message.success(t('common.success'));
      setSelectedTrip(null);
      loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || t('errors.serverError'));
    } finally {
      setActionLoading(false);
    }
  };

  // Фильтрация данных на клиенте
  const filteredAnnouncements = (announcements || []).filter(ann => {
    if (filters.allow_smoking && !ann.allow_smoking) return false;
    if (filters.allow_pets && !ann.allow_pets) return false;
    if (filters.allow_big_luggage && !ann.allow_big_luggage) return false;
    return true;
  });

  const filteredTrips = (trips || []).filter(trip => {
    if (filters.allow_smoking && !trip.allow_smoking) return false;
    if (filters.allow_pets && !trip.allow_pets) return false;
    if (filters.allow_big_luggage && !trip.allow_big_luggage) return false;
    return true;
  });

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

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        {isDriver ? t('search.titleDriver') : t('search.title')}
      </Title>

      {/* Ошибка */}
      {error && (
        <Alert
          message={error}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      {/* Фильтр поиска */}
      <SearchFilter
        onSearch={handleSearch}
        loading={loading}
        showRideOptions={true}
      />

      {/* Результаты поиска */}
      {isDriver ? (
        // Водитель видит заказы пассажиров
        filteredTrips.length > 0 ? (
          <div>
            {filteredTrips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => setSelectedTrip(trip)}
                onAction={() => setSelectedTrip(trip)}
                actionLabel={t('trip.take')}
                showPassengerInfo={true}
              />
            ))}
          </div>
        ) : (
          <Empty
            description={
              <span>
                {t('search.noResults')}
                <br />
                <Text type="secondary">{t('search.noResultsHint')}</Text>
              </span>
            }
          />
        )
      ) : (
        // Пассажир видит объявления водителей
        filteredAnnouncements.length > 0 ? (
          <div>
            {filteredAnnouncements.map(ann => (
              <AnnouncementCard
                key={ann.id}
                announcement={ann}
                onClick={() => setSelectedAnnouncement(ann)}
                onBook={() => setSelectedAnnouncement(ann)}
                showDriverInfo={true}
              />
            ))}
          </div>
        ) : (
          <Empty
            description={
              <span>
                {t('search.noResults')}
                <br />
                <Text type="secondary">{t('search.noResultsHint')}</Text>
              </span>
            }
          />
        )
      )}

      {/* Модалка бронирования (для пассажира) */}
      <Modal
        title={t('booking.title')}
        open={!!selectedAnnouncement}
        onCancel={() => setSelectedAnnouncement(null)}
        onOk={handleBookAnnouncement}
        okText={t('booking.confirm')}
        cancelText={t('common.cancel')}
        confirmLoading={actionLoading}
      >
        {selectedAnnouncement && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>
                {selectedAnnouncement.from_location_display || selectedAnnouncement.from_location}
                {' → '}
                {selectedAnnouncement.to_location_display || selectedAnnouncement.to_location}
              </Text>
              <br />
              <Text type="secondary">
                {selectedAnnouncement.price_per_seat} сом / {t('trip.seat')}
              </Text>
            </div>

            <Form layout="vertical">
              <Form.Item label={t('booking.seatsCount')}>
                <InputNumber
                  min={1}
                  max={selectedAnnouncement.free_seats || 1}
                  value={bookingSeats}
                  onChange={(v) => setBookingSeats(v || 1)}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item label={t('booking.message')}>
                <TextArea
                  value={bookingMessage}
                  onChange={(e) => setBookingMessage(e.target.value)}
                  placeholder={t('booking.messagePlaceholder')}
                  rows={3}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* Модалка взятия заказа (для водителя) */}
      <Modal
        title={t('trip.take')}
        open={!!selectedTrip}
        onCancel={() => setSelectedTrip(null)}
        onOk={handleTakeTrip}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        confirmLoading={actionLoading}
        okButtonProps={{ disabled: cars.length === 0 }}
      >
        {selectedTrip && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>
                {selectedTrip.from_location_display || selectedTrip.from_location}
                {' → '}
                {selectedTrip.to_location_display || selectedTrip.to_location}
              </Text>
              <br />
              <Text>
                {selectedTrip.passengers_count} {t('trip.seats')}
                {selectedTrip.price && ` • ${selectedTrip.price} сом`}
              </Text>
            </div>

            {cars.length === 0 ? (
              <div style={{ color: '#ff4d4f' }}>
                {t('create.addCar')} — {t('profile.myCars')}
              </div>
            ) : (
              <div>
                <Text type="secondary">{t('create.carLabel')}:</Text>
                <br />
                <Text strong>
                  {cars[0].brand} {cars[0].model} ({cars[0].plate_number})
                </Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}