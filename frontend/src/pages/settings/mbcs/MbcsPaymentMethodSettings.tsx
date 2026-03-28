import { useState, useEffect } from "react";
import {
  Card,
  Checkbox,
  Button,
  Typography,
  Row,
  Divider,
  message,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import settingsService from "../../../services/settingsService";
import { ALL_PAYMENT_METHODS } from "../../../constants/paymentMethods";

const { Text } = Typography;
const ORG = "mbcs";
const SETTING_KEY = "payment_methods";

const CHECKBOX_OPTIONS = ALL_PAYMENT_METHODS.map((m) => ({
  label: m.label,
  value: m.value,
}));

const DEFAULT_VALUES = ALL_PAYMENT_METHODS.map((m) => m.value);

export default function MbcsPaymentMethodSettings() {
  const [enabled, setEnabled] = useState<string[]>(DEFAULT_VALUES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    const row = await settingsService.getSetting(ORG, SETTING_KEY);
    const vals = (row?.settingValue as { values?: string[] } | null)?.values;
    if (Array.isArray(vals) && vals.length > 0) {
      setEnabled(vals);
    }
  }

  async function handleSave() {
    if (enabled.length === 0) {
      void message.warning("At least one payment method must be enabled.");
      return;
    }
    setSaving(true);
    try {
      await settingsService.bulkUpsertSettings(ORG, [
        { key: SETTING_KEY, value: { values: enabled } },
      ]);
      void message.success("Payment methods saved");
    } catch {
      void message.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Enabled Payment Methods">
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        Select which payment methods are available on MBCS payment and payroll
        forms. At least one method must be enabled.
      </Text>
      <Checkbox.Group
        options={CHECKBOX_OPTIONS}
        value={enabled}
        onChange={(vals) => setEnabled(vals as string[])}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      />
      <Divider />
      <Row justify="end">
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          size="large"
        >
          Save Payment Methods
        </Button>
      </Row>
    </Card>
  );
}
