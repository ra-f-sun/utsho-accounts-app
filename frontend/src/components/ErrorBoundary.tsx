import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Result, Button } from "antd";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = "/dashboard";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "50px", textAlign: "center" }}>
          <Result
            status="error"
            title="Something went wrong"
            subTitle="An unexpected error occurred. Please try again."
            extra={[
              <Button type="primary" key="console" onClick={this.handleReset}>
                Go to Dashboard
              </Button>,
              <Button key="reload" onClick={() => window.location.reload()}>
                Reload Page
              </Button>,
            ]}
          />
          {import.meta.env.DEV && this.state.error && (
            <details style={{ marginTop: 20, textAlign: "left" }}>
              <summary>Error Details</summary>
              <pre style={{ color: "red", fontSize: 12 }}>
                {this.state.error.toString()}
                {"\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
