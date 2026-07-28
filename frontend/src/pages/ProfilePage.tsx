/**
 * 个人中心页
 */
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { getOrders, getAddresses, createAddress, updateAddress, deleteAddress, uploadFile, getMe, updateMe, getTickets, createOrder } from '../api';
import { ITINERARY_INIT } from '../constants/bridgeData';
import type { Order, Address, CreateAddressRequest, Ticket } from '../types';
import { getToken } from '../api/client';

const NAV_ITEMS = [
  { key: 'orders', label: '我的订单', icon: 'baggageClaim' },
  { key: 'tickets', label: '门票预订', icon: 'ticket' },
  { key: 'itinerary', label: '行程规划', icon: 'mapPinCheck' },
  { key: 'cart', label: '购物车', icon: 'shoppingCart' },
  { key: 'info', label: '个人信息', icon: 'circleUser' },
];

const ORDER_STATUS_MAP: Record<string, string> = {
  ALL: '全部', PENDING: '待付款', PAID: '已支付', CANCELLED: '已取消', REFUNDING: '退款中', REFUNDED: '已退款',
};

type TabKey = 'orders' | 'tickets' | 'itinerary' | 'cart' | 'info';

export default function ProfilePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = (searchParams.get('tab') as TabKey) || 'orders';
  const [tab, setTab_] = useState<TabKey>(initialTab);
  const setTab = (t: TabKey) => { setTab_(t); navigate('/profile?tab=' + t, { replace: true }); };

  const token = getToken();
  const isLoggedIn = !!token;

  if (!isLoggedIn) {
    return (
      <div className="profile-guard">
        <div className="profile-guard-icon"><Icon name="lock" size={32} /></div>
        <h2>请先登录查看个人主页</h2>
        <button className="profile-guard-btn" onClick={() => navigate('/auth')}>前往登录</button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-sidebar">
        <ProfileAvatar />
        <nav className="profile-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`profile-nav-item ${tab === item.key ? 'active' : ''}`}
              onClick={() => setTab(item.key as TabKey)}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="profile-main">
        {tab === 'orders' && <OrdersSection />}
        {tab === 'tickets' && <TicketsSection />}
        {tab === 'itinerary' && <ItinerarySection />}
        {tab === 'cart' && <CartSection />}
        {tab === 'info' && <InfoSection />}
      </div>
    </div>
  );
}

