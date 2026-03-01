import { forwardRef } from "react";
import dayjs from "dayjs";
import type { PayrollInvoiceData } from "./types";

const COLOR = "#667eea";
const ORG_NAME = "Utsho Coaching";
const ORG_SHORT = "UC";
const ORG_ADDRESS = "Bashabo, Dhaka";

const fmt = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const UacStaffPayrollInvoice = forwardRef<HTMLDivElement, { data: PayrollInvoiceData }>(
  ({ data }, ref) => (
    <div
      ref={ref}
      style={{
        width: 700,
        margin: "0 auto",
        padding: 40,
        fontFamily: "'Segoe UI', sans-serif",
        background: "#fff",
        border: "1px solid #e0e0e0",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: `3px solid ${COLOR}`,
          paddingBottom: 20,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: COLOR, fontWeight: 700 }}>
            {ORG_NAME}
          </h1>
          <p style={{ margin: "4px 0 0", color: "#666", fontSize: 12 }}>{ORG_ADDRESS}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ margin: 0, fontSize: 16, color: "#333", textTransform: "uppercase", letterSpacing: 2 }}>
            Staff Payroll Slip
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 600, color: COLOR }}>
            {data.invoiceNumber}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#999" }}>
            {dayjs(data.paymentDate).format("DD MMMM YYYY")}
          </p>
        </div>
      </div>

      {/* Staff + payment info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#f0f2ff", padding: 16, borderRadius: 8, borderLeft: `4px solid ${COLOR}` }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>
            Staff Details
          </p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>
            {data.payableName ?? "N/A"}
          </p>
          {data.payableType && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>
              Designation: {fmt(data.payableType)}
            </p>
          )}
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>Fixed Salary</p>
        </div>

        <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 8 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>
            Payment Information
          </p>
          <table style={{ width: "100%", fontSize: 13, color: "#555" }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: 5, color: "#888" }}>For Month:</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>
                  {dayjs(data.paymentMonth).format("MMMM YYYY")}
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: 5, color: "#888" }}>Payment Date:</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>
                  {dayjs(data.paymentDate).format("DD MMM YYYY")}
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: 5, color: "#888" }}>Method:</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>
                  {fmt(data.paymentMethod)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Due Amount */}
      {(data.dueAmount ?? 0) > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 24px", fontSize: 14, color: "#ff4d4f", fontWeight: 600, marginBottom: 8 }}>
          <span>Due Amount</span>
          <span>৳{data.dueAmount?.toLocaleString()}</span>
        </div>
      )}

      {/* Amount */}
      <div
        style={{
          border: `2px solid ${COLOR}`,
          borderRadius: 8,
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f5f6ff",
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 14, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>
          Total Salary Paid
        </span>
        <span style={{ fontSize: 34, fontWeight: 800, color: COLOR }}>
          ৳{(data.paidAmount ?? data.amount).toLocaleString()}
        </span>
      </div>

      {data.notes && (
        <div style={{ background: "#fffbe6", border: "1px solid #ffe58f", padding: 12, borderRadius: 6, marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 11, color: "#888" }}>NOTES</p>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>{data.notes}</p>
        </div>
      )}

      <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 14, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#bbb" }}>
        <span>Generated: {dayjs().format("DD MMMM YYYY, hh:mm A")}</span>
        <span>{ORG_SHORT} — {ORG_NAME}</span>
      </div>
    </div>
  ),
);

UacStaffPayrollInvoice.displayName = "UacStaffPayrollInvoice";
export default UacStaffPayrollInvoice;
