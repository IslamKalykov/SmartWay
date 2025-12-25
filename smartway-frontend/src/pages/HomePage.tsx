// src/pages/HomePage.tsx
import { Card, Button, Space, Typography, Row, Col, Tag } from 'antd';
import {
  SearchOutlined,
  PlusCircleOutlined,
  CarOutlined,
  MessageOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

const { Title, Text, Paragraph } = Typography;

export default function HomePage() {
  const { t } = useTranslation();
  const { isAuth, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);

  return (
    <div>
      {/* Hero Section */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 16,
          marginBottom: 24,
          border: 'none',
        }}
        bodyStyle={{ padding: isMobile ? 24 : 40 }}
      >
        <Space
          orientation="vertical"
          size={20}
          style={{ width: '100%', textAlign: 'center' }}
        >
          {/* Logo */}
          <div style={{ fontSize: 48 }}>
            <CarOutlined style={{ color: '#fff' }} />
          </div>

          <Title
            level={isMobile ? 3 : 2}
            style={{ color: '#fff', margin: 0 }}
          >
            {t('home.title')}
          </Title>

          <Paragraph
            style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: isMobile ? 14 : 16,
              margin: 0,
              maxWidth: 400,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {t('home.subtitle')}
          </Paragraph>

          {/* Action Buttons */}
          <Space
            orientation={isMobile ? 'vertical' : 'horizontal'}
            size={12}
            style={{ width: isMobile ? '100%' : 'auto', marginTop: 8 }}
          >
            {!isAuth ? (
              <>
                <Link to="/login" style={{ width: isMobile ? '100%' : 'auto' }}>
                  <Button
                    type="primary"
                    size="large"
                    style={{
                      background: '#fff',
                      color: '#667eea',
                      border: 'none',
                      height: 48,
                      width: isMobile ? '100%' : 'auto',
                      fontWeight: 500,
                    }}
                  >
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/register" style={{ width: isMobile ? '100%' : 'auto' }}>
                  <Button
                    size="large"
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.5)',
                      height: 48,
                      width: isMobile ? '100%' : 'auto',
                    }}
                  >
                    {t('nav.register')}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button
                  type="primary"
                  size="large"
                  icon={<SearchOutlined />}
                  onClick={() => navigate('/search')}
                  style={{
                    background: '#fff',
                    color: '#667eea',
                    border: 'none',
                    height: 48,
                    width: isMobile ? '100%' : 'auto',
                    fontWeight: 500,
                  }}
                >
                  {user?.is_driver ? t('home.findPassengers') : t('home.findTrip')}
                </Button>
                <Button
                  size="large"
                  icon={<PlusCircleOutlined />}
                  onClick={() => navigate('/my-ads')}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.5)',
                    height: 48,
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  {user?.is_driver ? t('home.createAnnouncement') : t('home.createTrip')}
                </Button>
              </>
            )}
          </Space>
        </Space>
      </Card>

      {/* Logged in user info */}
      {isAuth && user && (
        <Card style={{ marginBottom: 24, borderRadius: 12 }}>
          <Space>
            <Text>{t('common.loading').replace('...', '')}:</Text>
            <Text strong>{user.full_name || user.phone_number}</Text>
            <Tag color={user.is_driver ? 'blue' : 'green'}>
              {user.is_driver ? `🚗 ${t('trip.driver')}` : `👤 ${t('trip.passenger')}`}
            </Tag>
            {user.is_verified_driver && (
              <Tag color="success" icon={<SafetyCertificateOutlined />}>
                {t('profile.verifiedDriver')}
              </Tag>
            )}
          </Space>
        </Card>
      )}

      {/* How it works */}
      <Title level={4} style={{ marginBottom: 16 }}>
        {t('home.howItWorks')}
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card
            style={{ height: '100%', borderRadius: 12, textAlign: 'center' }}
            hoverable
          >
            <SearchOutlined
              style={{ fontSize: 32, color: '#1890ff', marginBottom: 12 }}
            />
            <Title level={5}>{t('home.step1Title')}</Title>
            <Paragraph type="secondary">
              {t('home.step1Desc')}
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            style={{ height: '100%', borderRadius: 12, textAlign: 'center' }}
            hoverable
          >
            <MessageOutlined
              style={{ fontSize: 32, color: '#52c41a', marginBottom: 12 }}
            />
            <Title level={5}>{t('home.step2Title')}</Title>
            <Paragraph type="secondary">
              {t('home.step2Desc')}
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            style={{ height: '100%', borderRadius: 12, textAlign: 'center' }}
            hoverable
          >
            <RocketOutlined
              style={{ fontSize: 32, color: '#722ed1', marginBottom: 12 }}
            />
            <Title level={5}>{t('home.step3Title')}</Title>
            <Paragraph type="secondary">
              {t('home.step3Desc')}
            </Paragraph>
          </Card>
        </Col>
      </Row>

      {/* Features for drivers/passengers */}
      <Card style={{ marginTop: 24, borderRadius: 12 }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <div style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
              <Title level={5}>{t('trip.passenger')}</Title>
              <Paragraph type="secondary">
                {t('home.step1Desc')}. {t('home.step2Desc')}.
              </Paragraph>
              {!isAuth && (
                <Button type="primary" onClick={() => navigate('/register')}>
                  {t('nav.register')}
                </Button>
              )}
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🚗</div>
              <Title level={5}>{t('trip.driver')}</Title>
              <Paragraph type="secondary">
                {t('home.findPassengers')}. {t('home.step3Desc')}.
              </Paragraph>
              {isAuth && !user?.is_driver && (
                <Button type="primary" onClick={() => navigate('/profile')}>
                  {t('profile.becomeDriver')}
                </Button>
              )}
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}