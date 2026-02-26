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
  Tooltip,
} from "antd";
import { SyncOutlined, SaveOutlined, InfoCircleOutlined } from "@ant-design/icons";
import settingsService, { type OrgSetting } from "../../../services/settingsService";
import { UAC_CLASSES } from "../../../constants/uacClasses";
import { api } from "../../../lib/axios";

const { Text } = Typography;
const ORG = "uac";

export default function UacTuitionSettings() {
  const [defaultFee, setDefaultFee] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<Record<number, number | null>>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    const rows: OrgSetting[] = await settingsService.getAllSettings(ORG);
    rows.forEach((row) => {
      const val = (row.settingValue as { value: number } | null)?.value ?? null;
      if (row.settingKey === "tuition_default") {
        setDefaultFee(val);
      } else if (row.settingKey.startsWith("tuition_override_")) {
        const cls = Number(row.settingKey.replace("tuition_override_", ""));
        setOverrides((prev) => ({ ...prev, [cls]: val }));
      }
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const settings: Array<{ key: string; value: unknown }> = [];
      if (defaultFee !== null) {
        settings.push({ key: "tuition_default", value: { value: defaultFee } });
      }
      UAC_CLASSES.forEach(({ value: cls }) => {
        const override = overrides[cls];
        if (override !== null && override !== undefined) {
          settings.push({
            key: `tuition_override_${cls}`,
            value: { value: override },
          });
        }
      });
      await settingsService.bulkUpsertSettings(ORG, settings);
      message.success("Tuition settings saved");
    } catch {
      message.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncFees() {
    setSyncing(true);
    try {
      await api.post("/uac/students/sync-fees-from-settings");
      message.success("All active students' fees have been synced from settings");
    } catch {
      message.error("Failed to sync fees");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="large">
      <Card
        title={
          <Space>
            <span>Default Tuition Fee</span>
            <Tooltip title="Applied to all classes unless a per-class override is set">
              <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
            </Tooltip>
          </Space>
        }
      >
        <Row align="middle" gutter={16}>
          <Col>
            <Text>Default Monthly Tuition Fee for All Classes (৳)</Text>
          </Col>
          <Col>
            <InputNumber
              min={0}
              value={defaultFee}
              onChange={(val) => setDefaultFee(val)}
              style={{ width: 160 }}
              placeholder="e.g. 3000"
              prefix="৳"
            />
          </Col>
        </Row>
      </Card>

      <Card title="Per-Class Tuition Fee Overrides">
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          Leave blank to use the default fee for that class.
        </Text>
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
                  placeholder={`Default (৳${defaultFee ?? "—"})`}
                  prefix="৳"
                />
              </Space>
            </Col>
          ))}
        </Row>
      </Card>

      <Divider />

      <Row justify="space-between" align="middle">
        <Col>
          <Tooltip title="Updates monthlyTuitionFee on all currently active UAC students based on their class and the settings above">
            <Button
              icon={<SyncOutlined />}
              onClick={handleSyncFees}
              loading={syncing}
            >
              Sync Fees to All Active Students
            </Button>
          </Tooltip>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            size="large"
          >
            Save Tuition Settings
          </Button>
        </Col>
      </Row>
    </Space>
  );
}
