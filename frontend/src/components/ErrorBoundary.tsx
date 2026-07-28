import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 错误边界组件
 * 捕获子组件渲染过程中的 JS 错误，防止整个应用白屏
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <div className="error-boundary-inner">
            <svg width="32" height="32" fill="none" stroke="#e53e3e" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 9v4" />
              <path d="M10.363 3.591l-8.106 13.534a1 1 0 0 0 .866 1.475h16.554a1 1 0 0 0 .866-1.475l-8.106-13.534a1 1 0 0 0-1.732 0z" />
              <path d="M12 16h.01" />
            </svg>
            <h3>页面加载异常</h3>
            <p>请刷新页面重试，若问题持续请联系管理员。</p>
            <button
              className="error-boundary-btn"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
