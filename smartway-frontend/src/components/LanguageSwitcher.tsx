// src/components/LanguageSwitcher.tsx
import { Dropdown, Button, Space } from 'antd';
import { GlobalOutlined, DownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';

interface LanguageSwitcherProps {
  style?: React.CSSProperties;
  showLabel?: boolean;
  size?: 'small' | 'middle' | 'large';
}

const languages = [
  { key: 'ru', label: 'Русский', flag: '🇷🇺' },
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'ky', label: 'Кыргызча', flag: '🇰🇬' },
];

export default function LanguageSwitcher({ 
  style, 
  showLabel = true,
  size = 'middle' 
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const currentLang = languages.find(l => l.key === i18n.language) || languages[0];

  const handleLanguageChange = (key: string) => {
    i18n.changeLanguage(key);
  };

  const menuItems: MenuProps['items'] = languages.map(lang => ({
    key: lang.key,
    label: (
      <Space>
        <span>{lang.flag}</span>
        <span>{lang.label}</span>
      </Space>
    ),
    onClick: () => handleLanguageChange(lang.key),
  }));

  return (
    <Dropdown menu={{ items: menuItems, selectedKeys: [i18n.language] }} trigger={['click']}>
      <Button type="text" size={size} style={style}>
        <Space>
          <GlobalOutlined />
          {showLabel && (
            <>
              <span>{currentLang.flag}</span>
              <span style={{ minWidth: 60 }}>{currentLang.label}</span>
            </>
          )}
          <DownOutlined style={{ fontSize: 10 }} />
        </Space>
      </Button>
    </Dropdown>
  );
}

// Компактная версия для мобильных
export function LanguageSwitcherCompact() {
  const { i18n } = useTranslation();

  const currentLang = languages.find(l => l.key === i18n.language) || languages[0];

  const handleLanguageChange = (key: string) => {
    i18n.changeLanguage(key);
  };

  const menuItems: MenuProps['items'] = languages.map(lang => ({
    key: lang.key,
    label: (
      <Space>
        <span>{lang.flag}</span>
        <span>{lang.label}</span>
      </Space>
    ),
    onClick: () => handleLanguageChange(lang.key),
  }));

  return (
    <Dropdown menu={{ items: menuItems, selectedKeys: [i18n.language] }} trigger={['click']}>
      <Button 
        type="text" 
        size="small"
        style={{ 
          padding: '4px 8px',
          height: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 16 }}>{currentLang.flag}</span>
        <span style={{ fontSize: 12, color: '#666' }}>{currentLang.key.toUpperCase()}</span>
      </Button>
    </Dropdown>
  );
}