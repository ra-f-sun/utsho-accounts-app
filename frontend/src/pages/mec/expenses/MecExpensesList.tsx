import OrgExpensesList from "../../expenses/OrgExpensesList";

export default function MecExpensesList() {
  return (
    <OrgExpensesList
      org="mec"
      basePath="/mec/expenses"
      title="MEC Expenses"
    />
  );
}
