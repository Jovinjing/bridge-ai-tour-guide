import { Html } from '@react-three/drei';
import type * as THREE from 'three';

interface Props {
  position: THREE.Vector3;
  name: string;
  color: string;
  isActive: boolean;
  onClick: () => void;
}

/**
 * 3D 全景热点标记
 */
export default function HotspotMarker({ position, name, color, isActive, onClick }: Props) {
  return (
    <Html position={position} center distanceFactor={8} occlude={false}>
      <div
        className={`hotspot-marker ${isActive ? 'hotspot-active' : ''}`}
        style={{ '--hotspot-color': color } as React.CSSProperties}
        onClick={onClick}
        title={name}
      >
        <div className="hotspot-dot" />
        <div className="hotspot-pulse" />
        <span className="hotspot-label">{name}</span>
      </div>
    </Html>
  );
}
