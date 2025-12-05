// src/pages/SearchPage.tsx
import { useState, useEffect } from 'react';
import {
  Typography, Empty, Spin, Modal, InputNumber, Form, Input, message, Alert, Tabs
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
  fetchMyDriverTrips,
  type Trip,
} from '../api/trips';
import { getMyCars, type Car } from '../api/auth';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function SearchPage() {
  const { t, i18n } = useTranslation();
  const { user, isAuth } = useAuth();
  const isDriver = user?.is_driver ?? false;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);  // Взятые водителем поездки
  const [cars, setCars] = useState<Car[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [activeTab, setActiveTab] = useState('available');

  // Модальные окна
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [bookingSeats, setBookingSeats] = useState(1);
  const [bookingMessage, setBookingMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isAuth) {
      setLoading(false);
      setError('Требуется авторизация');
      return;
    }
    loadData();
  }, [isAuth, isDriver, i18n.language]);
  
  const loadData = async (searchFilters?: SearchFilters) => {
    setError(null);
    const currentFilters = searchFilters || filters;
    
    try {
      setLoading(true);
      
      // ---- when not driver (announcements)
if (!isDriver) {
  const announcementsData = await fetchAvailableAnnouncements(currentFilters);
  setAnnouncements(announcementsData || []);

  // Обновляем выбранную запись (если открыта модалка), чтобы показать локализованные поля
  setSelectedAnnouncement(prev => {
    if (!prev) return null;
    return (announcementsData || []).find(a => a.id === prev.id) || null;
  });
}

  // ---- when driver (trips)
  if (isDriver) {
    const results = await Promise.allSettled([
      fetchAvailableTrips(currentFilters),
      getMyCars(),
      fetchMyDriverTrips(),
    ]);

    if (results[0].status === 'fulfilled') {
      const newTrips = results[0].value || [];
      setTrips(newTrips);

      // Обновляем selectedTrip, если он открыт в модалке
      setSelectedTrip(prev => {
        if (!prev) return null;
        return newTrips.find(t => t.id === prev.id) || null;
      });
    }

    if (results[1].status === 'fulfilled') {
      setCars(results[1].value || []);
    }
    if (results[2].status === 'fulfilled') {
      const newMyTrips = results[2].value || [];
      setMyTrips(newMyTrips);

      // Обновляем selectedTrip для вкладки "my", если нужно
      setSelectedTrip(prev => {
        if (!prev) return null;
        return newMyTrips.find(t => t.id === prev.id) || prev;
      });
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
    loadData(newFilters);
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
    if (!selectedTrip || !cars || cars.length === 0) return;
  
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

  // Фильтрация на клиенте — каждое поле работает независимо (OR логика для опций)
  const filterData = <T extends { 
    from_location?: number | string;
    to_location?: number | string;
    from_location_display?: string;
    to_location_display?: string;
    departure_time?: string;
    allow_smoking?: boolean;
    allow_pets?: boolean;
    allow_big_luggage?: boolean;
  }>(items: T[]): T[] => {
    return items.filter(item => {
      // Фильтр по локации "Откуда"
      if (filters.from_location) {
        const itemFromId = typeof item.from_location === 'number' 
          ? item.from_location 
          : parseInt(item.from_location as string);
        if (itemFromId !== filters.from_location) return false;
      }
      
      // Фильтр по локации "Куда"
      if (filters.to_location) {
        const itemToId = typeof item.to_location === 'number' 
          ? item.to_location 
          : parseInt(item.to_location as string);
        if (itemToId !== filters.to_location) return false;
      }
      
      // Фильтр по дате
      if (filters.date && item.departure_time) {
        const itemDate = new Date(item.departure_time).toISOString().split('T')[0];
        if (itemDate !== filters.date) return false;
      }
      
      // Фильтры по условиям — показываем если опция включена И в фильтре выбрана
      if (filters.allow_smoking && !item.allow_smoking) return false;
      if (filters.allow_pets && !item.allow_pets) return false;
      if (filters.allow_big_luggage && !item.allow_big_luggage) return false;
      
      return true;
    });
  };

  const filteredAnnouncements = filterData(announcements);
  const filteredTrips = filterData(trips);
  
  // Фильтруем взятые поездки (активные)
  const activeMyTrips = myTrips.filter(t => ['taken', 'in_progress'].includes(t.status));

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

  // Табы для водителя
  const driverTabs = [
    {
      key: 'available',
      label: `${t('search.available')} (${filteredTrips.length})`,
      children: (
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
                showContactButtons={true}
              />
            ))}
          </div>
        ) : (
          <Empty description={t('search.noResults')} />
        )
      ),
    },
    {
      key: 'my',
      label: `${t('search.myTrips')} (${activeMyTrips.length})`,
      children: (
        activeMyTrips.length > 0 ? (
          <div>
            {activeMyTrips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                showPassengerInfo={true}
                showContactButtons={true}
              />
            ))}
          </div>
        ) : (
          <Empty description={t('search.noMyTrips')} />
        )
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        {isDriver ? t('search.titleDriver') : t('search.title')}
      </Title>

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

      <SearchFilter
        onSearch={handleSearch}
        loading={loading}
        showRideOptions={true}
      />

      {isDriver ? (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={driverTabs}
        />
      ) : (
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

      {/* Модалка бронирования */}
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

      {/* Модалка взятия заказа */}
      <Modal
        title={t('trip.take')}
        open={!!selectedTrip}
        onCancel={() => setSelectedTrip(null)}
        onOk={handleTakeTrip}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
        confirmLoading={actionLoading}
        okButtonProps={{ disabled: !cars || cars.length === 0 }}
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

            {!cars || cars.length === 0 ? (
              <div style={{ color: '#ff4d4f' }}>
                {t('create.addCar')} — {t('profile.myCars')}
              </div>
            ) : (
              <div>
                <Text type="secondary">{t('create.carLabel')}:</Text>
                <br />
                <Text strong>
                  {cars[0]?.brand} {cars[0]?.model} ({cars[0]?.plate_number})
                </Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}