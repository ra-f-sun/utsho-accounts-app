import OrgExpensesList from "../../expenses/OrgExpensesList";

export default function UacExpensesList() {
  return (
    <OrgExpensesList
      org="uac"
      basePath="/uac/expenses"
      title="UAC Expenses"
    />
  );
}
