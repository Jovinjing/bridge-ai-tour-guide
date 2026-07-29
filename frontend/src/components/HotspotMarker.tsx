import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  position: THREE.Vector3;
  name: string;
  color: string;
  isActive: boolean;
  onClick: () => void;
}

/**
 * 3D 全景热点标记 — 脉冲动画 + 光晕环
 *
 * 在 360° 全景球体内表面指定位置放置一个带脉冲动画的标记点。
 * 使用 useFrame 驱动 3D 网格实现呼吸缩放效果，适配 VR/WebGL 渲染环境。
 */
export default function HotspotMarker({ position, name, color, isActive, onClick }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    // 脉冲缩放动画：基于时钟实现呼吸效果
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.5) * 0.2;
    meshRef.current.scale.setScalar(pulse);
    if (ringRef.current) {
      ringRef.current.scale.setScalar(pulse * 1.6);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.3 + Math.sin(state.clock.elapsedTime * 2.5) * 0.15;
    }
  });

  return (
    <group>
      {/* 外圈光晕（脉冲） */}
      <mesh ref={ringRef} position={position}>
        <sphereGeometry args={[0.45, 20, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>

      {/* 核心标记点 */}
      <mesh
        ref={meshRef}
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[0.25, 20, 20]} />
        <meshBasicMaterial color={isActive ? '#FFFFFF' : color} />
      </mesh>

      {/* 名称标签 */}
      <Html
        distanceFactor={3.5}
        position={position}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          style={{
            background: isActive ? color : 'rgba(0,0,0,0.75)',
            color: '#fff',
            padding: '14px 28px',
            borderRadius: '20px',
            fontSize: '44px',
            fontWeight: isActive ? 800 : 700,
            whiteSpace: 'nowrap',
            pointerEvents: 'auto',
            cursor: 'pointer',
            transform: 'translateY(-70px)',
            backdropFilter: 'blur(6px)',
            boxShadow: isActive ? `0 0 20px ${color}88` : '0 2px 10px rgba(0,0,0,0.5)',
            border: isActive ? `3px solid ${color}` : '2px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease',
            textShadow: '0 2px 6px rgba(0,0,0,0.8)',
          }}
        >
          {isActive ? '📍 ' : '🔗 '}{name}
        </div>
      </Html>
    </group>
  );
}
