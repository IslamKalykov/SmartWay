// src/components/SearchFilter.tsx
import { useState } from 'react';
import { Card, Space, Button, DatePicker, Collapse, Switch, Typography } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import LocationSelect from './LocationSelect';

const { Text } = Typography;

export interface SearchFilters {
  from_location?: number;
  to_location?: number;
  date?: string;
  allow_smoking?: boolean;
  allow_pets?: boolean;
  allow_big_luggage?: boolean;
}

interface SearchFilterProps {
  onSearch: (filters: SearchFilters) => void;
  loading?: boolean;
  showRideOptions?: boolean;
}

export default function SearchFilter({ 
  onSearch, 
  loading,
  showRideOptions = false 
}: SearchFilterProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleClear = () => {
    setFilters({});
    onSearch({});
  };

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== null);

  return (
    <Card style={{ borderRadius: 12, marginBottom: 16 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* Основные фильтры */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              {t('search.from')}
            </Text>
            <LocationSelect
              value={filters.from_location}
              onChange={(id) => updateFilter('from_location', id)}
              placeholder={t('search.fromPlaceholder')}
            />
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              {t('search.to')}
            </Text>
            <LocationSelect
              value={filters.to_location}
              onChange={(id) => updateFilter('to_location', id)}
              placeholder={t('search.toPlaceholder')}
              excludeId={filters.from_location}
            />
          </div>

          <div style={{ minWidth: 150 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              {t('search.date')}
            </Text>
            <DatePicker
              value={filters.date ? dayjs(filters.date) : undefined}
              onChange={(date) => updateFilter('date', date?.format('YYYY-MM-DD'))}
              style={{ width: '100%' }}
              placeholder={t('search.date')}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </div>
        </div>

        {/* Расширенные фильтры */}
        {showRideOptions && (
          <Collapse
            ghost
            activeKey={showAdvanced ? ['advanced'] : []}
            onChange={() => setShowAdvanced(!showAdvanced)}
            items={[
              {
                key: 'advanced',
                label: (
                  <Space>
                    <FilterOutlined />
                    <span>{t('search.filters')}</span>
                  </Space>
                ),
                children: (
                  <Space wrap>
                    <div>
                      <Switch
                        checked={filters.allow_smoking}
                        onChange={(v) => updateFilter('allow_smoking', v || undefined)}
                        size="small"
                      />
                      <Text style={{ marginLeft: 8 }}>{t('rideOptions.allowSmoking')}</Text>
                    </div>
                    <div>
                      <Switch
                        checked={filters.allow_pets}
                        onChange={(v) => updateFilter('allow_pets', v || undefined)}
                        size="small"
                      />
                      <Text style={{ marginLeft: 8 }}>{t('rideOptions.allowPets')}</Text>
                    </div>
                    <div>
                      <Switch
                        checked={filters.allow_big_luggage}
                        onChange={(v) => updateFilter('allow_big_luggage', v || undefined)}
                        size="small"
                      />
                      <Text style={{ marginLeft: 8 }}>{t('rideOptions.allowBigLuggage')}</Text>
                    </div>
                  </Space>
                ),
              },
            ]}
          />
        )}

        {/* Кнопки */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {hasFilters && (
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
            >
              {t('search.clearFilters')}
            </Button>
          )}
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
          >
            {t('search.searchBtn')}
          </Button>
        </div>
      </Space>
    </Card>
  );
}