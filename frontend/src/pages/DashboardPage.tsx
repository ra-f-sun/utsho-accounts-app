import { Typography } from "antd";
import { useAuthStore } from "../stores/authStore";

const { Title, Paragraph } = Typography;

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <Title level={2}>Welcome, {user?.fullName}!</Title>
      <Paragraph>
        Role: <strong>{user?.role?.replace("_", " ")}</strong>
      </Paragraph>
      <Paragraph>
        Email: <strong>{user?.email}</strong>
      </Paragraph>
      <Paragraph type="secondary">
        This is your dashboard. Use the sidebar to navigate through the system.
      </Paragraph>
    </div>
  );
}
