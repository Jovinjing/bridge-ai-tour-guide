/**
 * 赵州桥AI科普导游系统 — 根组件
 *
 * 使用 React Router v7 管理页面导航
 */
import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AiPanoramaPage from './pages/AiPanoramaPage';
import StorePage from './pages/StorePage';
import ProductDetailPage from './pages/ProductDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import Icon from './components/Icon';
import ErrorBoundary from './components/ErrorBoundary';
import { checkHealth } from './api';
import { getSessionId, getToken, setToken, clearToken } from './api/client';
import './App.css';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const isFullPage = ['/home', '/store', '/auth', '/profile'].includes(location.pathname) || location.pathname.startsWith('/product');

  const [sessionId] = useState(() => getSessionId());
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getToken());
  const [isOffline, setIsOffline] = useState(false);

  // 健康检查
  useEffect(() => {
    const check = async () => {
      try {
        const ok = await checkHealth();
        setIsOffline(!ok);
      } catch {
        setIsOffline(true);
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleLogin = useCallback((token: string) => {
    setToken(token);
    setIsLoggedIn(true);
  }, []);

  const handleLogout = useCallback(() => {
    clearToken();
    setIsLoggedIn(false);
    navigate('/');
  }, [navigate]);

  const cartCount = 0; // 购物车功能迁移到后端 API

  const isHome = location.pathname === '/';

  return (
    <div className={`app ${isFullPage ? 'app-full' : ''}`}>
      {/* 离线横幅 */}
      {isOffline && (
        <div className="offline-banner">
          <Icon name="bridge" size={14} /> 后端服务暂不可用——AI 导游无法回答，商店和订单数据可能显示异常
        </div>
      )}

      {/* 导航栏：首页不显示 */}
      {!isHome && (
        <Navbar
          currentPath={location.pathname}
          isLoggedIn={isLoggedIn}
          cartCount={cartCount}
          navigate={navigate}
          onLogout={handleLogout}
        />
      )}

      <main className={`app-main ${isFullPage ? 'app-main-full' : ''}`}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/ai" element={<AiPanoramaPage sessionId={sessionId} />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* 页脚 */}
      {!isHome && (
        <footer className="app-footer">
          <span>赵州桥科普 · AI 导游 v3.0</span>
          <span className="footer-sep">|</span>
          <span>LangChain.js + DeepSeek</span>
        </footer>
      )}
    </div>
  );
}

interface NavbarProps {
  currentPath: string;
  isLoggedIn: boolean;
  cartCount: number;
  navigate: (path: string) => void;
  onLogout: () => void;
}

function Navbar({ currentPath, isLoggedIn, cartCount, navigate, onLogout }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className={`navbar-link ${currentPath === '/ai' ? 'active' : ''}`} onClick={() => navigate('/ai')}>
          AI 科普
        </button>
        <button className={`navbar-link ${currentPath === '/store' ? 'active' : ''}`} onClick={() => navigate('/store')}>
          文创商店
        </button>
      </div>

      <button className="navbar-brand" onClick={() => navigate('/')}>
        赵州桥
      </button>

      <div className="navbar-right">
        {isLoggedIn ? (
          <>
            <button className={`navbar-link ${currentPath === '/profile' ? 'active' : ''}`} onClick={() => navigate('/profile')}>
              个人主页
            </button>
            <button className="navbar-icon-btn" onClick={() => navigate('/profile?tab=cart')} aria-label="购物车">
              <Icon name="shoppingCart" size={18} />
              {cartCount > 0 && <span className="navbar-cart-badge">{cartCount > 9 ? '9+' : cartCount}</span>}
            </button>
            <button className="navbar-link" onClick={onLogout}>
              退出
            </button>
          </>
        ) : (
          <>
            <button className={`navbar-link ${currentPath === '/profile' ? 'active' : ''}`} onClick={() => navigate('/profile')}>
              个人主页
            </button>
            <button className="navbar-link" onClick={() => navigate('/auth')}>
              登录
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
