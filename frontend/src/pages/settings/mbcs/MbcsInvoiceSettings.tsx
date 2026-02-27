import { useState, useEffect } from "react";
import { Card, Segmented, Button, Typography, App, Divider, Space } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import settingsService from "../../../services/settingsService";

const { Text, Paragraph } = Typography;
const ORG = "mbcs";

export default function MbcsInvoiceSettings() {
  const { message } = App.useApp();
  const [mode, setMode] = useState<string>("dual");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadSetting();
  }, []);

  async function loadSetting() {
    const row = await settingsService.getSetting(ORG, "invoice_mode");
    if (row) {
      const val = (row as { settingValue?: string } | null)?.settingValue;
      if (val === "unified" || val === "dual") setMode(val);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await settingsService.bulkUpsertSettings(ORG, [
        { key: "invoice_mode", value: mode },
      ]);
      message.success("Invoice mode saved");
    } catch {
      message.error("Failed to save invoice mode");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Invoice Mode">
      <Paragraph type="secondary">
        Choose how payment receipts are generated for <strong>MBCS</strong> students.
      </Paragraph>
      <Divider />
      <Space direction="vertical" size="large">
        <div>
          <Text strong style={{ display: "block", marginBottom: 8 }}>
            Invoice Copy Mode
          </Text>
          <Segmented
            value={mode}
            onChange={(val) => setMode(val as string)}
            options={[
              {
                label: (
                  <div style={{ padding: "4px 8px" }}>
                    <div style={{ fontWeight: 600 }}>Dual Copy</div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      Guardian Copy (full fee) + Office Copy (discounted fee)
                    </div>
                  </div>
                ),
                value: "dual",
              },
              {
                label: (
                  <div style={{ padding: "4px 8px" }}>
                    <div style={{ fontWeight: 600 }}>Unified Copy</div>
                    <div style={{ fontSize: 11, color: "#888" }}>
                      Single copy showing the actual paid amount
                    </div>
                  </div>
                ),
                value: "unified",
              },
            ]}
          />
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
        >
          Save
        </Button>
      </Space>
    </Card>
  );
}
