import { forwardRef } from "react";
import dayjs from "dayjs";
import type { StudentPaymentInvoiceData } from "./types";

const COLOR = "#667eea";
const ORG_NAME = "Utsho Coaching";
const ORG_SHORT = "UC";
const ORG_ADDRESS = "Bashabo, Dhaka";

const fmt = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const UacStudentInvoice = forwardRef<HTMLDivElement, { data: StudentPaymentInvoiceData }>(
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
          <div
            style={{
              width: 48,
              height: 48,
              background: COLOR,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 18,
              marginBottom: 8,
            }}
          >
            {ORG_SHORT}
          </div>
          <h1 style={{ margin: 0, fontSize: 22, color: COLOR, fontWeight: 700 }}>
            {ORG_NAME}
          </h1>
          <p style={{ margin: "4px 0 0", color: "#666", fontSize: 12 }}>
            {ORG_ADDRESS}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              color: "#333",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Payment Receipt
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 600, color: COLOR }}>
            {data.invoiceNumber}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#999" }}>
            {dayjs(data.paymentDate).format("DD MMMM YYYY")}
          </p>
        </div>
      </div>

      {/* Student details + Payment info grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ background: "#f0f2ff", padding: 16, borderRadius: 8, borderLeft: `4px solid ${COLOR}` }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>
            Student Details
          </p>
          {data.student ? (
            <>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1a1a2e" }}>
                {data.student.name}
              </p>
              {(data.student.class || data.student.group) && (
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>
                  {data.student.class ? `Class ${data.student.class}` : ""}
                  {data.student.group ? ` · ${data.student.group} Group` : ""}
                </p>
              )}
              {data.student.guardianName && (
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#666" }}>
                  Guardian: {data.student.guardianName}
                </p>
              )}
              {data.student.contactNumber && (
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#666" }}>
                  📞 {data.student.contactNumber}
                </p>
              )}
            </>
          ) : (
            <p style={{ margin: 0, color: "#aaa" }}>No student data</p>
          )}
        </div>

        <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 8 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>
            Payment Information
          </p>
          <table style={{ width: "100%", fontSize: 13, color: "#555" }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: 4, color: "#888" }}>For Month:</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>
                  {dayjs(data.paymentMonth).format("MMMM YYYY")}
                </td>
              </tr>
              <tr>
                <td style={{ paddingBottom: 4, color: "#888" }}>Method:</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>
                  {fmt(data.paymentMethod)}
                </td>
              </tr>
              {data.paymentType && (
                <tr>
                  <td style={{ paddingBottom: 4, color: "#888" }}>Type:</td>
                  <td style={{ fontWeight: 600, textAlign: "right" }}>
                    {fmt(data.paymentType)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Amount */}
      <div
        style={{
          border: `2px solid ${COLOR}`,
          borderRadius: 8,
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          background: "#f5f6ff",
        }}
      >
        <span style={{ fontSize: 14, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>
          Total Amount Paid
        </span>
        <span style={{ fontSize: 34, fontWeight: 800, color: COLOR }}>
          ৳{data.amount.toLocaleString()}
        </span>
      </div>

      {/* Notes */}
      {data.notes && (
        <div
          style={{
            background: "#fffbe6",
            border: "1px solid #ffe58f",
            padding: 12,
            borderRadius: 6,
            marginBottom: 24,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: "#888" }}>NOTES</p>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>{data.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #e0e0e0",
          paddingTop: 14,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#bbb",
        }}
      >
        <span>Generated: {dayjs().format("DD MMMM YYYY, hh:mm A")}</span>
        <span>{ORG_SHORT} — {ORG_NAME}</span>
      </div>
    </div>
  ),
);

UacStudentInvoice.displayName = "UacStudentInvoice";
export default UacStudentInvoice;
