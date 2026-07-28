import { Fragment } from 'react';

/**
 * 轻量级 Markdown 渲染组件
 *
 * 支持：标题 / 加粗 / 代码 / 表格 / 列表 / 引用 / 图片 / 链接 / 【关键词】
 */
interface Props {
  text: string;
}

// 行内样式匹配器
function parseInline(text: string, keyPrefix = ''): (string | JSX.Element)[] | string {
  const parts: (string | JSX.Element)[] = [];
  const regex = /(!\[.*?\]\(.*?\))|(\[.*?\]\(.*?\))|(\*\*(.+?)\*\*)|(`(.+?)`)|(【(.+?)】)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      const inner = match[1].match(/!\[(.*?)\]\((.*?)\)/);
      if (inner) {
        parts.push(
          <img
            key={`${keyPrefix}img${idx++}`}
            src={inner[2]}
            alt={inner[1]}
            loading="lazy"
            className="markdown-image"
          />,
        );
      }
    } else if (match[2]) {
      const inner = match[2].match(/\[(.*?)\]\((.*?)\)/);
      if (inner) {
        parts.push(
          <a key={`${keyPrefix}a${idx++}`} href={inner[2]} target="_blank" rel="noopener noreferrer">
            {inner[1]}
          </a>,
        );
      }
    } else if (match[3]) {
      parts.push(
        <strong key={`${keyPrefix}b${idx++}`}>{match[4]}</strong>,
      );
    } else if (match[5]) {
      parts.push(
        <code key={`${keyPrefix}c${idx++}`}>{match[6]}</code>,
      );
    } else if (match[7]) {
      parts.push(
        <span key={`${keyPrefix}k${idx++}`} className="tag-keyword">
          {match[7]}
        </span>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s:-]+\|/.test(line) && line.includes('---');
}

function parseTableLines(lines: string[]): JSX.Element | null {
  const dataLines = lines.filter(l => !isTableSeparator(l.trim()));
  if (dataLines.length < 1) return null;

  const rows = dataLines.map(line =>
    line.split('|').map(c => c.trim()).filter(c => c !== ''),
  );
  if (rows.length === 0) return null;

  const headers = rows[0];
  const body = rows.slice(1);

  return (
    <div className="markdown-table-wrapper" key={`table-${lines[0]?.slice(0, 30) || 'unknown'}`}>
      <table className="markdown-table">
        <thead>
          <tr>{headers.map((h, i) => <th key={i}>{parseInline(h, `th${i}`)}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{parseInline(cell, `td${ri}-${ci}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MarkdownRenderer({ text }: Props) {
  if (!text) return null;

  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const elements: JSX.Element[] = [];
  let idx = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    // 水平分割线
    if (/^-{3,}$/.test(line.trim())) {
      elements.push(<hr key={`hr${idx++}`} className="markdown-hr" />);
      i++;
      continue;
    }

    // 标题
    const headerMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const Tag = level <= 2 ? 'h3' : level === 3 ? 'h4' : 'h5';
      elements.push(
        <Tag key={`h${idx++}`} className={`markdown-h${level}`}>
          {parseInline(headerMatch[2], `h${idx}`)}
        </Tag>,
      );
      i++;
      continue;
    }

    // 引用
    if (line.trimStart().startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('> ')) {
        quoteLines.push(lines[i].trimStart().slice(2));
        i++;
      }
      elements.push(
        <blockquote key={`q${idx++}`} className="markdown-blockquote">
          {quoteLines.map((ql, qi) => (
            <Fragment key={qi}>
              {parseInline(ql, `ql${qi}`)}
              {qi < quoteLines.length - 1 && <br />}
            </Fragment>
          ))}
        </blockquote>,
      );
      continue;
    }

    // 无序列表
    if (line.trimStart().startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('- ')) {
        items.push(lines[i].trimStart().slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul${idx++}`} className="markdown-ul">
          {items.map((item, ii) => (
            <li key={ii}>{parseInline(item, `li${ii}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // 有序列表
    if (/^\d+\.\s/.test(line.trimStart())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trimStart())) {
        items.push(lines[i].trimStart().replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol${idx++}`} className="markdown-ol">
          {items.map((item, ii) => (
            <li key={ii}>{parseInline(item, `oli${ii}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // 表格
    if (line.trimStart().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseTableLines(tableLines);
      if (table) {
        elements.push(table);
      } else {
        tableLines.forEach((tl, ti) => {
          elements.push(
            <p key={`p${idx++}`} className="markdown-p">
              {parseInline(tl, `np${ti}`)}
            </p>,
          );
        });
      }
      continue;
    }

    // 普通段落
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      const nextLine = lines[i];
      if (/^#{1,4}\s/.test(nextLine) || /^-{3,}$/.test(nextLine)
        || nextLine.trimStart().startsWith('> ')
        || nextLine.trimStart().startsWith('- ')
        || /^\d+\.\s/.test(nextLine.trimStart())) {
        break;
      }
      if (nextLine.trimStart().startsWith('|')) break;
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      elements.push(
        <p key={`p${idx++}`} className="markdown-p">
          {paraLines.map((pl, pi) => (
            <Fragment key={pi}>
              {parseInline(pl, `pl${pi}`)}
              {pi < paraLines.length - 1 && <br />}
            </Fragment>
          ))}
        </p>,
      );
    } else {
      i++;
    }
  }

  return <div className="markdown-body">{elements}</div>;
}
