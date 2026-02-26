import { useState, useEffect } from "react";
import type { KeyboardEvent } from "react";
import {
  Card,
  InputNumber,
  Button,
  Typography,
  Space,
  message,
  Divider,
  Row,
  Tag,
} from "antd";
import { PlusOutlined, SaveOutlined } from "@ant-design/icons";
import settingsService, { type OrgSetting } from "../../../services/settingsService";

const { Text } = Typography;
const ORG = "mec";

interface DiscountSectionProps {
  title: string;
  description: string;
  values: number[];
  onChange: (values: number[]) => void;
}

function DiscountSection({ title, description, values, onChange }: DiscountSectionProps) {
  const [inputVal, setInputVal] = useState<number | null>(null);

  function addValue() {
    if (inputVal === null) return;
    if (values.includes(inputVal)) {
      message.warning(`৳${inputVal} is already in the list`);
      return;
    }
    onChange([...values, inputVal].sort((a, b) => a - b));
    setInputVal(null);
  }

  function removeValue(v: number) {
    onChange(values.filter((x) => x !== v));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addValue();
    }
  }

  return (
    <Card title={title} style={{ marginBottom: 16 }}>
      <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        {description}
      </Text>
      <div style={{ marginBottom: 12, minHeight: 32 }}>
        {values.length === 0 ? (
          <Text type="secondary">No discount options set yet.</Text>
        ) : (
          values.map((v) => (
            <Tag
              key={v}
              closable
              onClose={() => removeValue(v)}
              color="blue"
              style={{ marginBottom: 4, fontSize: 14 }}
            >
              ৳{v}
            </Tag>
          ))
        )}
      </div>
      <Space>
        <InputNumber
          min={1}
          value={inputVal}
          onChange={(val) => setInputVal(val)}
          onKeyDown={onKeyDown}
          placeholder="Enter amount"
          prefix="৳"
          style={{ width: 160 }}
        />
        <Button icon={<PlusOutlined />} onClick={addValue}>
          Add
        </Button>
      </Space>
    </Card>
  );
}

export default function MecDiscountSettings() {
  const [tuitionDiscounts, setTuitionDiscounts] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    const rows: OrgSetting[] = await settingsService.getAllSettings(ORG);
    rows.forEach((row) => {
      const vals = (row.settingValue as { values: number[] } | null)?.values ?? [];
      if (row.settingKey === "discount_tuition_options") setTuitionDiscounts(vals);
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await settingsService.bulkUpsertSettings(ORG, [
        { key: "discount_tuition_options", value: { values: tuitionDiscounts } },
      ]);
      message.success("Discount options saved");
    } catch {
      message.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="large">
      <DiscountSection
        title="Tuition Fee Discount Options"
        description="These values appear as a dropdown on the student form. The selected discount is subtracted from the tuition fee."
        values={tuitionDiscounts}
        onChange={setTuitionDiscounts}
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
          Save Discount Options
        </Button>
      </Row>
    </Space>
  );
}
