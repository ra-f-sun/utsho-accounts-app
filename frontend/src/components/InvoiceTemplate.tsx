import { forwardRef } from "react";
import dayjs from "dayjs";

export interface InvoiceData {
  // Common fields
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  paymentMonth: string;
  paymentMethod: string;
  notes?: string;
  createdAt?: string;

  // Student payment specific
  student?: {
    name: string;
    class?: number;
    group?: string;
    shift?: string;
    contactNumber?: string;
    fatherName?: string;
    guardianName?: string;
  };
  paymentType?: string;

  // Payroll specific
  payableType?: string;
  payableName?: string;
  totalLectures?: number;
}

interface InvoiceTemplateProps {
  data: InvoiceData;
  organization: "uac" | "mbcs";
  type: "payment" | "payroll";
}

const orgConfig = {
  uac: {
    name: "Universal Academic Center",
    shortName: "UAC",
    address: "Kaliakair, Gazipur",
    phone: "",
    color: "#667eea",
  },
  mbcs: {
    name: "Mother's Brain Child School",
    shortName: "MBCS",
    address: "Kaliakair, Gazipur",
    phone: "",
    color: "#7c3aed",
  },
};

const formatPaymentType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const formatPaymentMethod = (method: string) =>
  method.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ data, organization, type }, ref) => {
    const org = orgConfig[organization];

    return (
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
            borderBottom: `3px solid ${org.color}`,
            paddingBottom: 20,
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                color: org.color,
                fontWeight: 700,
              }}
            >
              {org.name}
            </h1>
            <p style={{ margin: "4px 0 0", color: "#666", fontSize: 13 }}>
              {org.address}
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
              {type === "payment" ? "Payment Receipt" : "Payroll Receipt"}
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 14,
                fontWeight: 600,
                color: org.color,
              }}
            >
              {data.invoiceNumber}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Left: Payee info */}
          <div
            style={{
              background: "#f8f9fa",
              padding: 16,
              borderRadius: 8,
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 11,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {type === "payment" ? "Student Details" : "Payee Details"}
            </p>
            {type === "payment" && data.student ? (
              <>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  {data.student.name}
                </p>
                <p style={{ margin: "2px 0", fontSize: 13, color: "#555" }}>
                  Class {data.student.class}
                  {data.student.group ? ` (${data.student.group})` : ""}
                  {data.student.shift ? ` — ${data.student.shift}` : ""}
                </p>
                {data.student.guardianName && (
                  <p style={{ margin: "2px 0", fontSize: 13, color: "#555" }}>
                    Guardian: {data.student.guardianName}
                  </p>
                )}
                {data.student.contactNumber && (
                  <p style={{ margin: "2px 0", fontSize: 13, color: "#555" }}>
                    Contact: {data.student.contactNumber}
                  </p>
                )}
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  {data.payableName || "N/A"}
                </p>
                <p style={{ margin: "2px 0", fontSize: 13, color: "#555" }}>
                  Type:{" "}
                  {data.payableType
                    ? formatPaymentType(data.payableType)
                    : "N/A"}
                </p>
                {data.totalLectures != null && (
                  <p style={{ margin: "2px 0", fontSize: 13, color: "#555" }}>
                    Total Lectures: {data.totalLectures}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Right: Payment info */}
          <div
            style={{
              background: "#f8f9fa",
              padding: 16,
              borderRadius: 8,
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 11,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Payment Information
            </p>
            <table style={{ fontSize: 13, color: "#555" }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: 12, paddingBottom: 4 }}>Date:</td>
                  <td style={{ fontWeight: 500 }}>
                    {dayjs(data.paymentDate).format("DD MMMM YYYY")}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: 12, paddingBottom: 4 }}>Month:</td>
                  <td style={{ fontWeight: 500 }}>
                    {dayjs(data.paymentMonth).format("MMMM YYYY")}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingRight: 12, paddingBottom: 4 }}>
                    Method:
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {formatPaymentMethod(data.paymentMethod)}
                  </td>
                </tr>
                {type === "payment" && data.paymentType && (
                  <tr>
                    <td style={{ paddingRight: 12, paddingBottom: 4 }}>
                      Type:
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {formatPaymentType(data.paymentType)}
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
            border: `2px solid ${org.color}`,
            borderRadius: 8,
            padding: 20,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Total Amount
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 32,
              fontWeight: 700,
              color: org.color,
            }}
          >
            ৳{data.amount.toLocaleString()}
          </p>
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
            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Notes</p>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>{data.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #e0e0e0",
            paddingTop: 16,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#999",
          }}
        >
          <span>Generated on {dayjs().format("DD MMMM YYYY, hh:mm A")}</span>
          <span>
            {org.shortName} — {org.name}
          </span>
        </div>
      </div>
    );
  },
);

InvoiceTemplate.displayName = "InvoiceTemplate";
export default InvoiceTemplate;
