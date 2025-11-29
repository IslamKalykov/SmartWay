// src/components/CreateTripForm.tsx
import { useState } from 'react';
import {
  Form, InputNumber, DatePicker, Switch, Input, Button,
  Space, message, Card, Typography
} from 'antd';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import LocationSelect from './LocationSelect';
import RideOptionsForm from './RideOptionsForm';
import { createTrip } from '../api/trips';

const { TextArea } = Input;
const { Title } = Typography;

interface CreateTripFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateTripForm({ onSuccess, onCancel }: CreateTripFormProps) {
  const { t, i18n } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fromLocationId, setFromLocationId] = useState<number | undefined>();

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const data = {
        from_location: values.from_location_display || `Location ${values.from_location}`,
        to_location: values.to_location_display || `Location ${values.to_location}`,
        from_location_obj: values.from_location,
        to_location_obj: values.to_location,
        departure_time: values.departure_time.toISOString(),
        passengers_count: values.passengers_count || 1,
        price: values.price || null,
        is_negotiable: values.is_negotiable || false,
        comment: values.comment || '',
        allow_smoking: values.allow_smoking || false,
        allow_pets: values.allow_pets || false,
        allow_big_luggage: values.allow_big_luggage || false,
        baggage_help: values.baggage_help || false,
        with_child: values.with_child || false,
        extra_rules: values.extra_rules || '',
      };
      
      await createTrip(data);
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
        {t('create.tripTitle')}
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          passengers_count: 1,
          is_negotiable: false,
          allow_smoking: false,
          allow_pets: false,
          allow_big_luggage: false,
          baggage_help: false,
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

        {/* Количество пассажиров */}
        <Form.Item
          name="passengers_count"
          label={t('create.passengersLabel')}
          rules={[{ required: true }]}
        >
          <InputNumber
            min={1}
            max={50}
            style={{ width: '100%' }}
            size="large"
          />
        </Form.Item>

        {/* Цена */}
        <Space style={{ width: '100%' }} align="start">
          <Form.Item
            name="price"
            label={t('create.priceLabel')}
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

          <Form.Item
            name="is_negotiable"
            label={t('create.negotiableLabel')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Space>

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
        <RideOptionsForm mode="trip" />

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