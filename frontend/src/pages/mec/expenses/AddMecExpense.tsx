import OrgAddExpense from "../../expenses/OrgAddExpense";

export default function AddMecExpense() {
  return (
    <OrgAddExpense
      org="mec"
      basePath="/mec/expenses"
      title="MEC"
    />
  );
}
