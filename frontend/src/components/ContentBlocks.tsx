/**
 * contentBlocks 富媒体块渲染器
 *
 * 按 type 分发渲染：
 * - text → 文本段落
 * - image → 图片 + 标题
 * - route → 路线规划
 * - product_card → 商品卡片
 * - weather → 天气卡片
 */
import type { ContentBlock } from '../types';

interface Props {
  blocks: ContentBlock[];
}

export default function ContentBlocks({ blocks }: Props) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="content-blocks">
      {blocks.map((block, i) => (
        <div key={i} className={`content-block content-block-${block.type}`}>
          {renderBlock(block)}
        </div>
      ))}
    </div>
  );
}

function renderBlock(block: ContentBlock): React.ReactNode {
  switch (block.type) {
    case 'text':
      return <p className="block-text">{block.content}</p>;

    case 'image':
      return (
        <figure className="block-image">
          <img src={block.url} alt={block.caption || ''} loading="lazy" />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );

    case 'route':
      return (
        <div className="block-route">
          <div className="route-summary">
            <span className="route-label">路线规划</span>
            <span className="route-detail">
              {block.origin.name} → {block.destination.name}
            </span>
            <span className="route-meta">
              {block.distance} · {block.duration}
            </span>
          </div>
          <div className="route-steps">
            {block.steps.map((step, i) => (
              <div key={i} className="route-step">
                <div className="route-step-icon">
                  {step.mode === '高铁' ? '🚄' : step.mode === '公交' ? '🚌' : '🚶'}
                </div>
                <div className="route-step-info">
                  <span className="route-step-path">{step.from} → {step.to}</span>
                  <span className="route-step-mode">{step.mode} · {step.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'product_card':
      return (
        <div className="block-product-card">
          <div className="product-card-image">
            <img src={block.imageUrl} alt={block.name} loading="lazy" />
          </div>
          <div className="product-card-info">
            <h4 className="product-card-name">{block.name}</h4>
            <span className="product-card-price">¥{block.price.toFixed(2)}</span>
          </div>
        </div>
      );

    case 'weather':
      return (
        <div className="block-weather">
          <span className="weather-city">{block.city}</span>
          <span className="weather-temp">{block.temp}°C</span>
          <span className="weather-icon">{block.icon}</span>
        </div>
      );

    default:
      return null;
  }
}
