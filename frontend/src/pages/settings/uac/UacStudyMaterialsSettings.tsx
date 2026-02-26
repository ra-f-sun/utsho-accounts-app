import { useState, useEffect } from "react";
import {
  Card,
  Input,
  InputNumber,
  Button,
  Row,
  Col,
  Typography,
  Space,
  message,
  Divider,
  Empty,
} from "antd";
import { PlusOutlined, DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import settingsService, { type OrgSetting } from "../../../services/settingsService";

const { Text } = Typography;
const ORG = "uac";
const KEY = "study_materials";

interface StudyMaterial {
  name: string;
  price: number | null;
}

export default function UacStudyMaterialsSettings() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    const row: OrgSetting | null = await settingsService.getSetting(ORG, KEY);
    if (row) {
      const items = (row.settingValue as { items: StudyMaterial[] } | null)?.items ?? [];
      setMaterials(items);
    }
  }

  function addMaterial() {
    setMaterials((prev) => [...prev, { name: "", price: null }]);
  }

  function removeMaterial(index: number) {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMaterial(index: number, field: keyof StudyMaterial, value: string | number | null) {
    setMaterials((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  }

  async function handleSave() {
    const invalid = materials.some((m) => !m.name.trim() || m.price === null);
    if (invalid) {
      message.warning("All materials must have a name and price");
      return;
    }
    setSaving(true);
    try {
      await settingsService.bulkUpsertSettings(ORG, [
        { key: KEY, value: { items: materials } },
      ]);
      message.success("Study materials saved");
    } catch {
      message.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="large">
      <Card
        title="Study Materials List"
        extra={
          <Button icon={<PlusOutlined />} onClick={addMaterial}>
            Add Material
          </Button>
        }
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          These items appear as options in the payment form when "Study
          Materials" payment type is selected. The price auto-fills the amount.
        </Text>

        {materials.length === 0 ? (
          <Empty description="No materials added yet. Click 'Add Material' to start." />
        ) : (
          <Space orientation="vertical" style={{ width: "100%" }}>
            {materials.map((mat, index) => (
              <Row key={index} gutter={12} align="middle">
                <Col flex="40px">
                  <Text type="secondary" style={{ fontWeight: 600 }}>
                    #{index + 1}
                  </Text>
                </Col>
                <Col flex="1">
                  <Input
                    value={mat.name}
                    onChange={(e) => updateMaterial(index, "name", e.target.value)}
                    placeholder="Material name (e.g. Guide Book)"
                  />
                </Col>
                <Col flex="160px">
                  <InputNumber
                    value={mat.price}
                    onChange={(val) => updateMaterial(index, "price", val)}
                    min={0}
                    style={{ width: "100%" }}
                    placeholder="Price (৳)"
                    prefix="৳"
                  />
                </Col>
                <Col flex="40px">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeMaterial(index)}
                  />
                </Col>
              </Row>
            ))}
          </Space>
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
          Save Study Materials
        </Button>
      </Row>
    </Space>
  );
}
