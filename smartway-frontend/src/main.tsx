// src/main.tsx
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';

// i18n должен быть импортирован до App
import './i18n';

import App from './App';
import './styles/global.css';
import 'antd/dist/reset.css';
import './index.css';
import { AuthProvider } from './auth/AuthContext';

// Определяем локаль Ant Design по языку
const getAntdLocale = () => {
  const lang = localStorage.getItem('language') || 'ru';
  switch (lang) {
    case 'en':
      return enUS;
    default:
      return ruRU;
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ConfigProvider locale={getAntdLocale()}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConfigProvider>
  </BrowserRouter>
);