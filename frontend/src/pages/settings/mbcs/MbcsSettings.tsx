import { Tabs } from "antd";
import MbcsTuitionSettings from "./MbcsTuitionSettings";
import MbcsAdmissionSettings from "./MbcsAdmissionSettings";
import MbcsStudyMaterialsSettings from "./MbcsStudyMaterialsSettings";
import MbcsDiscountSettings from "./MbcsDiscountSettings";
import MbcsInvoiceSettings from "./MbcsInvoiceSettings";
import MbcsPaymentPrioritySettings from "./MbcsPaymentPrioritySettings";
import MbcsPaymentMethodSettings from "./MbcsPaymentMethodSettings";
import MbcsLateFeeSettings from "./MbcsLateFeeSettings";

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
    key: "late_fee",
    label: "Late Fee",
    children: <MbcsLateFeeSettings />,
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
  {
    key: "payment_priority",
    label: "Payment Priority",
    children: <MbcsPaymentPrioritySettings />,
  },
  {
    key: "payment_methods",
    label: "Payment Methods",
    children: <MbcsPaymentMethodSettings />,
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
