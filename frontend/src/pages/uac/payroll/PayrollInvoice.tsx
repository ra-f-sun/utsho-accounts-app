import { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Space, Spin } from "antd";
import {
  PrinterOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { payrollService } from "../../../services/payrollService";
import { teachersService } from "../../../services/teachersService";
import { staffService } from "../../../services/staffService";
import UacTeacherPayrollInvoice from "../../../components/invoices/UacTeacherPayrollInvoice";
import UacStaffPayrollInvoice from "../../../components/invoices/UacStaffPayrollInvoice";
import type { PayrollInvoiceData } from "../../../components/invoices/types";

export default function PayrollInvoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["payroll-record", id],
    queryFn: () => payrollService.getOne(id!),
    enabled: !!id,
  });

  const payroll = data?.data;

  // Fetch the teacher or staff details to show name on invoice
  const { data: teacherData } = useQuery({
    queryKey: ["teacher", payroll?.payableId],
    queryFn: () => teachersService.getOne(payroll!.payableId),
    enabled: !!payroll?.payableId && payroll?.payableType === "teacher",
  });

  const { data: staffData } = useQuery({
    queryKey: ["staff", payroll?.payableId],
    queryFn: () => staffService.getOne(payroll!.payableId),
    enabled: !!payroll?.payableId && payroll?.payableType === "staff",
  });

  const payableName =
    teacherData?.data?.name ||
    staffData?.data?.name ||
    payroll?.payableType;

  const handlePrint = () => {
    const content = invoiceRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Payroll Invoice ${payroll?.invoiceNumber || ""}</title>
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

  if (!payroll) {
    return <div>Payroll record not found</div>;
  }

  const invoiceData: PayrollInvoiceData = {
    invoiceNumber: payroll.invoiceNumber,
    amount: payroll.amount,
    paidAmount: payroll.paidAmount,
    dueAmount: payroll.dueAmount,
    paymentDate: payroll.paymentDate,
    paymentMonth: payroll.paymentMonth,
    paymentMethod: payroll.paymentMethod,
    notes: payroll.notes,
    createdAt: payroll.createdAt,
    payableType: payroll.payableType,
    payableName,
    totalLectures: payroll.totalLectures,
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Back
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

      {payroll.payableType === "teacher" ? (
        <UacTeacherPayrollInvoice ref={invoiceRef} data={invoiceData} />
      ) : (
        <UacStaffPayrollInvoice ref={invoiceRef} data={invoiceData} />
      )}
    </div>
  );
}
