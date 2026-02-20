import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Select, Space, message, Popconfirm, Tag } from "antd";
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

export default function PaymentsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterPaymentDto>({});

  // Fetch payments with filters
  const { data, isLoading } = useQuery({
    queryKey: ["payments", filters],
    queryFn: () => paymentsService.getAll(filters),
  });

  const payments = (data as any)?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentsService.delete(id),
    onSuccess: () => {
      message.success("Payment deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: () => {
      message.error("Failed to delete payment");
    },
  });

  const getPaymentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
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
    return colors[type] || "default";
  };

  const getPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      cash: "green",
      bkash: "pink",
      nagad: "orange",
      bank_transfer: "blue",
    };
    return colors[method] || "default";
  };

  const formatPaymentType = (type: string) => {
    return type.replace(/_/g, " ").toUpperCase();
  };

  const columns: ColumnsType<Payment> = [
    {
      title: "Invoice #",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 140,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Student",
      key: "student",
      render: (_: unknown, record: Payment) => (
        <div>
          <div>
            <strong>{record.student?.name}</strong>
          </div>
          <div style={{ fontSize: 12, color: "#888" }}>
            Class {record.student?.class}
          </div>
        </div>
      ),
    },
    {
      title: "Payment Type",
      dataIndex: "paymentType",
      key: "paymentType",
      width: 140,
      render: (type: string) => (
        <Tag color={getPaymentTypeColor(type)}>{formatPaymentType(type)}</Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      render: (amount: number) => (
        <strong style={{ color: "#2e7d32" }}>৳{amount.toLocaleString()}</strong>
      ),
    },
    {
      title: "Payment Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 130,
      render: (method: string) => (
        <Tag color={getPaymentMethodColor(method)}>
          {method.replace(/_/g, " ").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Payment Month",
      dataIndex: "paymentMonth",
      key: "paymentMonth",
      width: 130,
      render: (date: string) => (date ? dayjs(date).format("MMMM YYYY") : "-"),
    },
    {
      title: "Payment Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 110,
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, record: Payment) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/uac/payments/${record.id}/invoice`)}
          />
          <Popconfirm
            title="Are you sure to delete this payment?"
            onConfirm={() => deleteMutation.mutate(record.id)}
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
        dataSource={payments}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} payments`,
        }}
      />
    </div>
  );
}
