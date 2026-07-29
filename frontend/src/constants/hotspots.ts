/**
 * 热点位置配置（从 3.0 旧项目迁移，使用十字准星工具逐个捕获）
 *
 * 全景图采用等距柱状投影，θ/φ 为归一化坐标（~0→1）。
 * 坐标通过按 C 开启工具、十字准星对准构件后按 Space 捕获。
 *
 * 注意：ID 必须与 config.ts COMPONENTS 中的 id 匹配
 */
import * as THREE from 'three';

export interface HotspotConfig {
  id: string;
  name: string;
  theta: number;
  phi: number;
  color: string;
}

const HOTSPOTS: HotspotConfig[] = [
  { id: 'pier',         name: '桥台',   theta: 0.3347, phi: 0.6016, color: '#BCAAA4' },
  { id: 'small_arch',   name: '敞肩拱', theta: 0.4035, phi: 0.6009, color: '#FF6B6B' },
  { id: 'bridge_deck',  name: '桥面',   theta: 0.4157, phi: 0.5685, color: '#8D6E63' },
  { id: 'railing',      name: '栏板',   theta: 0.5114, phi: 0.5757, color: '#4ECDC4' },
  { id: 'pillar',       name: '梁柱',   theta: 0.6730, phi: 0.5719, color: '#45B7D1' },
  { id: 'main_arch',    name: '主拱',   theta: 0.5312, phi: 0.5850, color: '#FFD700' },
  { id: 'iron_parts',   name: '腰铁',   theta: 0.6067, phi: 0.5906, color: '#78909C' },
];

/**
 * 球面坐标转笛卡尔坐标（Three.js 右手系）
 *
 * 与 3.0 旧项目算法一致，保证热点在全景图上位置匹配。
 */
export function sphericalToCartesian(theta: number, phi: number, radius: number): THREE.Vector3 {
  return new THREE.Vector3(
    radius * Math.sin(Math.PI * phi) * Math.sin(Math.PI * theta),
    radius * Math.cos(Math.PI * phi),
    radius * Math.sin(Math.PI * phi) * Math.cos(Math.PI * theta),
  );
}

export default HOTSPOTS;
