import { Tabs } from "antd";
import MbcsTuitionSettings from "./MbcsTuitionSettings";
import MbcsAdmissionSettings from "./MbcsAdmissionSettings";
import MbcsStudyMaterialsSettings from "./MbcsStudyMaterialsSettings";
import MbcsDiscountSettings from "./MbcsDiscountSettings";
import MbcsInvoiceSettings from "./MbcsInvoiceSettings";

const tabItems = [
  {
    key: "tuition",
    label: "Tuition",
    children: <MbcsTuitionSettings />,
  },
  {
    key: "admission",
    label: "Admission & Re-Admission",
    children: <MbcsAdmissionSettings />,
  },
  {
    key: "study_materials",
    label: "Study Materials",
    children: <MbcsStudyMaterialsSettings />,
  },
  {
    key: "discounts",
    label: "Discount Options",
    children: <MbcsDiscountSettings />,
  },
  {
    key: "invoice_mode",
    label: "Invoice Mode",
    children: <MbcsInvoiceSettings />,
  },
];

export default function MbcsSettings() {
  return (
    <Tabs
      defaultActiveKey="tuition"
      items={tabItems}
      style={{ marginTop: 8 }}
    />
  );
}
