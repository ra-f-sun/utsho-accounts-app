import { Tabs, Typography, Card } from "antd";
import {
  SettingOutlined,
  BankOutlined,
  HomeOutlined,
  BookOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

/** Placeholder component — Feature 2 will populate UAC settings */
function UacSettings() {
  return (
    <Card>
      <div style={{ textAlign: "center", padding: "48px 0", color: "#8c8c8c" }}>
        <BankOutlined style={{ fontSize: 48, marginBottom: 16, display: "block" }} />
        <Title level={4} style={{ color: "#8c8c8c" }}>
          UAC Configuration
        </Title>
        <Text type="secondary">
          Tuition, Admission, Study Materials and Discount settings for UAC
          will be configured here (Feature 3).
        </Text>
      </div>
    </Card>
  );
}

/** Placeholder component — Feature 2 will populate MBCS settings */
function MbcsSettings() {
  return (
    <Card>
      <div style={{ textAlign: "center", padding: "48px 0", color: "#8c8c8c" }}>
        <HomeOutlined style={{ fontSize: 48, marginBottom: 16, display: "block" }} />
        <Title level={4} style={{ color: "#8c8c8c" }}>
          MBCS Configuration
        </Title>
        <Text type="secondary">
          Tuition, Admission, Study Materials and Discount settings for MBCS
          will be configured here (Feature 2).
        </Text>
      </div>
    </Card>
  );
}

/** Placeholder component — Feature 3 will populate MEC settings */
function MecSettings() {
  return (
    <Card>
      <div style={{ textAlign: "center", padding: "48px 0", color: "#8c8c8c" }}>
        <BookOutlined style={{ fontSize: 48, marginBottom: 16, display: "block" }} />
        <Title level={4} style={{ color: "#8c8c8c" }}>
          MEC Configuration
        </Title>
        <Text type="secondary">
          Tuition and Discount settings for MEC will be configured here (Feature 3).
        </Text>
      </div>
    </Card>
  );
}

const tabItems = [
  {
    key: "uac",
    label: (
      <span>
        <BankOutlined />
        Configure UAC
      </span>
    ),
    children: <UacSettings />,
  },
  {
    key: "mbcs",
    label: (
      <span>
        <HomeOutlined />
        Configure MBCS
      </span>
    ),
    children: <MbcsSettings />,
  },
  {
    key: "mec",
    label: (
      <span>
        <BookOutlined />
        Configure MEC
      </span>
    ),
    children: <MecSettings />,
  },
];

export default function SettingsPage() {
  return (
    <>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <SettingOutlined style={{ fontSize: 24, color: "#667eea" }} />
        <Title level={3} style={{ margin: 0 }}>
          Settings
        </Title>
      </div>
      <Tabs
        type="card"
        size="large"
        defaultActiveKey="uac"
        items={tabItems}
        style={{ background: "#fff" }}
      />
    </>
  );
}
