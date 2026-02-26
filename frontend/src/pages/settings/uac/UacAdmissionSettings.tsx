import { useState, useEffect } from "react";
import {
  Card,
  InputNumber,
  Button,
  Row,
  Col,
  Typography,
  Space,
  message,
  Divider,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import settingsService, { type OrgSetting } from "../../../services/settingsService";
import { UAC_CLASSES } from "../../../constants/uacClasses";

const { Text } = Typography;
const ORG = "uac";

export default function UacAdmissionSettings() {
  const [admissionDefault, setAdmissionDefault] = useState<number | null>(null);
  const [admissionOverrides, setAdmissionOverrides] = useState<Record<number, number | null>>({});
  const [readmissionDefault, setReadmissionDefault] = useState<number | null>(null);
  const [readmissionOverrides, setReadmissionOverrides] = useState<Record<number, number | null>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    const rows: OrgSetting[] = await settingsService.getAllSettings(ORG);
    rows.forEach((row) => {
      const val = (row.settingValue as { value: number } | null)?.value ?? null;
      if (row.settingKey === "admission_default") {
        setAdmissionDefault(val);
      } else if (row.settingKey.startsWith("admission_override_")) {
        const cls = Number(row.settingKey.replace("admission_override_", ""));
        setAdmissionOverrides((prev) => ({ ...prev, [cls]: val }));
      } else if (row.settingKey === "readmission_default") {
        setReadmissionDefault(val);
      } else if (row.settingKey.startsWith("readmission_override_")) {
        const cls = Number(row.settingKey.replace("readmission_override_", ""));
        setReadmissionOverrides((prev) => ({ ...prev, [cls]: val }));
      }
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const settings: Array<{ key: string; value: unknown }> = [];

      if (admissionDefault !== null) {
        settings.push({ key: "admission_default", value: { value: admissionDefault } });
      }
      UAC_CLASSES.forEach(({ value: cls }) => {
        const ov = admissionOverrides[cls];
        if (ov !== null && ov !== undefined) {
          settings.push({ key: `admission_override_${cls}`, value: { value: ov } });
        }
      });
      if (readmissionDefault !== null) {
        settings.push({ key: "readmission_default", value: { value: readmissionDefault } });
      }
      UAC_CLASSES.forEach(({ value: cls }) => {
        const ov = readmissionOverrides[cls];
        if (ov !== null && ov !== undefined) {
          settings.push({ key: `readmission_override_${cls}`, value: { value: ov } });
        }
      });

      await settingsService.bulkUpsertSettings(ORG, settings);
      message.success("Admission settings saved");
    } catch {
      message.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const renderClassOverrides = (
    overrides: Record<number, number | null>,
    setOverrides: React.Dispatch<React.SetStateAction<Record<number, number | null>>>,
    defaultVal: number | null,
  ) => (
    <Row gutter={[16, 16]}>
      {UAC_CLASSES.map(({ value: cls, label }) => (
        <Col span={8} key={cls}>
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Text strong>{label}</Text>
            <InputNumber
              min={0}
              value={overrides[cls] ?? null}
              onChange={(val) =>
                setOverrides((prev) => ({ ...prev, [cls]: val }))
              }
              style={{ width: "100%" }}
              placeholder={`Default (৳${defaultVal ?? "—"})`}
              prefix="৳"
            />
          </Space>
        </Col>
      ))}
    </Row>
  );

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="large">
      <Card title="Admission Fee">
        <Row align="middle" gutter={16} style={{ marginBottom: 24 }}>
          <Col>
            <Text>Default Admission Fee for All Classes (৳)</Text>
          </Col>
          <Col>
            <InputNumber
              min={0}
              value={admissionDefault}
              onChange={(val) => setAdmissionDefault(val)}
              style={{ width: 160 }}
              placeholder="e.g. 5000"
              prefix="৳"
            />
          </Col>
        </Row>
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          Per-class overrides — leave blank to use the default.
        </Text>
        {renderClassOverrides(admissionOverrides, setAdmissionOverrides, admissionDefault)}
      </Card>

      <Card title="Re-Admission Fee">
        <Row align="middle" gutter={16} style={{ marginBottom: 24 }}>
          <Col>
            <Text>Default Re-Admission Fee for All Classes (৳)</Text>
          </Col>
          <Col>
            <InputNumber
              min={0}
              value={readmissionDefault}
              onChange={(val) => setReadmissionDefault(val)}
              style={{ width: 160 }}
              placeholder="e.g. 3000"
              prefix="৳"
            />
          </Col>
        </Row>
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          Per-class overrides — leave blank to use the default.
        </Text>
        {renderClassOverrides(readmissionOverrides, setReadmissionOverrides, readmissionDefault)}
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
          Save Admission Settings
        </Button>
      </Row>
    </Space>
  );
}
