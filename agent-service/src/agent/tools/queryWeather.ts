/**
 * 天气查询工具
 *
 * 查询赵州桥所在地（河北石家庄赵县）的天气信息。
 * 一期返回静态提示（需配置和风天气 API Key），
 * 二期对接和风天气 REST API。
 *
 * 和风天气 API：https://dev.qweather.com/docs/api/
 */
import { ToolAdapter } from './adapter';

interface WeatherParams {
  city?: string;     // 城市，默认石家庄
  days?: number;     // 预报天数，1-3
}

interface WeatherResult {
  city: string;
  updateTime: string;
  forecasts: Array<{
    date: string;
    tempMax: string;
    tempMin: string;
    weather: string;
    wind: string;
    humidity: string;
    suggestion: string;
  }>;
}

const QWEATHER_API_KEY = process.env.QWEATHER_API_KEY || '';
// 赵县 LocationID（和风天气）
const ZHAOXIAN_LOCATION_ID = '101090101';

export class QweatherAdapter implements ToolAdapter<WeatherParams, WeatherResult> {
  name = 'queryWeather';

  async execute(params: WeatherParams): Promise<WeatherResult> {
    const { city = '石家庄', days = 3 } = params;
    const now = new Date();

    if (!QWEATHER_API_KEY) {
      return {
        city,
        updateTime: now.toISOString(),
        forecasts: [
          {
            date: now.toISOString().slice(0, 10),
            tempMax: '32°C',
            tempMin: '22°C',
            weather: '天气 API 未配置（请设置 QWEATHER_API_KEY）',
            wind: '微风',
            humidity: '55%',
            suggestion: '春秋两季（3-5月、9-11月）是游览赵州桥的最佳季节，气候宜人。夏季注意防晒防暑，冬季注意保暖。具体天气请查看天气预报 App。',
          },
        ],
      };
    }

    try {
      // 和风天气 3 天预报 API
      const url = new URL('https://devapi.qweather.com/v7/weather/3d');
      url.searchParams.set('location', ZHAOXIAN_LOCATION_ID);
      url.searchParams.set('key', QWEATHER_API_KEY);

      const response = await fetch(url.toString());
      const data = await response.json() as any;

      if (data.code !== '200') {
        return { city, updateTime: now.toISOString(), forecasts: [] };
      }

      return {
        city,
        updateTime: data.updateTime || now.toISOString(),
        forecasts: data.daily?.slice(0, days).map((d: any) => ({
          date: d.fxDate,
          tempMax: `${d.tempMax}°C`,
          tempMin: `${d.tempMin}°C`,
          weather: `${d.textDay} / ${d.textNight}`,
          wind: `${d.windDirDay} ${d.windScaleDay}级`,
          humidity: `${d.humidity || '-'}%`,
          suggestion: suggestByWeather(d.textDay),
        })) || [],
      };
    } catch (err: any) {
      return {
        city,
        updateTime: now.toISOString(),
        forecasts: [
          {
            date: now.toISOString().slice(0, 10),
            tempMax: '-',
            tempMin: '-',
            weather: `查询失败: ${err.message}`,
            wind: '-',
            humidity: '-',
            suggestion: '春秋两季（3-5月、9-11月）是游览赵州桥的最佳季节。',
          },
        ],
      };
    }
  }
}

/** 根据天气状况给出游览建议 */
function suggestByWeather(dayWeather: string): string {
  const w = dayWeather || '';
  if (w.includes('晴')) return '今天天气晴好，非常适合游览赵州桥！建议带上相机，栏板和望柱的雕刻在阳光下更加精美。';
  if (w.includes('多云') || w.includes('阴')) return '多云天气，适合户外游览。赵州桥的石刻在柔和光线下别有韵味。';
  if (w.includes('雨')) return '雨天游览请注意防滑，桥面石板可能较湿滑。建议穿防滑鞋，也可在游客中心参观桥模。';
  if (w.includes('雪')) return '雪中赵州桥别有韵味，"初月出云，长虹饮涧"的意境更加凸显。注意保暖和防滑。';
  return '春秋两季（3-5月、9-11月）是游览赵州桥的最佳季节，气候宜人。';
}
