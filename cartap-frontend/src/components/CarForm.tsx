// src/components/CarForm.tsx
import { useState } from 'react';
import {
  Form, Input, InputNumber, Select, Switch, Button,
  Upload, Space, message, Row, Col
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

import { createCar, updateCar } from '../api/auth';
import type { Car } from '../api/auth';

const { Option } = Select;

interface CarFormProps {
  car?: Car | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const carTypes = [
  { value: 'sedan', label: 'Седан' },
  { value: 'suv', label: 'Внедорожник' },
  { value: 'minivan', label: 'Минивэн' },
  { value: 'hatchback', label: 'Хэтчбек' },
  { value: 'wagon', label: 'Универсал' },
  { value: 'other', label: 'Другое' },
];

const popularBrands = [
  'Toyota', 'Honda', 'Hyundai', 'Kia', 'Nissan', 'Mazda',
  'Volkswagen', 'Mercedes-Benz', 'BMW', 'Audi', 'Lexus',
  'Chevrolet', 'Ford', 'Subaru', 'Mitsubishi', 'Daewoo', 'Lada'
];

export default function CarForm({ car, onSuccess, onCancel }: CarFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const data: any = {
        brand: values.brand,
        model: values.model,
        year: values.year,
        color: values.color,
        car_type: values.car_type,
        plate_number: values.plate_number,
        passenger_seats: values.passenger_seats,
        has_air_conditioning: values.has_air_conditioning ?? true,
        has_wifi: values.has_wifi ?? false,
        has_child_seat: values.has_child_seat ?? false,
        allows_smoking: values.allows_smoking ?? false,
        allows_pets: values.allows_pets ?? false,
        has_luggage_space: values.has_luggage_space ?? true,
      };
      
      if (car) {
        await updateCar(car.id, data);
        message.success('Автомобиль обновлён');
      } else {
        await createCar(data);
        message.success('Автомобиль добавлен');
      }
      
      onSuccess();
    } catch (error: any) {
      console.error(error);
      message.error(error?.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={car ? {
        brand: car.brand,
        model: car.model,
        year: car.year,
        color: car.color,
        car_type: car.car_type,
        plate_number: car.plate_number,
        passenger_seats: car.passenger_seats,
        has_air_conditioning: car.has_air_conditioning,
        has_wifi: car.has_wifi,
        has_child_seat: car.has_child_seat,
        allows_smoking: car.allows_smoking,
        allows_pets: car.allows_pets,
        has_luggage_space: car.has_luggage_space,
      } : {
        car_type: 'sedan',
        passenger_seats: 4,
        has_air_conditioning: true,
        has_luggage_space: true,
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="brand"
            label="Марка"
            rules={[{ required: true, message: 'Выберите марку' }]}
          >
            <Select
              showSearch
              placeholder="Выберите марку"
              optionFilterProp="children"
              allowClear
            >
              {popularBrands.map(brand => (
                <Option key={brand} value={brand}>{brand}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        
        <Col span={12}>
          <Form.Item
            name="model"
            label="Модель"
            rules={[{ required: true, message: 'Введите модель' }]}
          >
            <Input placeholder="Например: Camry" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="year" label="Год выпуска">
            <InputNumber
              min={1950}
              max={new Date().getFullYear() + 1}
              style={{ width: '100%' }}
              placeholder="2020"
            />
          </Form.Item>
        </Col>
        
        <Col span={8}>
          <Form.Item name="color" label="Цвет">
            <Input placeholder="Белый" />
          </Form.Item>
        </Col>
        
        <Col span={8}>
          <Form.Item
            name="car_type"
            label="Тип кузова"
            rules={[{ required: true }]}
          >
            <Select>
              {carTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="plate_number"
            label="Госномер"
            rules={[{ required: true, message: 'Введите госномер' }]}
          >
            <Input placeholder="01 KG 123 ABC" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
        </Col>
        
        <Col span={12}>
          <Form.Item
            name="passenger_seats"
            label="Пассажирских мест"
            rules={[{ required: true, message: 'Укажите количество мест' }]}
          >
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <strong>Удобства:</strong>
      </div>
      
      <Row gutter={[16, 8]}>
        <Col span={12}>
          <Form.Item name="has_air_conditioning" valuePropName="checked">
            <Switch /> Кондиционер
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="has_wifi" valuePropName="checked">
            <Switch /> Wi-Fi
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="has_child_seat" valuePropName="checked">
            <Switch /> Детское кресло
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="has_luggage_space" valuePropName="checked">
            <Switch /> Место для багажа
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="allows_smoking" valuePropName="checked">
            <Switch /> Можно курить
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="allows_pets" valuePropName="checked">
            <Switch /> Можно с животными
          </Form.Item>
        </Col>
      </Row>

      <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {car ? 'Сохранить' : 'Добавить'}
          </Button>
          <Button onClick={onCancel}>Отмена</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}