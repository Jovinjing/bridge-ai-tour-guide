/**
 * 结算页
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../components/Icon';
import { createOrder } from '../api';
import type { Product } from '../types';

interface LocationState {
  product?: Product;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const product = state?.product;

  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderNo: string; totalAmount: number } | null>(null);
  const [error, setError] = useState('');

  if (!product) {
    return (
      <div className="checkout-page">
        <div className="checkout-empty">
          <h2>没有待结算的商品</h2>
          <button className="btn-primary" onClick={() => navigate('/store')}>去逛逛</button>
        </div>
      </div>
    );
  }

  const total = product.price * quantity;

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await createOrder({
        orderType: 'cultural',
        goodId: product.id,
        quantity,
      });
      setOrderResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '下单失败');
    } finally {
      setLoading(false);
    }
  };

  if (orderResult) {
    return (
      <div className="checkout-page">
        <div className="checkout-success">
          <Icon name="check" size={48} />
          <h2>下单成功！</h2>
          <p>订单号: {orderResult.orderNo}</p>
          <p>金额: ¥{Number(orderResult.totalAmount).toFixed(2)}</p>
          <button className="btn-primary" onClick={() => navigate('/profile?tab=orders')}>查看订单</button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <Icon name="x" size={18} /> 返回
      </button>

      <h1 className="checkout-title">确认订单</h1>

      <div className="checkout-card">
        <div className="checkout-item">
          <img src={product.imageUrl || '/assets/placeholder.jpg'} alt={product.name} className="checkout-item-img" />
          <div className="checkout-item-info">
            <h3>{product.name}</h3>
            <p>¥{Number(product.price).toFixed(2)}</p>
          </div>
          <div className="checkout-qty">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(Math.min(10, quantity + 1))}>+</button>
          </div>
        </div>
      </div>

      <div className="checkout-total">
        <span>合计</span>
        <strong>¥{total.toFixed(2)}</strong>
      </div>

      {error && <div className="checkout-error">{error}</div>}

      <button className="btn-primary checkout-submit" onClick={handlePlaceOrder} disabled={loading}>
        {loading ? '提交中...' : '提交订单'}
      </button>
    </div>
  );
}
