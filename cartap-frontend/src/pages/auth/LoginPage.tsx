// src/pages/auth/LoginPage.tsx
import { useState } from 'react';
import { Button, Form, Input, Typography, Card, message, Space } from 'antd';
import { PhoneOutlined, SafetyOutlined } from '@ant-design/icons';
import { sendOtp, verifyOtp } from '../../api/auth';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Title, Paragraph, Text } = Typography;

type Step = 'phone' | 'otp';

type PhoneFormValues = {
  phone: string;
};

type OtpFormValues = {
  code: string;
};

export default function LoginPage() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [phoneForm] = Form.useForm<PhoneFormValues>();
  const [otpForm] = Form.useForm<OtpFormValues>();

  const navigate = useNavigate();
  const { login } = useAuth();
  const isMobile = useIsMobile(768);

  const handleSendOtp = async (values: PhoneFormValues) => {
    try {
      setLoading(true);

      const normalizedPhone = values.phone.trim();

      await sendOtp({ phone_number: normalizedPhone });

      setPhone(normalizedPhone);
      setStep('otp');
      message.success('Код отправлен в Telegram');
    } catch (error: any) {
      console.error(error);
      message.error(error?.response?.data?.detail || 'Не удалось отправить код');
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
      });

      login(data);
      message.success('Добро пожаловать!');
      navigate('/trips');
    } catch (error: any) {
      console.error(error);
      message.error(error?.response?.data?.detail || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    otpForm.resetFields();
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: isMobile ? 'auto' : 'calc(100vh - 200px)',
        padding: isMobile ? '24px 0' : '40px 0',
      }}
    >
      <Card
        style={{
          maxWidth: 450,
          width: '100%',
          borderRadius: 12,
          boxShadow: isMobile ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
        }}
        bodyStyle={{ padding: isMobile ? 20 : 32 }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <Title level={isMobile ? 4 : 3} style={{ marginBottom: 8 }}>
              Вход в CarTap
            </Title>
            <Text type="secondary">
              {step === 'phone'
                ? 'Введите номер телефона для входа'
                : 'Введите код из Telegram'}
            </Text>
          </div>

          {/* Phone Step */}
          {step === 'phone' && (
            <Form
              form={phoneForm}
              layout="vertical"
              onFinish={handleSendOtp}
              size={isMobile ? 'middle' : 'large'}
            >
              <Form.Item
                label="Номер телефона"
                name="phone"
                rules={[
                  { required: true, message: 'Введите номер телефона' },
                  {
                    pattern: /^\+996\d{9}$/,
                    message: 'Формат: +996XXXXXXXXX',
                  },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined style={{ color: '#999' }} />}
                  placeholder="+996555123456"
                  disabled={loading}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  style={{ borderRadius: 8, height: isMobile ? 40 : 44 }}
                >
                  Получить код
                </Button>
              </Form.Item>
            </Form>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <>
              <div
                style={{
                  padding: 16,
                  background: '#f5f5f5',
                  borderRadius: 8,
                  textAlign: 'center',
                }}
              >
                <Text type="secondary" style={{ fontSize: 14 }}>
                  Код отправлен на номер
                </Text>
                <div style={{ marginTop: 4 }}>
                  <Text strong style={{ fontSize: 16 }}>
                    {phone}
                  </Text>
                </div>
              </div>

              <Form
                form={otpForm}
                layout="vertical"
                onFinish={handleVerifyOtp}
                size={isMobile ? 'middle' : 'large'}
              >
                <Form.Item
                  label="Код подтверждения"
                  name="code"
                  rules={[
                    { required: true, message: 'Введите код' },
                    { len: 4, message: 'Код должен содержать 4 цифры' },
                  ]}
                >
                  <Input
                    prefix={<SafetyOutlined style={{ color: '#999' }} />}
                    placeholder="1234"
                    inputMode="numeric"
                    maxLength={4}
                    disabled={loading}
                    style={{ borderRadius: 8, fontSize: 18, letterSpacing: 4 }}
                  />
                </Form.Item>

                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    loading={loading}
                    style={{ borderRadius: 8, height: isMobile ? 40 : 44 }}
                  >
                    Войти
                  </Button>

                  <Button
                    block
                    onClick={handleBack}
                    disabled={loading}
                    style={{ borderRadius: 8 }}
                  >
                    Изменить номер
                  </Button>
                </Space>
              </Form>
            </>
          )}

          {/* Footer */}
          {step === 'phone' && (
            <div
              style={{
                textAlign: 'center',
                paddingTop: 16,
                borderTop: '1px solid #f0f0f0',
              }}
            >
              <Text type="secondary" style={{ fontSize: 14 }}>
                Нет аккаунта?{' '}
                <Link to="/register" style={{ fontWeight: 500 }}>
                  Зарегистрироваться
                </Link>
              </Text>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
}