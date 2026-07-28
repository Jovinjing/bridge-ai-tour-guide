import type { ItineraryItem } from '../types';

/**
 * 赵州桥静态数据
 */

// 商品名称 → 本地图片映射
export const LOCAL_IMAGE_MAP = [
  { keywords: ['冰箱贴', '冰箱'], path: '/assets/赵州桥冰箱贴.jpg' },
  { keywords: ['印章', '李春'], path: '/assets/赵州桥印章2-李春.jpg' },
  { keywords: ['折扇'], path: '/assets/赵州桥文创折扇.jpg' },
  { keywords: ['挂件'], path: '/assets/赵州桥挂件.jpg' },
  { keywords: ['赵州桥志', '图书', '书籍', '书'], path: '/assets/赵州桥志-河北省赵县文物旅游局人民交通出版社.jpg' },
  { keywords: ['梨', '雪梨', '梨文化'], path: '/assets/梨文化-雪梨片.jpg' },
  { keywords: ['雪梨膏'], path: '/assets/梨文化-雪梨膏-赵县古树梨.jpg' },
  { keywords: ['雪梨茶'], path: '/assets/梨文化-雪梨茶.jpg' },
  { keywords: ['榫卯', '长城'], path: '/assets/长城文创-榫卯赵州桥.jpg' },
  { keywords: ['流麻'], path: '/assets/赵州桥流麻冰箱贴.jpg' },
  { keywords: ['李春修建', '修建赵州桥'], path: '/assets/【新华文轩】李春修建赵州桥-猫十三正版书籍.jpg' },
  { keywords: ['梨花', '冰淇淋'], path: '/assets/赵州桥梨花折扇冰淇淋包装图.jpg' },
  { keywords: ['流麻冰箱'], path: '/assets/赵州桥流麻冰箱贴.jpg' },
];

/**
 * 根据商品名称匹配合适的本地图片
 */
export function matchLocalImage(name: string): string | null {
  if (!name) return null;
  for (const entry of LOCAL_IMAGE_MAP) {
    if (entry.keywords.some(kw => name.includes(kw))) {
      return entry.path;
    }
  }
  return null;
}

// 行程规划初始数据
export const ITINERARY_INIT: ItineraryItem[] = [
  { id: 1, date: 'Day 1', time: '09:00', activity: '抵达赵县，入住酒店' },
  { id: 2, date: 'Day 1', time: '09:30', activity: '游览赵州桥景区，参观主拱/敞肩拱' },
  { id: 3, date: 'Day 1', time: '12:00', activity: '午餐（品尝赵县特色美食）' },
  { id: 4, date: 'Day 1', time: '14:00', activity: '参观赵州桥博物馆' },
  { id: 5, date: 'Day 1', time: '16:00', activity: '自由活动，拍照打卡' },
  { id: 6, date: 'Day 2', time: '08:00', activity: '前往柏林禅寺' },
  { id: 7, date: 'Day 2', time: '12:00', activity: '午餐，返程' },
];
