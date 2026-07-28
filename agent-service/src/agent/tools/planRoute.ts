/**
 * 高德地图路线规划工具
 *
 * 调用高德地图 REST API (v3) 进行公交/驾车/步行路线规划。
 * API Key 通过环境变量 AMAP_API_KEY 注入。
 *
 * 文档：https://lbs.amap.com/api/webservice/guide/api/direction
 */
import { ToolAdapter } from './adapter';

interface RouteParams {
  origin: string;        // 出发地地址
  destination?: string;  // 目的地，默认赵州桥
  transportMode?: 'driving' | 'transit' | 'walking';
}

interface RouteResult {
  origin: string;
  destination: string;
  transportMode: string;
  routes: Array<{
    description: string;
    duration: string;  // 预计耗时
    distance: string;  // 距离
    steps: string[];   // 关键步骤
  }>;
}

const AMAP_API_KEY = process.env.AMAP_API_KEY || '';
const ZHAOZHOU_BRIDGE_ADDRESS = '河北省石家庄市赵县赵州桥';
// 赵州桥经纬度
const ZHAOZHOU_BRIDGE_LOCATION = '114.776,37.746';

export class AmapRouteAdapter implements ToolAdapter<RouteParams, RouteResult> {
  name = 'planRoute';

  async execute(params: RouteParams): Promise<RouteResult> {
    const {
      origin,
      destination = ZHAOZHOU_BRIDGE_ADDRESS,
      transportMode = 'transit',
    } = params;

    if (!AMAP_API_KEY) {
      return {
        origin,
        destination,
        transportMode,
        routes: [{
          description: '高德地图 API Key 未配置',
          duration: '未知',
          distance: '未知',
          steps: ['请在 .env 中设置 AMAP_API_KEY 以启用路线规划功能'],
        }],
      };
    }

    try {
      const url = new URL('https://restapi.amap.com/v3/direction/transit/integrated');
      url.searchParams.set('key', AMAP_API_KEY);
      url.searchParams.set('origin', origin);
      url.searchParams.set('destination', destination);
      url.searchParams.set('city', '石家庄');
      url.searchParams.set('strategy', transportMode === 'transit' ? '0' : '0');

      const response = await fetch(url.toString());
      const data = await response.json() as any;

      if (data.status !== '1') {
        return {
          origin,
          destination,
          transportMode,
          routes: [{ description: `查询失败: ${data.info}`, duration: '未知', distance: '未知', steps: [] }],
        };
      }

      const route = data.route;
      const routes = route?.transits?.slice(0, 2).map((t: any) => ({
        description: `${t.duration} - 步行${t.walking_distance}米`,
        duration: `${Math.round(t.duration / 60)}分钟`,
        distance: `${Math.round(Number(t.distance) / 1000)}公里`,
        steps: t.segments?.map((s: any) => {
          if (s.bus?.buslines?.length) {
            const bl = s.bus.buslines[0];
            return `乘坐 ${bl.name} (${bl.departure_stop} → ${bl.arrival_stop})`;
          }
          return s.walking ? `步行 ${s.walking.distance}米` : '';
        }).filter(Boolean) || [],
      })) || [];

      return { origin, destination, transportMode, routes };
    } catch (err: any) {
      return {
        origin,
        destination,
        transportMode,
        routes: [{ description: `查询异常: ${err.message}`, duration: '未知', distance: '未知', steps: [] }],
      };
    }
  }
}
