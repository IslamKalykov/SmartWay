// src/pages/auth/LoginPage.tsx
import { useState } from 'react';
import {
  Card,
  Typography,
  Form,
  Input,
  Button,
  Space,
  message,
  Divider,
} from 'antd';
import {
  PhoneOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { loginWithPin, sendOtp, verifyOtpWithPayload, type AuthTokens } from '../../api/auth';


const { Title, Text } = Typography;

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);

  const [mode, setMode] = useState<'pin' | 'reset'>('pin');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const [pinForm] = Form.useForm();
  const [resetForm] = Form.useForm();

  const doLogin = async (tokens: AuthTokens) => {
    await login(tokens);
    message.success(t('common.success'));
    navigate('/search', { replace: true });
  };

  const handlePinLogin = async (values: { phone: string; pin: string }) => {
    try {
      setLoading(true);
      const result = await loginWithPin(values.phone, values.pin);
      await doLogin(result);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      message.error(detail || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtpForReset = async () => {
    try {
      const values = await pinForm.validateFields(['phone']);
      setLoading(true);
      await sendOtp(values.phone);
      setPhone(values.phone);
      setMode('reset');
      message.success(t('auth.codeSentTo'));
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (detail) {
        message.error(detail);
      } else if (error?.errorFields) {
        // validation error, ignore toast
      } else {
        message.error(t('errors.serverError'));
      }
    } finally {
      setLoading(false);
    }
  };
  const handleResetPin = async (values: { code: string; newPin: string; confirmPin: string }) => {
    if (values.newPin !== values.confirmPin) {
      message.error(t('auth.pinMismatch'));
      return;
    }
    try {
      setLoading(true);
      const tokens = await verifyOtpWithPayload({
        phone,
        code: values.code,
        pin_code: values.newPin,
        reset_pin: true,
      });
      await doLogin(tokens);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      message.error(detail || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setMode('pin');
    resetForm.resetFields();
  };

  const title =
    mode === 'pin' ? t('auth.loginWithPin') : t('auth.resetPinTitle');
  const subtitle =
    mode === 'pin'
      ? t('auth.enterPinToLogin')
      : t('auth.enterOtpAndNewPin');


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
          maxWidth: 420,
          borderRadius: 12,
          boxShadow: isMobile ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
        }}
        styles={{ body: { padding: isMobile ? 20 : 32 } }}
      >
        <Space
          size={24}
          style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', width: '100%' }}>
            <Title level={isMobile ? 4 : 3} style={{ marginBottom: 8 }}>
              {title}
            </Title>
            <Text type="secondary">
              {subtitle}
            </Text>
          </div>

          {/* PIN login */}
          {mode === 'pin' && (
            <Form
              form={pinForm}
              layout="vertical"
              onFinish={handlePinLogin}
              size={isMobile ? 'middle' : 'large'}
              style={{ width: '100%' }}
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

              <Form.Item
                label={t('auth.pinLabel')}
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

              <Form.Item style={{ marginBottom: 0 }}>
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    loading={loading}
                    style={{ borderRadius: 8, height: isMobile ? 40 : 44 }}
                  >
                    {t('auth.loginAction')}
                  </Button>
                  <Button
                    type="text"
                    block
                    onClick={handleSendOtpForReset}
                    icon={<SafetyCertificateOutlined />}
                  >
                    {t('auth.forgotPin')}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          )}

          {/* Reset PIN */}
          {mode === 'reset' && (
            <div style={{ width: '100%' }}>
              <div
                style={{
                  padding: 16,
                  background: '#f5f5f5',
                  borderRadius: 8,
                  textAlign: 'center',
                  marginBottom: 24,
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
              </div>

              <Form
                form={resetForm}
                layout="vertical"
                onFinish={handleResetPin}
                size={isMobile ? 'middle' : 'large'}
              >
                <Form.Item
                  label={t('auth.codeLabel')}
                  name="code"
                  rules={[{ required: true, message: t('auth.codeRequired') }]}
                >
                  <Input
                    prefix={<LockOutlined style={{ color: '#999' }} />}
                    placeholder={t('auth.codePlaceholder')}
                    disabled={loading}
                    style={{
                      borderRadius: 8,
                      letterSpacing: 4,
                      textAlign: 'center',
                    }}
                    maxLength={6}
                  />
                </Form.Item>

                <Form.Item
                  label={t('auth.newPinLabel')}
                  name="newPin"
                  rules={[
                    { required: true, message: t('auth.pinRequired') },
                    { pattern: /^\d{4}$/, message: t('auth.pinFormat') },
                  ]}
                >
                  <Input.Password
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
                  dependencies={['newPin']}
                  rules={[
                    { required: true, message: t('auth.pinRequired') },
                    { pattern: /^\d{4}$/, message: t('auth.pinFormat') },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPin') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error(t('auth.pinMismatch')));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#999' }} />}
                    placeholder={t('auth.pinPlaceholder')}
                    disabled={loading}
                    style={{ borderRadius: 8, letterSpacing: 4 }}
                    maxLength={4}
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      loading={loading}
                      style={{ borderRadius: 8, height: isMobile ? 40 : 44 }}
                    >
                      {t('auth.updatePin')}
                    </Button>
                    <Button
                      type="text"
                      block
                      onClick={handleBack}
                      icon={<ArrowLeftOutlined />}
                    >
                      {t('auth.changePhone')}
                    </Button>
                  </div>
                </Form.Item>
              </Form>
            </div>
          )}

          {/* Footer */}
          <div style={{ width: '100%' }}>
            <Divider style={{ margin: '0 0 16px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">{t('auth.noAccount')} </Text>
              <Link to="/register">{t('auth.registerLink')}</Link>
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
}
