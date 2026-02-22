import OrgExpensesList from "../../expenses/OrgExpensesList";

export default function MbcsExpensesList() {
  return (
    <OrgExpensesList
      org="mbcs"
      basePath="/mbcs/expenses"
      title="MBCS Expenses"
    />
  );
}
