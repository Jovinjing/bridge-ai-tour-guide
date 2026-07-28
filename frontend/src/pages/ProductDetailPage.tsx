/**
 * 商品详情页
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { getGoodsDetail } from '../api';
import type { Product } from '../types';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getGoodsDetail(Number(id))
      .then(setProduct)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const handleBuyNow = () => {
    navigate('/checkout', { state: { product } });
  };

  if (loading) return <div className="page-loading">加载中...</div>;
  if (!product) return <div className="page-error">商品不存在</div>;

  return (
    <div className="product-detail-page">
      <button className="back-btn" onClick={() => navigate('/store')}>
        <Icon name="x" size={18} /> 返回商店
      </button>

      <div className="product-detail-card">
        <div className="product-detail-img">
          <img src={product.imageUrl || '/assets/placeholder.jpg'} alt={product.name} />
        </div>
        <div className="product-detail-info">
          <h1 className="product-detail-name">{product.name}</h1>
          {product.category && <span className="product-detail-cat">{product.category}</span>}
          <p className="product-detail-desc">{product.description || '暂无描述'}</p>
          <div className="product-detail-price">
            <span className="price-label">价格</span>
            <span className="price-value">¥{Number(product.price).toFixed(2)}</span>
          </div>
          <div className="product-detail-stock">
            库存: {product.stock > 0 ? `${product.stock} 件` : '暂时缺货'}
          </div>
          <div className="product-detail-actions">
            <button className="btn-cart" onClick={handleAddToCart} disabled={product.stock <= 0}>
              {added ? <><Icon name="check" size={14} /> 已加入购物车</> : '加入购物车'}
            </button>
            <button className="btn-buy" onClick={handleBuyNow} disabled={product.stock <= 0}>
              立即购买
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
