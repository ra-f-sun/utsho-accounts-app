import { forwardRef } from "react";
import dayjs from "dayjs";
import type { StudentPaymentInvoiceData } from "./types";

const COLOR = "#059669";
const COLOR_LIGHT = "#f0fdf4";
const ORG_NAME = "M@hee's English Care";
const ORG_SHORT = "MEC";
const ORG_ADDRESS = "Bashabo, Dhaka";

const fmt = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

/** Simplified single-column layout for MEC — tuition-focused, minimal. */
const MecStudentInvoice = forwardRef<HTMLDivElement, { data: StudentPaymentInvoiceData }>(
  ({ data }, ref) => (
    <div
      ref={ref}
      style={{
        width: 620,
        margin: "0 auto",
        padding: 36,
        fontFamily: "'Segoe UI', sans-serif",
        background: "#fff",
        border: `2px solid ${COLOR}`,
        borderRadius: 12,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: `2px dashed ${COLOR}`, paddingBottom: 20, marginBottom: 24 }}>
        <div
          style={{
            display: "inline-block",
            background: COLOR,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            padding: "4px 16px",
            borderRadius: 20,
            marginBottom: 10,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Payment Receipt
        </div>
        <span
          style={{
            display: "inline-block",
            background: "rgba(255,255,255,0.25)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 12,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Guardian&#39;s Copy
        </span>
        <h1 style={{ margin: "6px 0 0", fontSize: 24, color: COLOR, fontWeight: 800 }}>
          {ORG_NAME}
        </h1>
        <p style={{ margin: "4px 0 0", color: "#888", fontSize: 12 }}>{ORG_ADDRESS}</p>
        <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 600, color: "#555" }}>
          Invoice: <span style={{ color: COLOR }}>{data.invoiceNumber}</span>
        </p>
      </div>

      {/* Student name + contact */}
      <div
        style={{
          background: COLOR_LIGHT,
          border: `1px solid ${COLOR}`,
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 20,
        }}
      >
        <p style={{ margin: "0 0 4px", fontSize: 11, color: COLOR, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
          Student
        </p>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>
          {data.student?.name ?? "N/A"}
        </p>
        {data.student?.guardianName && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>
            Guardian: {data.student.guardianName}
          </p>
        )}
        {data.student?.contactNumber && (
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#666" }}>
            📞 {data.student.contactNumber}
          </p>
        )}
      </div>

      {/* Payment details in a two-column key-value layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px 24px",
          marginBottom: 20,
          fontSize: 13,
          color: "#555",
        }}
      >
        {!data.lineItems && (
          <div>
            <span style={{ color: "#888" }}>Payment Month: </span>
            <strong>{dayjs(data.paymentMonth).format("MMMM YYYY")}</strong>
          </div>
        )}
        <div>
          <span style={{ color: "#888" }}>Payment Date: </span>
          <strong>{dayjs(data.paymentDate).format("DD MMM YYYY")}</strong>
        </div>
        <div>
          <span style={{ color: "#888" }}>Method: </span>
          <strong>{fmt(data.paymentMethod)}</strong>
        </div>
        {!data.lineItems && data.paymentType && (
          <div>
            <span style={{ color: "#888" }}>Type: </span>
            <strong>{fmt(data.paymentType)}</strong>
          </div>
        )}
      </div>

      {/* Line Items Table (multi-payment, tuition months) */}
      {data.lineItems && data.lineItems.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLOR, color: "#fff" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", borderRadius: "4px 0 0 4px" }}>#</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Month</th>
                <th style={{ padding: "8px 12px", textAlign: "right", borderRadius: "0 4px 4px 0" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? COLOR_LIGHT : "#fff" }}>
                  <td style={{ padding: "8px 12px", color: "#888" }}>{i + 1}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                    {dayjs(item.paymentMonth).format("MMMM YYYY")}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>
                    ৳{(item.guardianAmount ?? item.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Additional Discount & Due */}
      {(data.additionalDiscount ?? 0) > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 24px", fontSize: 13, color: "#888" }}>
          <span>Additional Discount</span>
          <span>-৳{data.additionalDiscount?.toLocaleString()}</span>
        </div>
      )}
      {(data.dueAmount ?? 0) > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 24px", fontSize: 14, color: "#ff4d4f", fontWeight: 600 }}>
          <span>Due Amount</span>
          <span>৳{data.dueAmount?.toLocaleString()}</span>
        </div>
      )}

      {/* Amount — centered */}
      <div
        style={{
          textAlign: "center",
          border: `2px solid ${COLOR}`,
          borderRadius: 10,
          padding: "16px 0",
          marginBottom: 20,
          background: COLOR_LIGHT,
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>
          Amount Paid
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 36, fontWeight: 800, color: COLOR }}>
          ৳{(data.guardianPaid ?? data.amount).toLocaleString()}
        </p>
      </div>

      {/* Notes */}
      {data.notes && (
        <div
          style={{
            background: "#fffbe6",
            border: "1px solid #ffe58f",
            padding: 10,
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: "#888" }}>NOTES</p>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>{data.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          borderTop: "1px dashed #ccc",
          paddingTop: 12,
          textAlign: "center",
          fontSize: 11,
          color: "#bbb",
        }}
      >
        Generated: {dayjs().format("DD MMMM YYYY, hh:mm A")} · {ORG_SHORT}
      </div>
    </div>
  ),
);

MecStudentInvoice.displayName = "MecStudentInvoice";
export default MecStudentInvoice;
