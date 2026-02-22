import { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Space, Spin } from "antd";
import {
  PrinterOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { paymentsService } from "../../../services/paymentsService";
import UacStudentInvoice from "../../../components/invoices/UacStudentInvoice";
import type { StudentPaymentInvoiceData } from "../../../components/invoices/types";

export default function PaymentInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["payment", id],
    queryFn: () => paymentsService.getOne(id!),
    enabled: !!id,
  });

  const payment = (data as any)?.data;

  const handlePrint = () => {
    const content = invoiceRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${payment?.invoiceNumber || ""}</title>
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

  if (!payment) {
    return <div>Payment not found</div>;
  }

  const invoiceData: StudentPaymentInvoiceData = {
    invoiceNumber: payment.invoiceNumber,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    paymentMonth: payment.paymentMonth,
    paymentMethod: payment.paymentMethod,
    paymentType: payment.paymentType,
    notes: payment.notes,
    createdAt: payment.createdAt,
    student: payment.student,
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

      <UacStudentInvoice ref={invoiceRef} data={invoiceData} />
    </div>
  );
}
