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
import { api } from "../../../lib/axios";

const { Text } = Typography;
const ORG = "mec";

export default function MecTuitionSettings() {
  const [defaultFee, setDefaultFee] = useState<number | null>(null);
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
      }
    });
  }

  async function handleSave() {
    if (defaultFee === null) {
      message.warning("Please enter a default tuition fee");
      return;
    }
    setSaving(true);
    try {
      await settingsService.bulkUpsertSettings(ORG, [
        { key: "tuition_default", value: { value: defaultFee } },
      ]);
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
      await api.post("/mec/students/sync-fees-from-settings");
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
            <Tooltip title="Applied to all MEC students as the default monthly tuition fee">
              <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
            </Tooltip>
          </Space>
        }
      >
        <Row align="middle" gutter={16}>
          <Col>
            <Text>Default Monthly Tuition Fee (৳)</Text>
          </Col>
          <Col>
            <InputNumber
              min={0}
              value={defaultFee}
              onChange={(val) => setDefaultFee(val)}
              style={{ width: 160 }}
              placeholder="e.g. 2500"
              prefix="৳"
            />
          </Col>
        </Row>
      </Card>

      <Divider />

      <Row justify="space-between" align="middle">
        <Col>
          <Tooltip title="Updates monthlyTuitionFee on all currently active MEC students to the default fee above">
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