function ProfileAvatar() {
  const [userName, setUserName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMe().then(u => {
      setUserName(u.nickname || '用户');
      setAvatar(u.avatarUrl);
    }).catch(() => {});
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadFile(file, 'avatar');
      setAvatar(res.fileUrl);
    } catch {}
  };

  return (
    <div className="profile-avatar">
      <div className="profile-avatar-circle" style={{ cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
        {avatar ? (
          <img src={avatar} alt="avatar" className="profile-avatar-img" />
        ) : (
          (userName || '?').slice(0, 1)
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
      </div>
      <p className="profile-name">{userName}</p>
    </div>
  );
}

function OrdersSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    getOrders({ page: 1, pageSize: 50 })
      .then(res => setOrders(res.content))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  return (
    <div>
      <h2 className="profile-section-title">我的订单</h2>
      <div className="order-filter-bar">
        {Object.entries(ORDER_STATUS_MAP).map(([key, label]) => (
          <button key={key} className={`order-filter-btn ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      {loading ? (
        <div className="order-empty">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="order-empty">暂无订单</div>
      ) : (
        <div className="profile-orders">
          {filtered.map(o => (
            <div key={o.id} className="profile-order-card">
              <div className="profile-order-top">
                <span className="profile-order-id">#{o.orderNo}</span>
                <span className={`profile-order-status ${
                  o.status === 'PAID' ? 'done' : o.status === 'PENDING' ? 'pending' : o.status === 'CANCELLED' ? 'cancelled' : 'refunded'
                }`}>{ORDER_STATUS_MAP[o.status] || o.status}</span>
              </div>
              <p className="profile-order-items">{o.itemName} × {o.quantity}</p>
              <div className="profile-order-bottom">
                <span className="profile-order-date">{o.createdAt?.slice(0, 10)}</span>
                <span className="profile-order-amount">¥{Number(o.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TicketsSection() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [visitDate, setVisitDate] = useState('');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTickets().then(list => {
      setTickets(list);
      if (list.length > 0) setSelected(list[0]);
    }).catch(() => {});
  }, []);

  const handleBook = async () => {
    if (!selected || !visitDate) { setMsg('请选择票种和日期'); return; }
    setLoading(true); setMsg('');
    try {
      const res = await createOrder({ orderType: 'ticket', itemId: selected.id, quantity: qty, visitDate });
      setMsg(`预订成功！订单号: ${res.orderNo}`); setMsgOk(true);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : '预订失败'); setMsgOk(false);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="profile-section-title">门票预订</h2>
      {msg && <div className={`ticket-msg ${msgOk ? 'ticket-msg-ok' : 'ticket-msg-err'}`}><Icon name={msgOk ? 'check' : 'x'} size={14} /> {msg}</div>}
      <div className="ticket-layout">
        <div className="ticket-form-card">
          {tickets.map(t => (
            <button key={t.id} className={`ticket-type-btn ${selected?.id === t.id ? 'active' : ''}`} onClick={() => setSelected(t)}>
              <span className="ticket-type-name">{t.name}</span>
              <span className="ticket-type-price">{t.price === 0 ? '免费预约' : `¥${t.price}`}</span>
            </button>
          ))}
          <div className="ticket-field">
            <label>游览日期</label>
            <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="ticket-date-input" min={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="ticket-qty">
            <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span>{qty}</span>
            <button onClick={() => setQty(Math.min(10, qty + 1))}>+</button>
          </div>
          {selected && <div className="ticket-total">合计 <strong>¥{(selected.price * qty).toFixed(2)}</strong></div>}
          <button className="ticket-submit" onClick={handleBook} disabled={loading}>{loading ? '提交中...' : '立即预订'}</button>
        </div>
      </div>
    </div>
  );
}

function ItinerarySection() {
  const [itinerary] = useState(ITINERARY_INIT);
  return (
    <div>
      <h2 className="profile-section-title">行程规划</h2>
      <div className="profile-itinerary">
        {itinerary.map(item => (
          <div key={item.id} className="profile-itinerary-item">
            <div className="profile-it-date">
              <span className="profile-it-day">{item.date}</span>
              <span className="profile-it-time">{item.time}</span>
            </div>
            <div className="profile-it-line" />
            <div className="profile-it-activity">{item.activity}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartSection() {
  const navigate = useNavigate();
  return (
    <div>
      <h2 className="profile-section-title">购物车</h2>
      <div className="profile-cart-empty">
        购物车功能已迁移至后端 API
        <br />
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/store')}>去商店看看</button>
      </div>
    </div>
  );
}

function InfoSection() {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [subtab, setSubtab] = useState<'info' | 'address'>('info');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrForm, setAddrForm] = useState<CreateAddressRequest>({ name: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: false });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addrMsg, setAddrMsg] = useState('');

  useEffect(() => {
    getMe().then(u => {
      setUserName(u.nickname || '');
      setUserEmail(u.email || '');
      setUserPhone(u.phone || '');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (subtab === 'address') {
      getAddresses().then(setAddresses).catch(() => {});
    }
  }, [subtab]);

  const handleSave = async () => {
    try {
      await updateMe({ nickname: userName, email: userEmail });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  const handleAddrSave = async () => {
    try {
      if (editingId) {
        await updateAddress(editingId, addrForm);
      } else {
        await createAddress(addrForm);
      }
      setAddrMsg('保存成功');
      setAddrForm({ name: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: false });
      setEditingId(null);
      getAddresses().then(setAddresses).catch(() => {});
    } catch { setAddrMsg('保存失败'); }
  };

  return (
    <div>
      <h2 className="profile-section-title">个人设置</h2>
      <div className="profile-sub-tabs">
        <button className={`profile-sub-tab ${subtab === 'info' ? 'active' : ''}`} onClick={() => setSubtab('info')}><Icon name="circleUser" size={16} /> 个人信息</button>
        <button className={`profile-sub-tab ${subtab === 'address' ? 'active' : ''}`} onClick={() => setSubtab('address')}><Icon name="mapPinCheck" size={16} /> 收货地址</button>
      </div>

      {subtab === 'info' && (
        <div className="profile-info-form">
          {[
            { label: '姓名', val: userName, set: setUserName },
            { label: '邮箱', val: userEmail, set: setUserEmail },
            { label: '电话', val: userPhone, set: () => {} },
          ].map(f => (
            <div key={f.label} className="profile-info-field">
              <label>{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} disabled={f.label === '电话'} />
            </div>
          ))}
          <button className="profile-save-btn" onClick={handleSave}>
            {saved ? <><Icon name="check" size={14} /> 已保存</> : '保存修改'}
          </button>
        </div>
      )}

      {subtab === 'address' && (
        <div className="address-section">
          {addrMsg && <div className="ticket-msg">{addrMsg}</div>}
          <div className="address-list">
            {addresses.map(addr => (
              <div key={addr.id} className="address-card">
                <div className="address-card-left">
                  <span className="address-consignee">{addr.name}</span>
                  <span className="address-phone">{addr.phone}</span>
                  {addr.isDefault ? <span className="address-default-tag">默认</span> : null}
                </div>
                <p className="address-detail">{[addr.province, addr.city, addr.district].filter(Boolean).join(' ')} {addr.detail}</p>
                <div className="address-card-actions">
                  <button onClick={() => { setAddrForm(addr); setEditingId(addr.id); }}>编辑</button>
                  <button onClick={async () => { try { await deleteAddress(addr.id); getAddresses().then(setAddresses); } catch {} }}>删除</button>
                </div>
              </div>
            ))}
          </div>
          <div className="address-form-card">
            <h4>{editingId ? '编辑地址' : '添加新地址'}</h4>
            <div className="address-form">
              <input value={addrForm.name} onChange={e => setAddrForm({...addrForm, name: e.target.value})} placeholder="收件人" />
              <input value={addrForm.phone} onChange={e => setAddrForm({...addrForm, phone: e.target.value})} placeholder="手机号" />
              <input value={addrForm.province} onChange={e => setAddrForm({...addrForm, province: e.target.value})} placeholder="省" />
              <input value={addrForm.city} onChange={e => setAddrForm({...addrForm, city: e.target.value})} placeholder="市" />
              <input value={addrForm.detail} onChange={e => setAddrForm({...addrForm, detail: e.target.value})} placeholder="详细地址" />
              <label><input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddrForm({...addrForm, isDefault: e.target.checked})} /> 设为默认</label>
              <button className="profile-save-btn" onClick={handleAddrSave}>{editingId ? '更新' : '添加'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
