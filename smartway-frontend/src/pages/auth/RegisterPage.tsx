// src/pages/auth/RegisterPage.tsx
import { useState } from 'react';
import {
  Card, Typography, Form, Input, Button, Space, message, Divider, Switch, Alert
} from 'antd';
import { PhoneOutlined, LockOutlined, ArrowLeftOutlined, UserOutlined, CarOutlined, SendOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { sendOtp, verifyOtpWithPayload } from '../../api/auth';

const { Title, Text } = Typography;

const TELEGRAM_BOT_URL = 'https://t.me/smartway2023_bot';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(false);

  const [phoneForm] = Form.useForm();
  const [otpForm] = Form.useForm();

  const handleSendOtp = async (values: { phone: string }) => {
    try {
      setLoading(true);
      await sendOtp(values.phone);
      setPhone(values.phone);
      setStep('otp');
      message.success(t('auth.codeSentTo'));
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      message.error(detail || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (values: { code: string; pin: string; confirmPin: string }) => {
    if (values.pin !== values.confirmPin) {
      message.error(t('auth.pinMismatch'));
      return;
    }
    try {
      setLoading(true);
      const result = await verifyOtpWithPayload({
        phone,
        code: values.code,
        pin_code: values.pin,
        role: isDriver ? 'driver' : 'passenger',
      });

      // Обновляем контекст
      await login({
        access: result.access,
        refresh: result.refresh,
        user: result.user,
      });

      message.success(t('common.success'));
      navigate('/profile');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      message.error(detail || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    otpForm.resetFields();
  };

  const handleOpenBot = () => {
    window.open(TELEGRAM_BOT_URL, '_blank');
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: isMobile ? 'auto' : 'calc(100vh - 200px)',
        padding: isMobile ? 0 : 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 12,
          boxShadow: isMobile ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
        }}
        bodyStyle={{ padding: isMobile ? 20 : 32 }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <Title level={isMobile ? 4 : 3} style={{ marginBottom: 8 }}>
              {t('nav.register')}
            </Title>
            <Text type="secondary">
              {step === 'phone' ? t('auth.enterPhone') : t('auth.enterCode')}
            </Text>
          </div>

          {/* Telegram Bot Info */}
          {step === 'phone' && (
            <Alert
              type="info"
              showIcon
              icon={<SendOutlined style={{ color: '#0088cc' }} />}
              style={{ borderRadius: 8 }}
              message={
                <Text strong style={{ color: '#0088cc' }}>
                  {t('auth.telegramBotTitle', 'Активируйте Telegram бота')}
                </Text>
              }
              description={
                <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {t('auth.telegramBotDescription', 'Для получения кода подтверждения и уведомлений о поездках сначала активируйте нашего Telegram бота.')}
                  </Text>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleOpenBot}
                    style={{
                      background: '#0088cc',
                      borderColor: '#0088cc',
                      borderRadius: 8,
                    }}
                  >
                    {t('auth.openTelegramBot', 'Открыть бота')}
                  </Button>
                </Space>
              }
            />
          )}

          {/* Phone Step */}
          {step === 'phone' && (
            <Form
              form={phoneForm}
              layout="vertical"
              onFinish={handleSendOtp}
              size={isMobile ? 'middle' : 'large'}
            >
              <Form.Item
                label={t('auth.phoneLabel')}
                name="phone"
                rules={[
                  { required: true, message: t('auth.phoneRequired') },
                  {
                    pattern: /^\+996\d{9}$/,
                    message: t('auth.phoneFormat'),
                  },
                ]}
              >
                <Input
                  inputMode="tel"
                  type="tel"
                  autoComplete="tel"
                  prefix={<PhoneOutlined style={{ color: '#999' }} />}
                  placeholder={t('auth.phonePlaceholder')}
                  disabled={loading}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              {/* Role selector */}
              <Form.Item>
                <Card
                  size="small"
                  style={{
                    borderRadius: 8,
                    background: isDriver ? '#e6f4ff' : '#f5f5f5',
                    borderColor: isDriver ? '#1677ff' : '#d9d9d9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space>
                      {isDriver ? <CarOutlined style={{ color: '#1677ff' }} /> : <UserOutlined />}
                      <div>
                        <Text strong>
                          {isDriver ? t('trip.driver') : t('trip.passenger')}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {isDriver
                            ? t('home.findPassengers')
                            : t('home.findTrip')
                          }
                        </Text>
                      </div>
                    </Space>
                    <Switch
                      checked={isDriver}
                      onChange={setIsDriver}
                      checkedChildren={<CarOutlined />}
                      unCheckedChildren={<UserOutlined />}
                    />
                  </div>
                </Card>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  style={{ borderRadius: 8, height: isMobile ? 40 : 44 }}
                >
                  {t('auth.getCode')}
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
                  {t('auth.codeSentTo')}
                </Text>
                <div style={{ marginTop: 4 }}>
                  <Text strong style={{ fontSize: 16 }}>
                    {phone}
                  </Text>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('auth.checkTelegramBot', 'Проверьте сообщения в Telegram боте')}
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
                  label={t('auth.codeLabel')}
                  name="code"
                  rules={[{ required: true, message: t('auth.codeRequired') }]}
                >
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    prefix={<LockOutlined style={{ color: '#999' }} />}
                    placeholder={t('auth.codePlaceholder')}
                    disabled={loading}
                    style={{ borderRadius: 8, letterSpacing: 4, textAlign: 'center' }}
                    maxLength={6}
                  />
                </Form.Item>

                <Form.Item
                  label={t('auth.newPinLabel')}
                  name="pin"
                  rules={[
                    { required: true, message: t('auth.pinRequired') },
                    { pattern: /^\d{4}$/, message: t('auth.pinFormat') },
                  ]}
                >
                  <Input.Password
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    prefix={<LockOutlined style={{ color: '#999' }} />}
                    placeholder={t('auth.pinPlaceholder')}
                    disabled={loading}
                    style={{ borderRadius: 8, letterSpacing: 4 }}
                    maxLength={4}
                  />
                </Form.Item>

                <Form.Item
                  label={t('auth.confirmPinLabel')}
                  name="confirmPin"
                  dependencies={['pin']}
                  rules={[
                    { required: true, message: t('auth.pinRequired') },
                    { pattern: /^\d{4}$/, message: t('auth.pinFormat') },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('pin') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error(t('auth.pinMismatch')));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    prefix={<LockOutlined style={{ color: '#999' }} />}
                    placeholder={t('auth.pinPlaceholder')}
                    disabled={loading}
                    style={{ borderRadius: 8, letterSpacing: 4 }}
                    maxLength={4}
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      loading={loading}
                      style={{ borderRadius: 8, height: isMobile ? 40 : 44 }}
                    >
                      {t('auth.verify')}
                    </Button>
                    <Button
                      type="text"
                      block
                      onClick={handleBack}
                      icon={<ArrowLeftOutlined />}
                    >
                      {t('auth.changePhone')}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </>
          )}

          {/* Footer */}
          <Divider style={{ margin: 0 }} />

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">{t('auth.hasAccount')} </Text>
            <Link to="/login">{t('auth.loginLink')}</Link>
          </div>
        </Space>
      </Card>
    </div>
  );
}