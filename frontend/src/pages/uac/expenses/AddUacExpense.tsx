import OrgAddExpense from "../../expenses/OrgAddExpense";

export default function AddUacExpense() {
  return (
    <OrgAddExpense
      org="uac"
      basePath="/uac/expenses"
      title="UAC"
    />
  );
}
