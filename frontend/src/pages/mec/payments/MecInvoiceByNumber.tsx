import { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Space, Spin } from "antd";
import {
  PrinterOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { mecPaymentsService } from "../../../services/mecPaymentsService";
import type { MecPayment } from "../../../services/mecPaymentsService";
import MecStudentInvoice from "../../../components/invoices/MecStudentInvoice";
import type { StudentPaymentInvoiceData } from "../../../components/invoices/types";

export default function MecInvoiceByNumber() {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["mec-invoice", invoiceNumber],
    queryFn: () => mecPaymentsService.getByInvoice(decodeURIComponent(invoiceNumber!)),
    enabled: !!invoiceNumber,
  });

  const payments: MecPayment[] = (data as any)?.data || [];

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
  const totalAmount = payments.reduce((sum: number, p: MecPayment) => sum + p.amount, 0);

  const invoiceData: StudentPaymentInvoiceData = {
    invoiceNumber: first.invoiceNumber,
    amount: totalAmount,
    paymentDate: first.paymentDate,
    paymentMonth: first.paymentMonth,
    paymentMethod: first.paymentMethod,
    createdAt: first.createdAt,
    student: first.student,
    lineItems: payments.map((p: MecPayment) => ({
      amount: p.amount,
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
          onClick={() => navigate("/mec/payment-history")}
        >
          Back to Payments
        </Button>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handlePrint}
          >
            Download / Print
          </Button>
        </Space>
      </div>

      <MecStudentInvoice ref={invoiceRef} data={invoiceData} />
    </div>
  );
}
