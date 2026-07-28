/**
 * 首页 — Hero + 数据条 + 历史/工程介绍 + CTA
 */
import { useNavigate } from 'react-router-dom';

const IMG_HERO = 'https://images.unsplash.com/photo-1767509925272-56916e86ab9a?w=1600&h=900&fit=crop&auto=format';
const IMG_REFLECT = 'https://images.unsplash.com/photo-1770101543248-e8dc992f52e6?w=1200&h=800&fit=crop&auto=format';
const IMG_FOREST = 'https://images.unsplash.com/photo-1776917983172-c9cd76765131?w=1200&h=800&fit=crop&auto=format';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="home-hero">
        <img src={IMG_HERO} alt="赵州桥全景" className="home-hero-bg" />
        <div className="home-hero-overlay" />
        <div className="home-hero-content">
          <p className="home-hero-sub">Hebei · China · Since 595 AD</p>
          <h1 className="home-hero-title">赵州桥</h1>
          <p className="home-hero-en">Zhaozhou Bridge</p>
          <p className="home-hero-desc">
            世界现存最早的大跨度石拱桥<br />承载千年文明，跨越历史长河
          </p>
          <div className="home-hero-actions">
            <button className="home-btn-primary" onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })}>
              了解历史
            </button>
            <button className="home-btn-secondary" onClick={() => navigate('/ai')}>
              虚拟游览
            </button>
          </div>
        </div>
        <div className="home-scroll-cue">
          <span>Scroll</span>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* 数据条 */}
      <section className="home-stats">
        {[
          { num: '595 AD', label: '建造年份', sub: 'Year Built' },
          { num: '37.02m', label: '主跨跨度', sub: 'Main Span' },
          { num: '1400+', label: '历史年份', sub: 'Years of History' },
        ].map(s => (
          <div key={s.label} className="home-stat-item">
            <div className="home-stat-num">{s.num}</div>
            <div className="home-stat-label">{s.label}</div>
            <div className="home-stat-sub">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* 历史介绍 */}
      <section id="history-section" className="home-info">
        <div className="home-info-inner">
          <div className="home-info-text">
            <p className="home-info-tag">History · 历史</p>
            <h2 className="home-info-title">千年不倒的<br />工程奇迹</h2>
            <p className="home-info-p">赵州桥由隋代工匠李春于公元595至605年间建造，横跨洨河。历经14个世纪的风雨、洪水、地震与战乱，依然屹立，成为人类工程智慧的永恒见证。</p>
            <p className="home-info-p">1961年被列入首批全国重点文物保护单位，2015年入选国家AAAA级景区，每年吸引超过百万名游客前来参观。</p>
          </div>
          <div className="home-info-img">
            <img src={IMG_REFLECT} alt="赵州桥倒影" />
          </div>
        </div>
      </section>

      {/* 工程成就 */}
      <section className="home-info home-info-alt">
        <div className="home-info-inner">
          <div className="home-info-img">
            <img src={IMG_FOREST} alt="赵州桥林荫" />
          </div>
          <div className="home-info-text">
            <p className="home-info-tag">Engineering · 工程</p>
            <h2 className="home-info-title">敞肩拱的<br />超凡智慧</h2>
            <p className="home-info-p">赵州桥首创"敞肩式"石拱结构——在主拱两肩各设两个小拱，这一革命性设计比欧洲同类结构早800余年，既减轻了桥身自重，又大幅提升了洪水通过能力。</p>
            <p className="home-info-p">全桥无砂浆粘合，28道独立拱圈以铁件连接，现代有限元分析显示其结构安全系数高达5-6倍，彰显了古代工程师对力学的深刻直觉。</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="home-cta">
        <h2 className="home-cta-title">探索赵州桥的每一个细节</h2>
        <p className="home-cta-desc">通过AI科普互动，深入了解这座千年古桥的建造智慧</p>
        <div className="home-cta-actions">
          <button className="home-btn-primary" onClick={() => navigate('/ai')}>进入AI科普</button>
          <button className="home-btn-outline" onClick={() => navigate('/store')}>浏览文创商店</button>
        </div>
      </section>
    </div>
  );
}
