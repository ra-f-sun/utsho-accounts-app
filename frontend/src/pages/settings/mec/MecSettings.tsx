import { Tabs } from "antd";
import MecTuitionSettings from "./MecTuitionSettings";
import MecDiscountSettings from "./MecDiscountSettings";

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
