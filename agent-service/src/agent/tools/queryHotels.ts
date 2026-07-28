/**
 * 酒店查询工具
 *
 * 查询赵县及石家庄周边的酒店住宿信息。
 * 一期返回预设的推荐酒店列表，
 * 二期对接第三方酒店 API（如携程、美团等开放接口）。
 */
import { ToolAdapter } from './adapter';

interface HotelsParams {
  city?: string;       // 城市
  budget?: string;     // 预算区间: 经济型, 舒适型, 高档型
  limit?: number;      // 返回数量
}

interface HotelItem {
  name: string;
  address: string;
  type: string;
  priceRange: string;
  rating: string;
  distance: string;    // 距赵州桥距离
  features: string[];  // 特色
}

interface HotelsResult {
  city: string;
  hotels: HotelItem[];
  total: number;
}

// 预设赵县及周边酒店
const PRESET_HOTELS: HotelItem[] = [
  {
    name: '赵州宾馆',
    address: '赵县石塔路与308国道交口',
    type: '经济型',
    priceRange: '100-200元',
    rating: '4.0',
    distance: '距赵州桥约3公里',
    features: ['免费停车', 'WiFi', '近赵州桥'],
  },
  {
    name: '赵县金桥酒店',
    address: '赵县柏林街与建设路交口',
    type: '经济型',
    priceRange: '80-150元',
    rating: '3.8',
    distance: '距赵州桥约4公里',
    features: ['早餐', '停车场'],
  },
  {
    name: '石家庄希尔顿酒店',
    address: '石家庄市长安区中山东路',
    type: '高档型',
    priceRange: '500-1000元',
    rating: '4.7',
    distance: '距赵州桥约45公里',
    features: ['游泳池', '健身房', '行政酒廊', '免费WiFi'],
  },
  {
    name: '石家庄万象天成假日酒店',
    address: '石家庄市桥西区裕华西路',
    type: '舒适型',
    priceRange: '300-500元',
    rating: '4.5',
    distance: '距赵州桥约42公里',
    features: ['早餐', '商务中心', '免费停车'],
  },
  {
    name: '赵县柏林禅寺招待所',
    address: '赵县石塔东路柏林禅寺旁',
    type: '经济型',
    priceRange: '60-120元',
    rating: '4.2',
    distance: '距赵州桥约3.5公里',
    features: ['禅修体验', '素斋', '安静清幽'],
  },
];

export class HotelsAdapter implements ToolAdapter<HotelsParams, HotelsResult> {
  name = 'queryHotels';

  async execute(params: HotelsParams): Promise<HotelsResult> {
    const { budget, limit = 5 } = params;

    let hotels = [...PRESET_HOTELS];

    // 按预算筛选
    if (budget) {
      const budgetMap: Record<string, string[]> = {
        '经济型': ['经济型'],
        '舒适型': ['舒适型'],
        '高档型': ['高档型'],
        '经济': ['经济型'],
        '舒适': ['舒适型'],
        '高档': ['高档型'],
      };
      const types = budgetMap[budget] || [budget];
      hotels = hotels.filter(h => types.includes(h.type));
    }

    // 按评分排序
    hotels.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

    return {
      city: '石家庄赵县',
      hotels: hotels.slice(0, limit),
      total: hotels.length,
    };
  }
}
