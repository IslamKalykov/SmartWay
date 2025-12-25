// src/components/LocationSelect.tsx
import { useState, useEffect, useMemo } from 'react';
import { Select, Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { fetchLocations, fetchPopularLocations, type Location } from '../api/locations';


interface LocationSelectProps {
  value?: number;
  onChange?: (value: number, location?: Location) => void;
  placeholder?: string;
  excludeId?: number;  // Исключить определённую локацию (например, выбранную в from)
  disabled?: boolean;
  style?: React.CSSProperties;
  size?: 'small' | 'middle' | 'large';
}

export default function LocationSelect({
  value,
  onChange,
  placeholder,
  excludeId,
  disabled,
  style,
  size = 'middle',
}: LocationSelectProps) {
  const { i18n, t } = useTranslation();
  const [locations, setLocations] = useState<Location[]>([]);
  const [popularLocations, setPopularLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Загрузка локаций при монтировании и смене языка
  useEffect(() => {
    loadLocations();
  }, [i18n.language]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const [allLocs, popularLocs] = await Promise.all([
        fetchLocations(i18n.language),
        fetchPopularLocations(i18n.language),
      ]);
      // Убеждаемся что это массивы
      setLocations(Array.isArray(allLocs) ? allLocs : []);
      setPopularLocations(Array.isArray(popularLocs) ? popularLocs : []);
    } catch (error) {
      console.error('Failed to load locations:', error);
      setLocations([]);
      setPopularLocations([]);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация локаций
  const filteredLocations = useMemo(() => {
    // Защита от undefined
    if (!Array.isArray(locations)) {
      return [];
    }
    
    let result = locations;
    
    // Исключаем определённую локацию
    if (excludeId) {
      result = result.filter(loc => loc.id !== excludeId);
    }
    
    // Поиск
    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter(loc => 
        loc.name?.toLowerCase().includes(search) ||
        loc.code?.toLowerCase().includes(search) ||
        (loc.region && loc.region.toLowerCase().includes(search))
      );
    }
    
    return result;
  }, [locations, excludeId, searchValue]);

  // Популярные локации для быстрого выбора
  const popularOptions = useMemo(() => {
    if (!Array.isArray(popularLocations)) {
      return [];
    }
    return popularLocations
      .filter(loc => loc.id !== excludeId)
      .slice(0, 5);
  }, [popularLocations, excludeId]);

  // Обработчик изменения
  const handleChange = (selectedId: number) => {
    const location = locations.find(loc => loc.id === selectedId);
    onChange?.(selectedId, location);
  };

  // Группируем по регионам если не в поиске
  const groupedOptions = useMemo(() => {
    // Защита
    if (!Array.isArray(filteredLocations) || filteredLocations.length === 0) {
      return [];
    }
    
    if (searchValue) {
      // При поиске показываем плоский список
      return filteredLocations.map(loc => ({
        value: loc.id,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EnvironmentOutlined style={{ color: '#1677ff' }} />
            <span>{loc.name}</span>
            {loc.region && (
              <span style={{ color: '#999', fontSize: 12 }}>({loc.region})</span>
            )}
          </div>
        ),
      }));
    }

    // Группировка по регионам
    const grouped: Record<string, Location[]> = {};
    filteredLocations.forEach(loc => {
      const region = loc.region || 'Другие';
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(loc);
    });

    return Object.entries(grouped).map(([region, locs]) => ({
      label: region,
      options: locs.map(loc => ({
        value: loc.id,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EnvironmentOutlined style={{ color: '#1677ff' }} />
            <span>{loc.name}</span>
          </div>
        ),
      })),
    }));
  }, [filteredLocations, searchValue]);

  // Кастомный рендер popup (вместо устаревшего dropdownRender)
  const renderPopup = (menu: React.ReactNode) => (
    <div>
      {/* Популярные города */}
      {!searchValue && popularOptions.length > 0 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>
            {t('location.popular')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {popularOptions.map(loc => (
              <span
                key={loc.id}
                onClick={() => handleChange(loc.id)}
                style={{
                  padding: '2px 8px',
                  background: '#f5f5f5',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {loc.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {menu}
    </div>
  );

  return (
    <Select
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{ width: '100%', ...style }}
      size={size}
      showSearch
      filterOption={false}
      onSearch={setSearchValue}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : t('location.notFound')}
      options={groupedOptions}
      allowClear
      optionFilterProp="label"
      popupRender={renderPopup}
    />
  );
}