import { forwardRef } from "react";
import dayjs from "dayjs";
import type { PayrollInvoiceData } from "./types";

const COLOR = "#7c3aed";
const COLOR_LIGHT = "#f5f0ff";
const ORG_NAME = "Morning Bell Childhood School";
const ORG_SHORT = "MBCS";
const ORG_ADDRESS = "Bashabo, Dhaka";

const fmt = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const MbcsTeacherPayrollInvoice = forwardRef<HTMLDivElement, { data: PayrollInvoiceData }>(
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
      {/* Header banner */}
      <div
        style={{
          background: COLOR,
          borderRadius: "8px 8px 0 0",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 0,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: "#fff", fontWeight: 800 }}>
            {ORG_NAME}
          </h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
            {ORG_ADDRESS}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>
            Teacher Payroll Slip
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
            {data.invoiceNumber}
          </p>
        </div>
      </div>

      <div
        style={{
          borderLeft: `4px solid ${COLOR}`,
          borderRight: `4px solid ${COLOR}`,
          borderBottom: `4px solid ${COLOR}`,
          borderRadius: "0 0 8px 8px",
          padding: "24px 24px 20px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: COLOR_LIGHT, padding: 16, borderRadius: 8 }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: COLOR, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
              Teacher Details
            </p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              {data.payableName ?? "N/A"}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>Role: Teacher</p>
            {data.totalLectures != null && (
              <div
                style={{
                  marginTop: 10,
                  background: COLOR,
                  color: "#fff",
                  borderRadius: 6,
                  padding: "6px 12px",
                  display: "inline-block",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                📚 {data.totalLectures} Lectures
              </div>
            )}
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
            background: COLOR,
            borderRadius: 8,
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 1 }}>
            Total Salary Paid
          </span>
          <span style={{ fontSize: 34, fontWeight: 800, color: "#fff" }}>
            ৳{(data.paidAmount ?? data.amount).toLocaleString()}
          </span>
        </div>

        {data.notes && (
          <div style={{ background: "#fffbe6", border: "1px solid #ffe58f", padding: 12, borderRadius: 6, marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 11, color: "#888" }}>NOTES</p>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>{data.notes}</p>
          </div>
        )}

        <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#bbb" }}>
          <span>Generated: {dayjs().format("DD MMMM YYYY, hh:mm A")}</span>
          <span>{ORG_SHORT} — {ORG_NAME}</span>
        </div>
      </div>
    </div>
  ),
);

MbcsTeacherPayrollInvoice.displayName = "MbcsTeacherPayrollInvoice";
export default MbcsTeacherPayrollInvoice;
