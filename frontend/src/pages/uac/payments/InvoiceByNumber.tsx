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

  const { data, isLoading } = useQuery({
    queryKey: ["uac-invoice", invoiceNumber],
    queryFn: () => paymentsService.getByInvoice(decodeURIComponent(invoiceNumber!)),
    enabled: !!invoiceNumber,
  });

  const payments: Payment[] = data?.data || [];

  const handlePrint = () => {
    const content = invoiceRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoiceNumber || ""}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: 'Segoe UI', sans-serif; }
            @media print {
              body { padding: 0; }
              @page { margin: 15mm; }
            }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

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
  const totalAmount = payments.reduce((sum: number, p: Payment) => sum + p.amount, 0);

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
                  <Button icon={<PrinterOutlined />} onClick={() => printRef(invoiceRef)}>
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
                  <Button icon={<PrinterOutlined />} onClick={() => printRef(officeRef)}>
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
