import { useState } from 'react';
import { Button, Form, Input, Typography, Card, Radio, message } from 'antd';
import { sendOtp, verifyOtp } from '../../api/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

const { Title, Paragraph } = Typography;

type Step = 'form' | 'otp';

type RegisterFormValues = {
  full_name: string;
  phone: string;
  role: 'driver' | 'passenger';
};

type OtpFormValues = {
  code: string;
};

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);

  const [registerForm] = Form.useForm<RegisterFormValues>();
  const [otpForm] = Form.useForm<OtpFormValues>();

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'driver' | 'passenger'>('passenger');

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSendOtp = async (values: RegisterFormValues) => {
    try {
      setLoading(true);

      const normalizedPhone = values.phone.trim();
      setPhone(normalizedPhone);
      setFullName(values.full_name.trim());
      setRole(values.role);

      await sendOtp({ phone_number: normalizedPhone });

      setStep('otp');
      message.success('Код отправлен в Telegram. Введите его ниже.');
    } catch (error: any) {
      console.error(error);
      message.error(error?.response?.data?.detail || 'Не удалось отправить код.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (values: OtpFormValues) => {
    try {
      setLoading(true);

      const data = await verifyOtp({
        phone_number: phone,
        otp_code: values.code.trim(),
        full_name: fullName,
        role: role,
      });

      login(data);
      message.success('Регистрация и вход выполнены');
      navigate('/trips');
    } catch (error: any) {
      console.error(error);
      message.error(error?.response?.data?.detail || 'Неверный код или ошибка регистрации.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ maxWidth: 450, margin: '0 auto' }}>
      <Title level={3} style={{ textAlign: 'center' }}>
        Регистрация в SmartWay
      </Title>

      {step === 'form' && (
        <>
          <Paragraph>Укажите данные и подтвердите номер телефона через Telegram.</Paragraph>

          <Form form={registerForm} layout="vertical" onFinish={handleSendOtp} initialValues={{ role: 'passenger' }}>
            <Form.Item
              label="Кто вы?"
              name="role"
              rules={[{ required: true, message: 'Выберите роль' }]}
            >
              <Radio.Group>
                <Radio.Button value="passenger">Пассажир</Radio.Button>
                <Radio.Button value="driver">Водитель</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              label="Имя"
              name="full_name"
              rules={[{ required: true, message: 'Введите имя' }]}
            >
              <Input placeholder="Как к вам обращаться" disabled={loading} />
            </Form.Item>

            <Form.Item
              label="Номер телефона"
              name="phone"
              rules={[{ required: true, message: 'Введите номер телефона' }]}
            >
              <Input placeholder="+996..." disabled={loading} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Получить код
              </Button>
            </Form.Item>
          </Form>
        </>
      )}

      {step === 'otp' && (
        <>
          <Paragraph>
            Мы отправили код на номер <b>{phone}</b>. Введите код из Telegram для завершения регистрации.
          </Paragraph>

          <Form form={otpForm} layout="vertical" onFinish={handleVerifyOtp}>
            <Form.Item
              label="Код подтверждения"
              name="code"
              rules={[{ required: true, message: 'Введите код' }]}
            >
              <Input placeholder="1234" inputMode="numeric" disabled={loading} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Завершить регистрацию
              </Button>
            </Form.Item>
          </Form>
        </>
      )}
    </Card>
  );
}
