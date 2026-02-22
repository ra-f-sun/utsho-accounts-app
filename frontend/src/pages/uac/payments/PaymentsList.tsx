import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Select, Space, App, Popconfirm, Tag } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { paymentsService } from "../../../services/paymentsService";
import type {
  Payment,
  FilterPaymentDto,
} from "../../../services/paymentsService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Option } = Select;

interface GroupedPayment {
  invoiceNumber: string;
  student: Payment["student"];
  paymentTypes: string[];
  totalAmount: number;
  paymentMethod: string;
  paymentMonth: string;
  paymentDate: string;
  ids: string[];
}

const TYPE_COLORS: Record<string, string> = {
  tuition: "blue",
  admission: "green",
  readmission: "cyan",
  exam: "orange",
  sheet: "purple",
  session_charge: "magenta",
  study_materials: "geekblue",
  study_tour: "lime",
  other: "default",
};

const METHOD_COLORS: Record<string, string> = {
  cash: "green",
  bkash: "pink",
  nagad: "orange",
  bank_transfer: "blue",
};

export default function PaymentsList() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterPaymentDto>({});

  const { data, isLoading } = useQuery({
    queryKey: ["payments", filters],
    queryFn: () => paymentsService.getAll(filters),
  });

  const groupedPayments = useMemo((): GroupedPayment[] => {
    const payments: Payment[] = (data as unknown as { data?: Payment[] })?.data || [];
    const groups: Record<string, GroupedPayment> = {};
    payments.forEach((p: Payment) => {
      if (!groups[p.invoiceNumber]) {
        groups[p.invoiceNumber] = {
          invoiceNumber: p.invoiceNumber,
          student: p.student,
          paymentTypes: [],
          totalAmount: 0,
          paymentMethod: p.paymentMethod,
          paymentMonth: p.paymentMonth,
          paymentDate: p.paymentDate,
          ids: [],
        };
      }
      groups[p.invoiceNumber].paymentTypes.push(p.paymentType);
      groups[p.invoiceNumber].totalAmount += p.amount;
      groups[p.invoiceNumber].ids.push(p.id);
    });
    return Object.values(groups);
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => paymentsService.delete(id))),
    onSuccess: () => {
      message.success("Payment deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: () => {
      message.error("Failed to delete payment");
    },
  });

  const columns: ColumnsType<GroupedPayment> = [
    {
      title: "Invoice #",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 160,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Student",
      key: "student",
      render: (_: unknown, record: GroupedPayment) => (
        <div>
          <div><strong>{record.student?.name}</strong></div>
          <div style={{ fontSize: 12, color: "#888" }}>Class {record.student?.class}</div>
        </div>
      ),
    },
    {
      title: "Payment Types",
      key: "paymentTypes",
      render: (_: unknown, record: GroupedPayment) => (
        <Space size={[4, 4]} wrap>
          {record.paymentTypes.map((type, i) => (
            <Tag key={i} color={TYPE_COLORS[type] || "default"}>
              {type.replace(/_/g, " ").toUpperCase()}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Total",
      key: "totalAmount",
      width: 120,
      render: (_: unknown, record: GroupedPayment) => (
        <strong style={{ color: "#2e7d32" }}>
          ৳{record.totalAmount.toLocaleString()}
        </strong>
      ),
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 130,
      render: (method: string) => (
        <Tag color={METHOD_COLORS[method] || "default"}>
          {method.replace(/_/g, " ").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Month",
      dataIndex: "paymentMonth",
      key: "paymentMonth",
      width: 120,
      render: (date: string) => (date ? dayjs(date).format("MMM YYYY") : "-"),
    },
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 110,
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, record: GroupedPayment) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() =>
              navigate(
                `/uac/payments/invoice/${encodeURIComponent(record.invoiceNumber)}`,
              )
            }
          />
          <Popconfirm
            title="Delete all payments in this invoice?"
            onConfirm={() => deleteMutation.mutate(record.ids)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Space>
          <Select
            placeholder="Payment Type"
            style={{ width: 160 }}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                paymentType: value || undefined,
              }))
            }
            allowClear
          >
            <Option value="tuition">Tuition</Option>
            <Option value="admission">Admission</Option>
            <Option value="readmission">Re-admission</Option>
            <Option value="exam">Exam</Option>
            <Option value="sheet">Sheet</Option>
            <Option value="session_charge">Session Charge</Option>
            <Option value="study_materials">Study Materials</Option>
            <Option value="study_tour">Study Tour</Option>
            <Option value="other">Other</Option>
          </Select>
          <Select
            placeholder="Payment Method"
            style={{ width: 150 }}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                paymentMethod: value || undefined,
              }))
            }
            allowClear
          >
            <Option value="cash">Cash</Option>
            <Option value="bkash">bKash</Option>
            <Option value="nagad">Nagad</Option>
            <Option value="bank_transfer">Bank Transfer</Option>
          </Select>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/uac/payments/record")}
        >
          Record Payment
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={groupedPayments}
        rowKey="invoiceNumber"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} invoices`,
        }}
      />
    </div>
  );
}

