-- 赵州桥AI科普导游系统 — 数据库初始化脚本
-- 包含：pgvector 扩展、public schema、agent schema

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- ==================== public schema ====================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  nickname VARCHAR(50) NOT NULL,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文创商品表
CREATE TABLE IF NOT EXISTS goods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INT DEFAULT 0,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 门票表
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INT DEFAULT 0,
  hotspots JSONB,
  image_urls JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  good_id INT,
  ticket_id INT,
  quantity INT DEFAULT 1,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (good_id) REFERENCES goods(id) ON DELETE SET NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL
);

-- 文化内容表
CREATE TABLE IF NOT EXISTS cultural (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_goods_stock ON goods(stock);
CREATE INDEX IF NOT EXISTS idx_tickets_stock ON tickets(stock);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_cultural_category ON cultural(category);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_target ON favorites(user_id, target_type, target_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goods_updated_at BEFORE UPDATE ON goods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cultural_updated_at BEFORE UPDATE ON cultural
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== agent schema ====================

-- 会话表
CREATE TABLE IF NOT EXISTS agent_sessions (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(100),
  session_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 消息表
CREATE TABLE IF NOT EXISTS agent_messages (
  id VARCHAR(50) PRIMARY KEY,
  session_id VARCHAR(50) NOT NULL,
  role VARCHAR(50) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 工具调用记录表
CREATE TABLE IF NOT EXISTS agent_tool_calls (
  id VARCHAR(50) PRIMARY KEY,
  message_id VARCHAR(50) NOT NULL,
  tool_name VARCHAR(100) NOT NULL,
  arguments TEXT,
  result TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_agent_sessions_session_id ON agent_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_session_id ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_calls_message_id ON agent_tool_calls(message_id);

-- 插入初始数据
INSERT INTO goods (name, description, price, stock) VALUES
('赵州桥文创钥匙扣', '精选黄铜材质，刻有赵州桥经典造型', 29.90, 100),
('赵州桥折扇', '手工绘制赵州桥图案，精美实用', 68.00, 50),
('赵州桥纪念币', '1:1 还原赵州桥历史文物', 128.00, 80)
ON CONFLICT DO NOTHING;

INSERT INTO cultural (title, content, category) VALUES
('赵州桥简介', '赵州桥，又称安济桥，建于隋代大业年间（595-605年），由著名匠师李春设计建造，是世界上最古老的敞肩石拱桥。', '历史'),
('赵州桥的建筑特点', '赵州桥的主拱为敞肩拱，设有两个小拱，既减轻了桥身自重，又节省了石材，还能减轻洪水对桥身的冲击。', '建筑'),
('赵州桥的传说', '赵州桥的传说中，有"张果老倒骑驴过桥"的故事，寓意桥能承受万斤之重。', '传说'),
('李春与赵州桥', '李春是隋代著名匠师，被誉为"桥梁之父"，赵州桥是他一生的杰作。', '历史'),
('赵州桥的维护', '赵州桥历经千年风雨，经过多次修缮，仍保持完好。现代保护措施包括定期监测和预防性维护。', '历史')
ON CONFLICT DO NOTHING;
