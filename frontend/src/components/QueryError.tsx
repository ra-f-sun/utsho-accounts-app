import { Result, Button } from "antd";

interface Props {
  error: Error | null;
  onRetry?: () => void;
}

export default function QueryError({ error, onRetry }: Props) {
  return (
    <Result
      status="error"
      title="Failed to load data"
      subTitle={error?.message || "An unexpected error occurred"}
      extra={onRetry && <Button onClick={onRetry}>Try Again</Button>}
    />
  );
}
