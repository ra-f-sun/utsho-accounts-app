import * as XLSX from "xlsx";
import type {
  RevenueStats,
  MonthlyRevenue,
  OutstandingPayment,
} from "../services/analyticsService";

/**
 * Export revenue statistics to Excel
 */
export const exportRevenueToExcel = (
  revenueStats: RevenueStats | RevenueStats[],
  monthlyTrend: MonthlyRevenue[],
  outstanding: OutstandingPayment[],
  filename = "revenue_report.xlsx",
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Revenue Summary  
  const revenueArray = Array.isArray(revenueStats) ? revenueStats : [revenueStats];
  const revenueSummaryData = revenueArray.map((stat) => ({
    Organization: stat.organization.toUpperCase(),
    "Student Payments": stat.studentPayments,
    "Teacher Payroll": stat.teacherPayroll,
    "Staff Payroll": stat.staffPayroll,
    Expenses: stat.expenses,
    "Net Revenue": stat.netRevenue,
  }));

  const ws1 = XLSX.utils.json_to_sheet(revenueSummaryData);
  XLSX.utils.book_append_sheet(wb, ws1, "Revenue Summary");

  // Sheet 2: Monthly Trend
  const monthlyTrendData = monthlyTrend.map((month) => ({
    Month: month.month,
    "Student Payments": month.studentPayments,
    "Teacher Payroll": month.teacherPayroll,
    "Staff Payroll": month.staffPayroll,
    Expenses: month.expenses,
    "Net Revenue": month.netRevenue,
  }));

  const ws2 = XLSX.utils.json_to_sheet(monthlyTrendData);
  XLSX.utils.book_append_sheet(wb, ws2, "Monthly Trend");

  // Sheet 3: Outstanding Payments
  const outstandingData = outstanding.map((item) => ({
    Student: item.studentName,
    Organization: item.organization.toUpperCase(),
    "Class/Grade": item.class || item.shift || "—",
    "Monthly Fee": item.monthlyFee,
    "Unpaid Months": item.unpaidMonths,
    "Total Due": item.monthlyFee * item.unpaidMonths,
  }));

  const ws3 = XLSX.utils.json_to_sheet(outstandingData);
  XLSX.utils.book_append_sheet(wb, ws3, "Outstanding Payments");

  // Write file
  XLSX.writeFile(wb, filename);
};

/**
 * Export data to CSV
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename = "export.csv",
) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export dashboard to PDF (via browser print)
 */
export const exportDashboardToPDF = () => {
  window.print();
};
