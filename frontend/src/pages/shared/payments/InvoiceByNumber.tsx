import { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Space, Spin, Tabs } from "antd";
import { PrinterOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { paymentsService } from "../../../services/paymentsService";
import type { Payment } from "../../../services/paymentsService";
import UacStudentInvoice from "../../../components/invoices/UacStudentInvoice";
import UacStudentOfficeInvoice from "../../../components/invoices/UacStudentOfficeInvoice";
import MbcsStudentInvoice from "../../../components/invoices/MbcsStudentInvoice";
import MbcsStudentOfficeInvoice from "../../../components/invoices/MbcsStudentOfficeInvoice";
import MecStudentInvoice from "../../../components/invoices/MecStudentInvoice";
import MecStudentOfficeInvoice from "../../../components/invoices/MecStudentOfficeInvoice";
import type { StudentPaymentInvoiceData } from "../../../components/invoices/types";

type OrgType = "uac" | "mbcs" | "mec";

type InvoiceComp = React.ForwardRefExoticComponent<
  { data: StudentPaymentInvoiceData } & React.RefAttributes<HTMLDivElement>
>;

const ORG_CONFIG: Record<
  OrgType,
  { GuardianInvoice: InvoiceComp; OfficeInvoice: InvoiceComp; backPath: string }
> = {
  uac: {
    GuardianInvoice: UacStudentInvoice,
    OfficeInvoice: UacStudentOfficeInvoice,
    backPath: "payments",
  },
  mbcs: {
    GuardianInvoice: MbcsStudentInvoice,
    OfficeInvoice: MbcsStudentOfficeInvoice,
    backPath: "payments",
  },
  mec: {
    GuardianInvoice: MecStudentInvoice,
    OfficeInvoice: MecStudentOfficeInvoice,
    backPath: "payment-history",
  },
};

export default function InvoiceByNumber({ org }: { org: OrgType }) {
  const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const officeRef = useRef<HTMLDivElement>(null);
  const config = ORG_CONFIG[org];

  const handlePrint = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(
      `<html><head><title>Invoice ${invoiceNumber}</title>`,
    );
    printWindow.document.write(
      "<style>body{font-family:Arial,sans-serif;padding:20px}@media print{body{padding:0}}</style>",
    );
    printWindow.document.write("</head><body>");
    printWindow.document.write(ref.current.innerHTML);
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const { data, isLoading } = useQuery({
    queryKey: [org, "invoice", invoiceNumber],
    queryFn: () =>
      paymentsService.getByInvoice(org, decodeURIComponent(invoiceNumber!)),
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

  if (!payments.length) return <div>Invoice not found</div>;

  const first = payments[0];

  const invoiceData: StudentPaymentInvoiceData = {
    invoiceNumber: first.invoiceNumber,
    amount:
      first.officePaid ??
      payments.reduce((sum: number, p: Payment) => sum + p.amount, 0),
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

  const { GuardianInvoice, OfficeInvoice } = config;

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/${org}/${config.backPath}`)}
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
                  <Button
                    icon={<PrinterOutlined />}
                    onClick={() => handlePrint(invoiceRef)}
                  >
                    Print Guardian Copy
                  </Button>
                </Space>
                <GuardianInvoice ref={invoiceRef} data={invoiceData} />
              </div>
            ),
          },
          {
            key: "office",
            label: "Office Copy",
            children: (
              <div>
                <Space style={{ marginBottom: 12 }}>
                  <Button
                    icon={<PrinterOutlined />}
                    onClick={() => handlePrint(officeRef)}
                  >
                    Print Office Copy
                  </Button>
                </Space>
                <OfficeInvoice ref={officeRef} data={invoiceData} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
