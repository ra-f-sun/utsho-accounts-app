import { Tabs } from "antd";
import MecTuitionSettings from "./MecTuitionSettings";
import MecDiscountSettings from "./MecDiscountSettings";
import MecInvoiceSettings from "./MecInvoiceSettings";
import MecPaymentPrioritySettings from "./MecPaymentPrioritySettings";
import MecPaymentMethodSettings from "./MecPaymentMethodSettings";

const tabItems = [
  {
    key: "tuition",
    label: "Tuition",
    children: <MecTuitionSettings />,
  },
  {
    key: "discounts",
    label: "Discount Options",
    children: <MecDiscountSettings />,
  },
  {
    key: "invoice_mode",
    label: "Invoice Mode",
    children: <MecInvoiceSettings />,
  },
  {
    key: "payment_priority",
    label: "Payment Priority",
    children: <MecPaymentPrioritySettings />,
  },
  {
    key: "payment_methods",
    label: "Payment Methods",
    children: <MecPaymentMethodSettings />,
  },
];

export default function MecSettings() {
  return (
    <Tabs
      defaultActiveKey="tuition"
      items={tabItems}
      style={{ marginTop: 8 }}
    />
  );
}
