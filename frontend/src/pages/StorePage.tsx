/**
 * 文创商店页
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { getGoodsDisplay, getCulturalAll } from '../api';
import type { ProductDisplay, CulturalInfo } from '../types';

const PAGE_SIZE = 8;

function ProductCard({ product, onView }: { product: ProductDisplay; onView: (p: ProductDisplay) => void }) {
  return (
    <div className="store-card" onClick={() => onView(product)}>
      <div className="store-card-img">
        <img src={product.img} alt={product.name} />
      </div>
      <div className="store-card-body">
        <h3 className="store-card-name">{product.name}</h3>
        <div className="store-card-footer">
          <span className="store-card-price">¥{product.price}</span>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ item }: { item: CulturalInfo }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`info-card ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded(!expanded)}>
      {item.coverImage && (
        <div className="info-card-img">
          <img src={item.coverImage} alt={item.title} />
        </div>
      )}
      <div className="info-card-body">
        <h3 className="info-card-title">{item.title}</h3>
        {expanded && item.content && <div className="info-card-content">{item.content}</div>}
        {item.category && <span className="info-card-cat">{item.category}</span>}
      </div>
    </div>
  );
}

export default function StorePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductDisplay[]>([]);
  const [categories, setCategories] = useState<string[]>(['全部']);
  const [category, setCategory] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [storeTab, setStoreTab] = useState('shop');
  const [infoList, setInfoList] = useState<CulturalInfo[]>([]);
  const [infoLoading, setInfoLoading] = useState(false);

  useEffect(() => {
    getGoodsDisplay({ page: 1, pageSize: 100 })
      .then(res => {
        setProducts(res.items);
        const cats = ['全部', ...new Set(res.items.map(p => p.category).filter(Boolean))];
        setCategories(cats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (storeTab !== 'info') return;
    setInfoLoading(true);
    getCulturalAll()
      .then(setInfoList)
      .catch(() => {})
      .finally(() => setInfoLoading(false));
  }, [storeTab]);

  const filtered = products.filter(p =>
    (category === '全部' || p.category === category) &&
    (search === '' || p.name.includes(search) || (p.desc && p.desc.includes(search))),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="store-page">
      <div className="store-header">
        <div className="store-header-inner">
          <div className="store-header-top">
            <h1 className="store-title">文创商店</h1>
            <span className="store-count">共 {products.length} 件商品</span>
          </div>
          <div className="store-search">
            <input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} placeholder="搜索商品名称..." className="store-search-input" />
          </div>
        </div>
      </div>

      <div className="store-body">
        <div className="store-sub-tabs">
          <button className={`store-sub-tab ${storeTab === 'shop' ? 'active' : ''}`} onClick={() => setStoreTab('shop')}>
            <Icon name="shoppingCart" size={16} /> 商品
          </button>
          <button className={`store-sub-tab ${storeTab === 'info' ? 'active' : ''}`} onClick={() => setStoreTab('info')}>
            <Icon name="bookOpen" size={16} /> 文创资讯
          </button>
        </div>

        {storeTab === 'shop' && (
          <>
            <div className="store-categories">
              {categories.map(cat => (
                <button key={cat} className={`store-cat-btn ${category === cat ? 'active' : ''}`} onClick={() => { setCategory(cat); setCurrentPage(1) }}>
                  {cat}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="store-empty">加载中...</div>
            ) : paged.length > 0 ? (
              <div className="store-grid">
                {paged.map(p => (
                  <ProductCard key={p.id} product={p} onView={(p) => navigate(`/product/${p.id}`)} />
                ))}
              </div>
            ) : (
              <div className="store-empty">未找到相关商品</div>
            )}

            {totalPages > 1 && (
              <div className="store-pagination">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="store-page-btn">上一页</button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} className={`store-page-num ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                ))}
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} className="store-page-btn">下一页</button>
              </div>
            )}
          </>
        )}

        {storeTab === 'info' && (
          <div className="info-list">
            {infoLoading ? (
              <div className="store-empty">加载中...</div>
            ) : infoList.length === 0 ? (
              <div className="store-empty">暂无资讯</div>
            ) : (
              infoList.map(item => <InfoCard key={item.id} item={item} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
