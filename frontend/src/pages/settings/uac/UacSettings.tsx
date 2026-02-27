import { Tabs } from "antd";
import UacTuitionSettings from "./UacTuitionSettings";
import UacAdmissionSettings from "./UacAdmissionSettings";
import UacStudyMaterialsSettings from "./UacStudyMaterialsSettings";
import UacDiscountSettings from "./UacDiscountSettings";
import UacInvoiceSettings from "./UacInvoiceSettings";

const tabItems = [
  {
    key: "tuition",
    label: "Tuition",
    children: <UacTuitionSettings />,
  },
  {
    key: "admission",
    label: "Admission & Re-Admission",
    children: <UacAdmissionSettings />,
  },
  {
    key: "study_materials",
    label: "Study Materials",
    children: <UacStudyMaterialsSettings />,
  },
  {
    key: "discounts",
    label: "Discount Options",
    children: <UacDiscountSettings />,
  },
  {
    key: "invoice_mode",
    label: "Invoice Mode",
    children: <UacInvoiceSettings />,
  },
];

export default function UacSettings() {
  return (
    <Tabs
      defaultActiveKey="tuition"
      items={tabItems}
      style={{ marginTop: 8 }}
    />
  );
}
