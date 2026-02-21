import { Empty, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";

interface EmptyStateProps {
  description?: string;
  actionText?: string;
  onAction?: () => void;
  image?: React.ReactNode;
}

export default function EmptyState({
  description = "No data available",
  actionText,
  onAction,
  image,
}: EmptyStateProps) {
  return (
    <div style={{ padding: "50px 0", textAlign: "center" }}>
      <Empty
        image={image || Empty.PRESENTED_IMAGE_SIMPLE}
        description={description}
      >
        {actionText && onAction && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onAction}>
            {actionText}
          </Button>
        )}
      </Empty>
    </div>
  );
}
