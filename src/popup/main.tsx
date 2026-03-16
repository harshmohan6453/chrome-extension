import React from 'react';
import ReactDOM from 'react-dom/client';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import App from './App';
import './index.css';

interface PopupErrorBoundaryState {
  hasError: boolean;
}

class PopupErrorBoundary extends React.Component<React.PropsWithChildren, PopupErrorBoundaryState> {
  state: PopupErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PopupErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Popup crashed:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl border-2 border-foreground/20 bg-card p-8 text-center neo-shadow space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black tracking-tight">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                The popup hit an unexpected error. Reload it and try again on a regular website page.
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Popup
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupErrorBoundary>
      <App />
    </PopupErrorBoundary>
  </React.StrictMode>
);
