import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Typography,
  App,
  Divider,
  Space,
  Tag,
  Tooltip,
  Alert,
} from "antd";
import {
  SaveOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import settingsService from "../../../services/settingsService";

const { Text, Paragraph } = Typography;

const ORG = "mec";
const SETTING_KEY = "payment_priority";

type PriorityItem = {
  key: string;
  label: string;
  description: string;
  color: string;
};

const ALL_ITEMS: PriorityItem[] = [
  {
    key: "tuition",
    label: "Tuition Fee",
    description: "Monthly tuition payments",
    color: "blue",
  },
  {
    key: "others",
    label: "Others",
    description: "Any additional payment types",
    color: "orange",
  },
];

const DEFAULT_ORDER = ["tuition", "others"];

function orderToItems(order: string[]): PriorityItem[] {
  return order
    .map((k) => ALL_ITEMS.find((i) => i.key === k))
    .filter(Boolean) as PriorityItem[];
}

export default function MecPaymentPrioritySettings() {
  const { message } = App.useApp();
  const [items, setItems] = useState<PriorityItem[]>(
    () => orderToItems(DEFAULT_ORDER),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadSetting();
  }, []);

  async function loadSetting() {
    try {
      const row = await settingsService.getSetting(ORG, SETTING_KEY);
      if (row?.settingValue) {
        const parsed =
          typeof row.settingValue === "string"
            ? (JSON.parse(row.settingValue) as { order: string[] })
            : (row.settingValue as { order: string[] });
        if (Array.isArray(parsed?.order)) {
          const ordered = orderToItems(parsed.order);
          const missing = ALL_ITEMS.filter(
            (i) => !ordered.find((o) => o.key === i.key),
          );
          setItems([...ordered, ...missing]);
          return;
        }
      }
    } catch {
      // Fall back to default
    }
    setItems(orderToItems(DEFAULT_ORDER));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setItems(next);
  }

  function moveDown(index: number) {
    if (index === items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setItems(next);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const order = items.map((i) => i.key);
      await settingsService.bulkUpsertSettings(ORG, [
        { key: SETTING_KEY, value: JSON.stringify({ order }) },
      ]);
      message.success("Payment priority saved");
    } catch {
      message.error("Failed to save payment priority");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Payment Priority Order">
      <Alert
        type="info"
        showIcon
        title="MEC currently uses tuition as the primary payment type. The priority order will apply if additional payment types are added in the future."
        style={{ marginBottom: 16 }}
      />
      <Paragraph type="secondary">
        When a student makes a partial payment, the system allocates the
        available amount to payment types in this priority order.
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          <InfoCircleOutlined style={{ marginRight: 4 }} />
          Use the arrows to reorder. Changes take effect for new payments only.
        </Text>
      </Paragraph>
      <Divider />
      <Space orientation="vertical" size="middle" style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, overflow: "hidden" }}>
          {items.map((item, index) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderBottom: index < items.length - 1 ? "1px solid #f0f0f0" : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#1677ff",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {index + 1}
                </div>
                <div>
                  <Space>
                    <Text strong>{item.label}</Text>
                    <Tag color={item.color} style={{ fontSize: 11 }}>
                      Priority {index + 1}
                    </Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 2 }}>
                    {item.description}
                  </Text>
                </div>
              </div>
              <Space>
                <Tooltip title="Move Up">
                  <Button
                    size="small"
                    icon={<ArrowUpOutlined />}
                    disabled={index === 0}
                    onClick={() => moveUp(index)}
                  />
                </Tooltip>
                <Tooltip title="Move Down">
                  <Button
                    size="small"
                    icon={<ArrowDownOutlined />}
                    disabled={index === items.length - 1}
                    onClick={() => moveDown(index)}
                  />
                </Tooltip>
              </Space>
            </div>
          ))}
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
        >
          Save Priority Order
        </Button>
      </Space>
    </Card>
  );
}
