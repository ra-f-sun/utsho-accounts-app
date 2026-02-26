import { Tabs, Typography } from "antd";
import {
  BankOutlined,
  HomeOutlined,
  BookOutlined,
  SettingOutlined,
} from "@ant-design/icons";

const { Title } = Typography;
import MbcsSettings from "./mbcs/MbcsSettings";
import UacSettings from "./uac/UacSettings";
import MecSettings from "./mec/MecSettings";

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
