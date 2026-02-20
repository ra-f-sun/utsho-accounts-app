import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
  Select,
  Space,
  message,
  Popconfirm,
  Tag,
  DatePicker,
} from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { payrollService } from "../../../services/payrollService";
import type { Payroll } from "../../../services/payrollService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Option } = Select;

export default function PayrollList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{
    payableType?: string;
    paymentMonth?: string;
  }>({});

  // Fetch payroll with filters
  const { data, isLoading } = useQuery({
    queryKey: ["payroll", filters],
    queryFn: () => payrollService.getAll(filters),
  });

  const payrolls: Payroll[] = (data as any)?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => payrollService.delete(id),
    onSuccess: () => {
      message.success("Payroll deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
    onError: () => {
      message.error("Failed to delete payroll");
    },
  });

  const columns: ColumnsType<Payroll> = [
    {
      title: "Invoice #",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 140,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Type",
      dataIndex: "payableType",
      key: "payableType",
      width: 100,
      render: (type: string) => (
        <Tag color={type === "teacher" ? "blue" : "green"}>
          {type === "teacher" ? "Teacher" : "Staff"}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      render: (amount: number) => (
        <strong style={{ color: "#1565c0" }}>৳{amount.toLocaleString()}</strong>
      ),
    },
    {
      title: "Lectures",
      dataIndex: "totalLectures",
      key: "totalLectures",
      width: 100,
      render: (count: number | undefined) => count || "-",
    },
    {
      title: "Payment Month",
      dataIndex: "paymentMonth",
      key: "paymentMonth",
      width: 130,
      render: (date: string) => dayjs(date).format("MMMM YYYY"),
    },
    {
      title: "Payment Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 110,
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 110,
      render: (method: string) => {
        const labels: Record<string, string> = {
          cash: "Cash",
          bkash: "bKash",
          nagad: "Nagad",
          bank_transfer: "Bank Transfer",
        };
        return labels[method] || method;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_: any, record: Payroll) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/uac/payroll/${record.id}/invoice`)}
            title="View Invoice"
          />
          <Popconfirm
            title="Are you sure to delete this payroll?"
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
          <DatePicker
            picker="month"
            placeholder="Select Month"
            onChange={(date) =>
              setFilters((prev) => ({
                ...prev,
                paymentMonth: date
                  ? date.startOf("month").toISOString()
                  : undefined,
              }))
            }
            format="MMMM YYYY"
          />
          <Select
            placeholder="Payable Type"
            style={{ width: 130 }}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                payableType: value || undefined,
              }))
            }
            allowClear
          >
            <Option value="teacher">Teacher</Option>
            <Option value="staff">Staff</Option>
          </Select>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/uac/payroll/create")}
        >
          Create Payroll
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={payrolls}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} payroll records`,
        }}
      />
    </div>
  );
}
