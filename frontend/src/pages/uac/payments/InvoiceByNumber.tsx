import { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Space, Spin, Tabs } from "antd";
import {
  PrinterOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { paymentsService } from "../../../services/paymentsService";
import type { Payment } from "../../../services/paymentsService";
import UacStudentInvoice from "../../../components/invoices/UacStudentInvoice";
import UacStudentOfficeInvoice from "../../../components/invoices/UacStudentOfficeInvoice";
import type { StudentPaymentInvoiceData } from "../../../components/invoices/types";

export default function InvoiceByNumber() {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const officeRef = useRef<HTMLDivElement>(null);

  const handlePrint = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Invoice ${invoiceNumber}</title>`);
    printWindow.document.write("<style>body{font-family:Arial,sans-serif;padding:20px}@media print{body{padding:0}}</style>");
    printWindow.document.write("</head><body>");
    printWindow.document.write(ref.current.innerHTML);
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const { data, isLoading } = useQuery({
    queryKey: ["uac", "invoice", invoiceNumber],
    queryFn: () => paymentsService.getByInvoice("uac", decodeURIComponent(invoiceNumber!)),
    enabled: !!invoiceNumber,
  });

  const payments: Payment[] = data?.data || [];

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!payments.length) {
    return <div>Invoice not found</div>;
  }

  const first = payments[0];

  const invoiceData: StudentPaymentInvoiceData = {
    invoiceNumber: first.invoiceNumber,
    amount: first.officePaid ?? payments.reduce((sum: number, p: Payment) => sum + p.amount, 0),
    paymentDate: first.paymentDate,
    paymentMonth: first.paymentMonth,
    paymentMethod: first.paymentMethod,
    createdAt: first.createdAt,
    student: first.student,
    guardianSubTotal: first.guardianSubTotal ?? undefined,
    officeSubTotal: first.officeSubTotal ?? undefined,
    additionalDiscount: first.additionalDiscount ?? undefined,
    guardianGrandTotal: first.guardianGrandTotal ?? undefined,
    officeGrandTotal: first.officeGrandTotal ?? undefined,
    guardianPaid: first.guardianPaid ?? undefined,
    officePaid: first.officePaid ?? undefined,
    dueAmount: first.dueAmount ?? undefined,
    lineItems: payments.map((p: Payment) => ({
      paymentType: p.paymentType,
      amount: p.amount,
      guardianAmount: p.guardianAmount ?? undefined,
      paymentMonth: p.paymentMonth,
      notes: p.notes,
    })),
  };

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/uac/payments")}
        >
          Back to Payments
        </Button>
      </div>

      <Tabs
        defaultActiveKey="guardian"
        items={[
          {
            key: "guardian",
            label: "Guardian's Copy",
            children: (
              <div>
                <Space style={{ marginBottom: 12 }}>
                  <Button icon={<PrinterOutlined />} onClick={() => handlePrint(invoiceRef)}>
                    Print Guardian Copy
                  </Button>
                </Space>
                <UacStudentInvoice ref={invoiceRef} data={invoiceData} />
              </div>
            ),
          },
          {
            key: "office",
            label: "Office Copy",
            children: (
              <div>
                <Space style={{ marginBottom: 12 }}>
                  <Button icon={<PrinterOutlined />} onClick={() => handlePrint(officeRef)}>
                    Print Office Copy
                  </Button>
                </Space>
                <UacStudentOfficeInvoice ref={officeRef} data={invoiceData} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
