// src/components/CreateAnnouncementForm.tsx
import { useState, useEffect } from 'react';
import {
  Form, InputNumber, DatePicker, Switch, Input, Button,
  Space, message, Card, Typography, Select, Empty
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import LocationSelect from './LocationSelect';
import RideOptionsForm from './RideOptionsForm';
import { createAnnouncement } from '../api/announcements';
import { getMyCars, type Car } from '../api/auth';

const { TextArea } = Input;
const { Title } = Typography;
const { Option } = Select;

interface CreateAnnouncementFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onAddCar?: () => void;
}

export default function CreateAnnouncementForm({ 
  onSuccess, 
  onCancel,
  onAddCar 
}: CreateAnnouncementFormProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [fromLocationId, setFromLocationId] = useState<number | undefined>();

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    try {
      setLoadingCars(true);
      const data = await getMyCars();
      setCars(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCars(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const data = {
        from_location: values.from_location_display || `Location ${values.from_location}`,
        to_location: values.to_location_display || `Location ${values.to_location}`,
        from_location_obj: values.from_location,
        to_location_obj: values.to_location,
        departure_time: values.departure_time.toISOString(),
        available_seats: values.available_seats || 4,
        price_per_seat: values.price_per_seat,
        is_negotiable: values.is_negotiable || false,
        car: values.car || null,
        comment: values.comment || '',
        allow_smoking: values.allow_smoking || false,
        allow_pets: values.allow_pets || false,
        allow_big_luggage: values.allow_big_luggage ?? true,
        baggage_help: values.baggage_help || false,
        allow_children: values.allow_children ?? true,
        has_air_conditioning: values.has_air_conditioning ?? true,
        extra_rules: values.extra_rules || '',
        intermediate_stops: values.intermediate_stops || '',
      };
      
      await createAnnouncement(data);
      message.success(t('common.success'));
      form.resetFields();
      onSuccess?.();
    } catch (error: any) {
      console.error(error);
      message.error(error?.response?.data?.detail || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleFromLocationChange = (id: number, location?: any) => {
    setFromLocationId(id);
    if (location) {
      form.setFieldValue('from_location_display', location.name);
    }
  };

  const handleToLocationChange = (id: number, location?: any) => {
    if (location) {
      form.setFieldValue('to_location_display', location.name);
    }
  };

  // Запрет выбора прошедших дат
  const disabledDate = (current: dayjs.Dayjs) => {
    return current && current < dayjs().startOf('day');
  };

  return (
    <Card style={{ borderRadius: 12 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        {t('create.announcementTitle')}
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          available_seats: 4,
          is_negotiable: false,
          allow_smoking: false,
          allow_pets: false,
          allow_big_luggage: true,
          baggage_help: false,
          allow_children: true,
          has_air_conditioning: true,
        }}
      >
        {/* Скрытые поля для названий локаций */}
        <Form.Item name="from_location_display" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="to_location_display" hidden>
          <Input />
        </Form.Item>

        {/* Откуда */}
        <Form.Item
          name="from_location"
          label={t('create.fromLabel')}
          rules={[{ required: true, message: t('search.fromPlaceholder') }]}
        >
          <LocationSelect
            placeholder={t('search.fromPlaceholder')}
            onChange={handleFromLocationChange}
            size="large"
          />
        </Form.Item>

        {/* Куда */}
        <Form.Item
          name="to_location"
          label={t('create.toLabel')}
          rules={[{ required: true, message: t('search.toPlaceholder') }]}
        >
          <LocationSelect
            placeholder={t('search.toPlaceholder')}
            excludeId={fromLocationId}
            onChange={handleToLocationChange}
            size="large"
          />
        </Form.Item>

        {/* Дата и время */}
        <Form.Item
          name="departure_time"
          label={t('create.dateLabel')}
          rules={[{ required: true, message: t('create.dateLabel') }]}
        >
          <DatePicker
            showTime={{ format: 'HH:mm' }}
            format="DD.MM.YYYY HH:mm"
            style={{ width: '100%' }}
            size="large"
            disabledDate={disabledDate}
            placeholder={t('create.dateLabel')}
          />
        </Form.Item>

        {/* Автомобиль */}
        <Form.Item
          name="car"
          label={t('create.carLabel')}
        >
          <Select
            placeholder={t('create.selectCar')}
            size="large"
            loading={loadingCars}
            allowClear
            notFoundContent={
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('common.noData')}
              >
                <Button type="link" icon={<PlusOutlined />} onClick={onAddCar}>
                  {t('create.addCar')}
                </Button>
              </Empty>
            }
          >
            {cars.map(car => (
              <Option key={car.id} value={car.id}>
                {car.brand} {car.model} ({car.plate_number})
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Количество мест и цена */}
        <Space style={{ width: '100%', display: 'flex' }} align="start">
          <Form.Item
            name="available_seats"
            label={t('create.seatsLabel')}
            rules={[{ required: true }]}
            style={{ flex: 1 }}
          >
            <InputNumber
              min={1}
              max={50}
              style={{ width: '100%' }}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="price_per_seat"
            label={t('create.pricePerSeatLabel')}
            rules={[{ required: true, message: t('create.pricePerSeatLabel') }]}
            style={{ flex: 1 }}
          >
            <InputNumber
              min={0}
              max={100000}
              style={{ width: '100%' }}
              size="large"
              addonAfter="сом"
            />
          </Form.Item>
        </Space>

        <Form.Item
          name="is_negotiable"
          valuePropName="checked"
        >
          <Switch /> <span style={{ marginLeft: 8 }}>{t('create.negotiableLabel')}</span>
        </Form.Item>

        {/* Промежуточные остановки */}
        <Form.Item
          name="intermediate_stops"
          label="Промежуточные остановки"
        >
          <Input
            placeholder="Например: Токмок, Балыкчы"
          />
        </Form.Item>

        {/* Комментарий */}
        <Form.Item
          name="comment"
          label={t('create.commentLabel')}
        >
          <TextArea
            rows={3}
            placeholder={t('create.commentPlaceholder')}
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* Условия поездки */}
        <RideOptionsForm mode="announcement" />

        {/* Кнопки */}
        <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            {onCancel && (
              <Button onClick={onCancel}>
                {t('create.cancel')}
              </Button>
            )}
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              {t('create.submit')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}