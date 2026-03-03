import { useState, useEffect } from "react";
import {
  Card,
  InputNumber,
  Button,
  Typography,
  Row,
  Col,
  message,
  Divider,
  Switch,
  Space,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import settingsService, { type OrgSetting } from "../../../services/settingsService";

const { Text, Title } = Typography;
const ORG = "mbcs";

export default function MbcsLateFeeSettings() {
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState<number>(100);
  const [dayThreshold, setDayThreshold] = useState<number>(15);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    const rows: OrgSetting[] = await settingsService.getAllSettings(ORG);
    for (const row of rows) {
      const val = (row.settingValue as { value?: number } | null)?.value;
      if (row.settingKey === "late_fee_amount") {
        setAmount(val ?? 100);
        setEnabled((val ?? 0) > 0);
      }
      if (row.settingKey === "late_fee_day_threshold") {
        setDayThreshold(val ?? 15);
      }
    }
    setLoaded(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await settingsService.bulkUpsertSettings(ORG, [
        { key: "late_fee_amount", value: { value: enabled ? amount : 0 } },
        { key: "late_fee_day_threshold", value: { value: dayThreshold } },
      ]);
      message.success("Late fee settings saved");
    } catch {
      message.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Card title="Late Fee Configuration">
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          When enabled, a late fee is automatically calculated for each unpaid
          tuition month where the current date has passed the threshold day.
        </Text>

        <Row gutter={24} align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Text strong>Enable Late Fee</Text>
          </Col>
          <Col>
            <Switch checked={enabled} onChange={setEnabled} />
          </Col>
        </Row>

        {enabled && (
          <>
            <Row gutter={24} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Title level={5} style={{ marginBottom: 8 }}>
                  Late Fee Amount
                </Title>
                <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                  The amount charged per unpaid month after the threshold day.
                </Text>
                <InputNumber
                  min={1}
                  value={amount}
                  onChange={(val) => setAmount(val ?? 100)}
                  prefix="৳"
                  style={{ width: 200 }}
                  size="large"
                />
              </Col>
              <Col span={12}>
                <Title level={5} style={{ marginBottom: 8 }}>
                  Day Threshold
                </Title>
                <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                  Late fee applies if tuition is unpaid after this day of each
                  month (e.g., after the 15th).
                </Text>
                <InputNumber
                  min={1}
                  max={28}
                  value={dayThreshold}
                  onChange={(val) => setDayThreshold(val ?? 15)}
                  style={{ width: 200 }}
                  size="large"
                  addonAfter="of month"
                />
              </Col>
            </Row>

            <Card
              size="small"
              style={{ background: "#fffbe6", borderColor: "#ffe58f" }}
            >
              <Text>
                <strong>Example:</strong> If a student has not paid January
                tuition and today is January {dayThreshold + 1}th, a late fee of{" "}
                <strong>৳{amount}</strong> will be added to their due summary.
                One late fee per unpaid month.
              </Text>
            </Card>
          </>
        )}
      </Card>

      <Divider />

      <Row justify="end">
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          size="large"
        >
          Save Late Fee Settings
        </Button>
      </Row>
    </Space>
  );
}
