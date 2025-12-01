// src/components/RideOptionsForm.tsx
import { Form, Switch, Input, Space, Typography, Tooltip } from 'antd';
import {
  HeartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;
const { TextArea } = Input;

interface RideOptionsFormProps {
  mode: 'trip' | 'announcement';  // trip = пассажир, announcement = водитель
  layout?: 'horizontal' | 'vertical';
}

export default function RideOptionsForm({ mode, layout = 'vertical' }: RideOptionsFormProps) {
  const { t } = useTranslation();

  const options = [
    {
      name: 'allow_smoking',
      label: t('rideOptions.allowSmoking'),
      icon: <span>🚬</span>,
      show: true,
    },
    {
      name: 'allow_pets',
      label: t('rideOptions.allowPets'),
      icon: <HeartOutlined />,
      show: true,
    },
    {
      name: 'allow_big_luggage',
      label: t('rideOptions.allowBigLuggage'),
      icon: <ShoppingOutlined />,
      show: true,
    },
    {
      name: 'baggage_help',
      label: t('rideOptions.baggageHelp'),
      icon: <ShoppingOutlined />,
      show: true,
    },
    {
      name: 'allow_children',
      label: t('rideOptions.allowChildren'),
      icon: <TeamOutlined />,
      show: mode === 'announcement',  // Только для водителей
    },
    {
      name: 'has_air_conditioning',
      label: t('rideOptions.airConditioning'),
      icon: <span>❄️</span>,
      show: mode === 'announcement',  // Только для водителей
    },
  ];

  const visibleOptions = options.filter(opt => opt.show);

  return (
    <div>
      <Text strong style={{ display: 'block', marginBottom: 12 }}>
        {t('rideOptions.title')}
        <Tooltip title="Укажите условия поездки для удобства поиска">
          <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999' }} />
        </Tooltip>
      </Text>

      <Space 
        direction={layout === 'vertical' ? 'vertical' : 'horizontal'} 
        size={layout === 'vertical' ? 8 : 16}
        wrap
        style={{ width: '100%' }}
      >
        {visibleOptions.map(option => (
          <Form.Item 
            key={option.name}
            name={option.name}
            valuePropName="checked"
            style={{ marginBottom: layout === 'vertical' ? 8 : 0 }}
          >
            <Switch 
              checkedChildren={option.icon}
              unCheckedChildren={option.icon}
            />
            <Text style={{ marginLeft: 8 }}>{option.label}</Text>
          </Form.Item>
        ))}
      </Space>

      <Form.Item
        name="extra_rules"
        label={t('rideOptions.extraRules')}
        style={{ marginTop: 16 }}
      >
        <TextArea
          placeholder={t('rideOptions.extraRulesPlaceholder')}
          rows={2}
          maxLength={500}
          showCount
        />
      </Form.Item>
    </div>
  );
}

// Компонент для отображения условий (readonly)
interface RideOptionsDisplayProps {
  options: {
    allow_smoking?: boolean;
    allow_pets?: boolean;
    allow_big_luggage?: boolean;
    baggage_help?: boolean;
    allow_children?: boolean;
    has_air_conditioning?: boolean;
    extra_rules?: string;
  };
  compact?: boolean;
}

export function RideOptionsDisplay({ options, compact = false }: RideOptionsDisplayProps) {
  const { t } = useTranslation();

  const items = [
    { key: 'allow_smoking', label: t('rideOptions.allowSmoking'), icon: '🚬', value: options.allow_smoking },
    { key: 'allow_pets', label: t('rideOptions.allowPets'), icon: '🐾', value: options.allow_pets },
    { key: 'allow_big_luggage', label: t('rideOptions.allowBigLuggage'), icon: '🧳', value: options.allow_big_luggage },
    { key: 'baggage_help', label: t('rideOptions.baggageHelp'), icon: '💪', value: options.baggage_help },
    { key: 'allow_children', label: t('rideOptions.allowChildren'), icon: '👶', value: options.allow_children },
    { key: 'has_air_conditioning', label: t('rideOptions.airConditioning'), icon: '❄️', value: options.has_air_conditioning },
  ];

  const activeItems = items.filter(item => item.value);

  if (activeItems.length === 0 && !options.extra_rules) {
    return null;
  }

  if (compact) {
    return (
      <Space size={4} wrap>
        {activeItems.map(item => (
          <Tooltip key={item.key} title={item.label}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
          </Tooltip>
        ))}
      </Space>
    );
  }

  return (
    <div>
      <Space size={8} wrap>
        {activeItems.map(item => (
          <span 
            key={item.key}
            style={{
              padding: '2px 8px',
              background: '#f5f5f5',
              borderRadius: 4,
              fontSize: 13,
            }}
          >
            {item.icon} {item.label}
          </span>
        ))}
      </Space>
      {options.extra_rules && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {options.extra_rules}
          </Text>
        </div>
      )}
    </div>
  );
}