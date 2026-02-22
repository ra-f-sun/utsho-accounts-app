import OrgAddExpense from "../../expenses/OrgAddExpense";

export default function AddMbcsExpense() {
  return (
    <OrgAddExpense
      org="mbcs"
      basePath="/mbcs/expenses"
      title="MBCS"
    />
  );
}
