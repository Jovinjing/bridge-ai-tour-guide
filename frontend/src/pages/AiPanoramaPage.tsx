/**
 * AI 科普页 — 全景浏览 + AI 导游聊天面板
 */
import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import PanoramaViewer from '../components/PanoramaViewer';
import AiChatPanel from '../components/AiChatPanel';
import Icon from '../components/Icon';
import config from '../config';
import type { Hotspot, User, BridgeComponent } from '../types';

interface Props {
  sessionId: string;
  user?: User | null;
}

export default function AiPanoramaPage({ sessionId, user }: Props) {
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [chatComponent, setChatComponent] = useState<BridgeComponent | null>(null);
  const [chatVisible, setChatVisible] = useState(true);
  const [showComponentList, setShowComponentList] = useState(false);
  const [chatKey, setChatKey] = useState(0);

  const handleHotspotClick = useCallback((hotspot: Hotspot) => {
    setActiveComponent(hotspot.id);
    const comp = config.COMPONENTS.find(c => c.id === hotspot.id);
    if (comp) {
      setChatComponent(comp as BridgeComponent);
    }
    setChatVisible(true);
    setChatKey(k => k + 1);
  }, []);

  const handleComponentSelect = useCallback((comp: BridgeComponent) => {
    setActiveComponent(comp.id);
    setChatComponent(comp);
    setChatVisible(true);
    setChatKey(k => k + 1);
    setShowComponentList(false);
  }, []);

  return (
    <div className="ai-panorama-page">
      {/* 全景区 */}
      <section className="panorama-section">
        <Canvas camera={{ fov: 75, position: [0, 0, 0.1] }} gl={{ antialias: true }}>
          <PanoramaViewer
            activeHotspotId={activeComponent}
            onHotspotClick={handleHotspotClick}
          />
        </Canvas>

        <div className="panorama-hint">
          <Icon name="mousePointerClick" size={14} /> 拖拽旋转 · 滚轮缩放 · 点击热点了解构件
        </div>

        {/* 构件列表弹窗 */}
        {showComponentList && (
          <div className="component-overlay">
            <div className="component-list-panel">
              <div className="component-list-header">
                <h3>赵州桥构件</h3>
                <button className="close-btn" onClick={() => setShowComponentList(false)}>
                  <Icon name="x" size={18} />
                </button>
              </div>
              <div className="component-list-grid">
                {config.COMPONENTS.map(comp => (
                  <button
                    key={comp.id}
                    className={`component-item ${activeComponent === comp.id ? 'active' : ''}`}
                    onClick={() => handleComponentSelect(comp as unknown as BridgeComponent)}
                  >
                    <span className="component-name">{comp.name}</span>
                    <span className="component-desc">{comp.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* AI 聊天面板侧栏 */}
      <aside className={`chat-section ${chatVisible ? 'chat-visible' : 'chat-hidden'}`}>
        <AiChatPanel
          sessionId={sessionId}
          initialComponent={chatComponent?.name}
          componentKey={chatKey}
          user={user}
        />
      </aside>
    </div>
  );
}
