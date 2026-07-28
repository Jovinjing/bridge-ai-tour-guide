/**
 * 全景热点配置
 *
 * theta: 水平角度（弧度），绕 Y 轴旋转
 * phi: 垂直角度（弧度），绕 X 轴旋转
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
  { id: 'main_arch',  name: '主拱',   theta: Math.PI * 1.2, phi: 0.0,  color: '#ff6b35' },
  { id: 'small_arch', name: '敞肩拱', theta: Math.PI * 0.2, phi: 0.3,  color: '#35b0ff' },
  { id: 'railing',    name: '栏板',   theta: Math.PI * 0.5, phi: 0.1,  color: '#35d0a0' },
  { id: 'pillar',     name: '梁柱',   theta: Math.PI * 1.5, phi: 0.2,  color: '#ffb035' },
  { id: 'iron_parts', name: '腰铁',   theta: Math.PI * 1.8, phi: 0.15, color: '#ff6b6b' },
  { id: 'bridge_deck',name: '桥面',   theta: Math.PI * 0.8, phi: 0.4,  color: '#a06bff' },
  { id: 'pier',       name: '桥台',   theta: Math.PI * 0.0, phi: 0.1,  color: '#4ecdc4' },
];

/**
 * 球坐标 → 笛卡尔坐标
 */
export function sphericalToCartesian(theta: number, phi: number, radius: number): THREE.Vector3 {
  return new THREE.Vector3(
    radius * Math.cos(theta) * Math.cos(phi),
    radius * Math.sin(phi),
    radius * Math.sin(theta) * Math.cos(phi),
  );
}

export default HOTSPOTS;
