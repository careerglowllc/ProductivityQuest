import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional label shown in the fallback UI, e.g. "Finances" */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render-time errors in its subtree so a single broken page can't take down the
 * entire app to a blank/black screen (React 18 unmounts the whole tree on an uncaught
 * render error). Shows the real error message + stack instead, and offers a reload button.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-lg w-full text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-foreground">
              {this.props.label ? `${this.props.label} crashed` : "Something went wrong"}
            </h1>
            <p className="text-sm text-muted-foreground break-words">
              {this.state.error?.message ?? "Unknown error"}
            </p>
            {this.state.error?.stack && (
              <pre className="text-left text-[10px] text-muted-foreground/70 bg-muted/30 rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            )}
            <Button onClick={this.handleReload} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Reload page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
