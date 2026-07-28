/**
 * 赵州桥AI科普导游 — 前端配置
 *
 * 开发时 Vite proxy 将 /api 转发到 Nginx (:80) → 后端
 * 生产时 API_BASE 为空，Nginx 统一路由
 */
const config = {
  // API 基础路径（走 Vite proxy 则留空）
  API_BASE: '',

  // SSE 超时（毫秒）
  SSE_TIMEOUT: 180_000,

  // 桥梁构件列表
  COMPONENTS: [
    { id: 'main_arch',    name: '主拱',   category: 'structure', desc: '主拱——净跨 37.02 米，1400 年前的世界之最' },
    { id: 'small_arch',   name: '敞肩拱', category: 'structure', desc: '敞肩拱——世界首创的敞肩设计，减轻自重 20%' },
    { id: 'railing',      name: '栏板',   category: 'art',       desc: '栏板——隋代石雕艺术的珍品' },
    { id: 'pillar',       name: '梁柱',   category: 'art',       desc: '梁柱——柱头雕刻精美，龙口含珠、狮兽造型' },
    { id: 'iron_parts',   name: '腰铁',   category: 'structure', desc: '腰铁——腰铁、铁拉杆，横向连接各道拱券' },
    { id: 'bridge_deck',  name: '桥面',   category: 'structure', desc: '桥面——宽 9.6 米，古代车马通行的主干道' },
    { id: 'pier',         name: '桥台',   category: 'structure', desc: '桥台——坐落在密实粗砂层上，承载全桥重量' },
  ] as const,
};

export default config;
