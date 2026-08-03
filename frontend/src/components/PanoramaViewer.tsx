import { useRef, Suspense } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import HotspotMarker from './HotspotMarker';
import HOTSPOTS, { sphericalToCartesian } from '../constants/hotspots';
import type { Hotspot } from '../types';

// 全景图路径
const PANORAMA_PATH = '/panoramas/panorama.png';

interface Props {
  activeHotspotId: string | null;
  onHotspotClick: (hotspot: Hotspot) => void;
}

/**
 * 全景球体
 */
function PanoramaSphere() {
  const texture = useLoader(THREE.TextureLoader, PANORAMA_PATH);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return (
    <mesh rotation={[0, 0, 0]}>
      <sphereGeometry args={[10, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

/**
 * 全景查看器
 */
export default function PanoramaViewer({ activeHotspotId, onHotspotClick }: Props) {
  const controlsRef = useRef<any>(null);

  return (
    <>
      <Suspense fallback={null}>
        <PanoramaSphere />
      </Suspense>

      {HOTSPOTS.map((hp) => {
        const pos = sphericalToCartesian(hp.theta, hp.phi, 9.8);
        return (
          <HotspotMarker
            key={hp.id}
            position={pos}
            name={hp.name}
            color={hp.color}
            isActive={hp.id === activeHotspotId}
            onClick={() => onHotspotClick(hp as unknown as Hotspot)}
          />
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enableZoom={true}
        enablePan={false}
        rotateSpeed={0.4}
        zoomSpeed={0.6}
        minDistance={0.5}
        maxDistance={5}
        target={[0, 0, 0]}
      />
    </>
  );
}
