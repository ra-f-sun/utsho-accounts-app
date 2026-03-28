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
import MbcsStudentInvoice from "../../../components/invoices/MbcsStudentInvoice";
import MecStudentInvoice from "../../../components/invoices/MecStudentInvoice";
import type { StudentPaymentInvoiceData } from "../../../components/invoices/types";

type OrgType = "uac" | "mbcs" | "mec";

type InvoiceComp = React.ForwardRefExoticComponent<
  { data: StudentPaymentInvoiceData } & React.RefAttributes<HTMLDivElement>
>;

const ORG_CONFIG: Record<
  OrgType,
  {
    InvoiceComponent: InvoiceComp;
    backPath: string;
    defaultPaymentType?: string;
  }
> = {
  uac: { InvoiceComponent: UacStudentInvoice, backPath: "payments" },
  mbcs: { InvoiceComponent: MbcsStudentInvoice, backPath: "payments" },
  mec: {
    InvoiceComponent: MecStudentInvoice,
    backPath: "payment-history",
    defaultPaymentType: "Tuition",
  },
};

export default function PaymentInvoice({ org }: { org: OrgType }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const config = ORG_CONFIG[org];

  const { data, isLoading } = useQuery({
    queryKey: [org, "payment", id],
    queryFn: () => paymentsService.getOne(org, id!),
    enabled: !!id,
  });

  const payment = data?.data;

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
            @media print { body { padding: 0; } @page { margin: 15mm; } }
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

  if (!payment) return <div>Payment not found</div>;

  const invoiceData: StudentPaymentInvoiceData = {
    invoiceNumber: payment.invoiceNumber,
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    paymentMonth: payment.paymentMonth,
    paymentMethod: payment.paymentMethod,
    paymentType: config.defaultPaymentType ?? payment.paymentType,
    notes: payment.notes,
    createdAt: payment.createdAt,
    student: payment.student,
  };

  const { InvoiceComponent } = config;

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/${org}/${config.backPath}`)}
        >
          Back to Payments
        </Button>
        <Space>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handlePrint}>
            Download / Print
          </Button>
        </Space>
      </div>

      <InvoiceComponent ref={invoiceRef} data={invoiceData} />
    </div>
  );
}
