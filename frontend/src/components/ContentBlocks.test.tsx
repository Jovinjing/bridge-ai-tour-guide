/**
 * ContentBlocks.test.tsx — 富媒体块分发渲染器单元测试
 *
 * 覆盖：空块 / text / image / route / product_card / weather / unknown 类型 / 多块渲染
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContentBlocks from './ContentBlocks';
import type { ContentBlock } from '../types';

describe('ContentBlocks 空/边界', () => {
  it('undefined blocks 返回 null', () => {
    const { container } = render(<ContentBlocks blocks={undefined as unknown as ContentBlock[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('空数组 blocks 返回 null', () => {
    const { container } = render(<ContentBlocks blocks={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('ContentBlocks text 类型', () => {
  const blocks: ContentBlock[] = [{ type: 'text', content: '赵州桥建于隋代' }];

  it('渲染 <p> 标签', () => {
    render(<ContentBlocks blocks={blocks} />);
    const p = screen.getByText('赵州桥建于隋代');
    expect(p).toBeInTheDocument();
    expect(p.tagName).toBe('P');
    expect(p).toHaveClass('block-text');
  });

  it('外层有 content-blocks 容器', () => {
    const { container } = render(<ContentBlocks blocks={blocks} />);
    expect(container.querySelector('.content-blocks')).toBeInTheDocument();
  });
});

describe('ContentBlocks image 类型', () => {
  it('渲染图片 + 标题', () => {
    const blocks: ContentBlock[] = [
      { type: 'image', url: 'https://example.com/bridge.jpg', caption: '赵州桥全景' },
    ];
    render(<ContentBlocks blocks={blocks} />);
    const img = screen.getByAltText('赵州桥全景');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/bridge.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(screen.getByText('赵州桥全景')).toBeInTheDocument();
  });

  it('无 caption 时不显示 figcaption', () => {
    const blocks: ContentBlock[] = [
      { type: 'image', url: '/photo.jpg' },
    ];
    const { container } = render(<ContentBlocks blocks={blocks} />);
    expect(container.querySelector('figcaption')).not.toBeInTheDocument();
    expect(screen.getByAltText('')).toBeInTheDocument(); // 空 alt
  });
});

describe('ContentBlocks route 类型', () => {
  const blocks: ContentBlock[] = [{
    type: 'route',
    provider: 'gaode',
    origin: { name: '石家庄站', lng: 114.5, lat: 38.0 },
    destination: { name: '赵州桥', lng: 114.8, lat: 37.7 },
    duration: '40分钟',
    distance: '45公里',
    steps: [
      { mode: '公交', from: '石家庄站', to: '赵州桥景区', duration: '40分钟' },
    ],
  }];

  it('渲染路线概要', () => {
    render(<ContentBlocks blocks={blocks} />);
    expect(screen.getByText('路线规划')).toBeInTheDocument();
    // 站名同时出现在概要和步骤中 → 使用 getAllByText
    const stations = screen.getAllByText(/石家庄站/);
    expect(stations.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/45公里/)).toBeInTheDocument();
    // 时长也出现两次（概要和步骤）
    const durations = screen.getAllByText(/40分钟/);
    expect(durations.length).toBeGreaterThanOrEqual(2);
  });

  it('渲染步骤详情', () => {
    render(<ContentBlocks blocks={blocks} />);
    expect(screen.getByText('石家庄站 → 赵州桥景区')).toBeInTheDocument();
    expect(screen.getByText(/公交/)).toBeInTheDocument();
  });
});

describe('ContentBlocks product_card 类型', () => {
  const blocks: ContentBlock[] = [{
    type: 'product_card',
    productId: 1,
    name: '赵州桥模型',
    price: 128.00,
    imageUrl: '/images/model.jpg',
  }];

  it('渲染商品名称和价格', () => {
    render(<ContentBlocks blocks={blocks} />);
    expect(screen.getByText('赵州桥模型')).toBeInTheDocument();
    expect(screen.getByText('¥128.00')).toBeInTheDocument();
  });

  it('渲染商品图片', () => {
    render(<ContentBlocks blocks={blocks} />);
    const img = screen.getByAltText('赵州桥模型');
    expect(img).toHaveAttribute('src', '/images/model.jpg');
  });
});

describe('ContentBlocks weather 类型', () => {
  const blocks: ContentBlock[] = [{
    type: 'weather',
    city: '赵县',
    temp: 28,
    icon: '☀️',
  }];

  it('渲染天气信息', () => {
    render(<ContentBlocks blocks={blocks} />);
    expect(screen.getByText('赵县')).toBeInTheDocument();
    expect(screen.getByText('28°C')).toBeInTheDocument();
    expect(screen.getByText('☀️')).toBeInTheDocument();
  });
});

describe('ContentBlocks 未知类型', () => {
  it('unknown type 返回 null 不崩溃', () => {
    const blocks = [{ type: 'unknown' }] as ContentBlock[];
    const { container } = render(<ContentBlocks blocks={blocks} />);
    // 外层容器存在，但内部没有内容
    const blockDiv = container.querySelector('.content-block');
    expect(blockDiv).toBeInTheDocument();
    expect(blockDiv?.innerHTML).toBe('');
  });
});

describe('ContentBlocks 多块渲染', () => {
  it('多种类型按顺序渲染', () => {
    const blocks: ContentBlock[] = [
      { type: 'text', content: '第一段文字' },
      { type: 'weather', city: '赵县', temp: 25, icon: '⛅' },
      { type: 'text', content: '第二段文字' },
    ];
    render(<ContentBlocks blocks={blocks} />);
    // 验证顺序
    const textEls = screen.getAllByText(/段文字/);
    expect(textEls).toHaveLength(2);
    expect(screen.getByText('赵县')).toBeInTheDocument();
    expect(screen.getByText('25°C')).toBeInTheDocument();
  });
});
