import { forwardRef } from "react";
import dayjs from "dayjs";
import type { StudentPaymentInvoiceData } from "./types";

const COLOR = "#7c3aed";
const COLOR_LIGHT = "#f5f0ff";
const ORG_NAME = "Morning Bell Childhood School";
const ORG_SHORT = "MBCS";
const ORG_ADDRESS = "Bashabo, Dhaka";

const fmt = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const MbcsStudentInvoice = forwardRef<HTMLDivElement, { data: StudentPaymentInvoiceData }>(
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
      {/* Header with accent banner */}
      <div
        style={{
          background: COLOR,
          borderRadius: "8px 8px 0 0",
          padding: "20px 24px",
          marginBottom: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
          <p style={{ margin: 0, fontSize: 15, color: "#fff", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>
            Payment Receipt
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
            {data.invoiceNumber}
          </p>
        </div>
      </div>

      <div
        style={{
          borderLeft: "4px solid " + COLOR,
          borderRight: "4px solid " + COLOR,
          borderBottom: "4px solid " + COLOR,
          borderRadius: "0 0 8px 8px",
          padding: "24px 24px 20px",
        }}
      >
        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Student card */}
          <div style={{ background: COLOR_LIGHT, padding: 16, borderRadius: 8 }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: COLOR, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
              Student Details
            </p>
            {data.student ? (
              <>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                  {data.student.name}
                </p>
                {data.student.shift && (
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>
                    🕐 Shift: <strong>{data.student.shift}</strong>
                  </p>
                )}
                {data.student.branch && (
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "#555" }}>
                    🏫 Branch: {data.student.branch}
                  </p>
                )}
                {data.student.class && (
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "#555" }}>
                    Class {data.student.class}
                    {data.student.group ? ` · ${data.student.group}` : ""}
                  </p>
                )}
                {data.student.guardianName && (
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#777" }}>
                    Guardian: {data.student.guardianName}
                  </p>
                )}
                {data.student.contactNumber && (
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#777" }}>
                    📞 {data.student.contactNumber}
                  </p>
                )}
              </>
            ) : (
              <p style={{ margin: 0, color: "#aaa" }}>No student data</p>
            )}
          </div>

          {/* Payment info */}
          <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 8 }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>
              Payment Information
            </p>
            <table style={{ width: "100%", fontSize: 13, color: "#555" }}>
              <tbody>
                <tr>
                  <td style={{ paddingBottom: 5, color: "#888" }}>Payment Date:</td>
                  <td style={{ fontWeight: 600, textAlign: "right" }}>
                    {dayjs(data.paymentDate).format("DD MMM YYYY")}
                  </td>
                </tr>
                {!data.lineItems && (
                  <tr>
                    <td style={{ paddingBottom: 5, color: "#888" }}>For Month:</td>
                    <td style={{ fontWeight: 600, textAlign: "right" }}>
                      {dayjs(data.paymentMonth).format("MMMM YYYY")}
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ paddingBottom: 5, color: "#888" }}>Method:</td>
                  <td style={{ fontWeight: 600, textAlign: "right" }}>
                    {fmt(data.paymentMethod)}
                  </td>
                </tr>
                {!data.lineItems && data.paymentType && (
                  <tr>
                    <td style={{ paddingBottom: 5, color: "#888" }}>Type:</td>
                    <td style={{ fontWeight: 600, textAlign: "right" }}>
                      {fmt(data.paymentType)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Line Items Table (multi-payment) */}
        {data.lineItems && data.lineItems.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: COLOR, color: "#fff" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>#</th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Payment Type</th>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>Month</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.lineItems.map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? COLOR_LIGHT : "#fff" }}>
                    <td style={{ padding: "8px 12px", color: "#888" }}>{i + 1}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                      {item.paymentType ? fmt(item.paymentType) : "Tuition"}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {dayjs(item.paymentMonth).format("MMM YYYY")}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>
                      ৳{item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            Total Amount Paid
          </span>
          <span style={{ fontSize: 34, fontWeight: 800, color: "#fff" }}>
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
            borderTop: "1px solid #e0e0e0",
            paddingTop: 12,
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
    </div>
  ),
);

MbcsStudentInvoice.displayName = "MbcsStudentInvoice";
export default MbcsStudentInvoice;
