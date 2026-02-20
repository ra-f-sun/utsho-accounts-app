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
import { mbcsPayrollService } from "../../../services/mbcsPayrollService";
import type { MbcsPayroll } from "../../../services/mbcsPayrollService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Option } = Select;

export default function MbcsPayrollList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{
    payableType?: string;
    paymentMonth?: string;
  }>({});

  const { data, isLoading } = useQuery({
    queryKey: ["mbcs-payroll", filters],
    queryFn: () => mbcsPayrollService.getAll(filters),
  });

  const payrolls: MbcsPayroll[] = (data as any)?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mbcsPayrollService.delete(id),
    onSuccess: () => {
      message.success("Payroll deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-payroll"] });
    },
    onError: () => message.error("Failed to delete payroll"),
  });

  const columns: ColumnsType<MbcsPayroll> = [
    {
      title: "Invoice #",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 160,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Type",
      dataIndex: "payableType",
      key: "payableType",
      width: 100,
      render: (type: string) => (
        <Tag color={type === "teacher" ? "blue" : "green"}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 130,
      render: (amount: number) => (
        <strong style={{ color: "#1565c0" }}>৳{amount.toLocaleString()}</strong>
      ),
    },
    {
      title: "Lectures",
      dataIndex: "totalLectures",
      key: "totalLectures",
      width: 100,
      render: (count: number | undefined) => count ?? "-",
    },
    {
      title: "Month",
      dataIndex: "paymentMonth",
      key: "paymentMonth",
      width: 130,
      render: (date: string) => (date ? dayjs(date).format("MMM YYYY") : "-"),
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 120,
      render: (method: string) =>
        method?.replace(/_/g, " ").toUpperCase() || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, record: MbcsPayroll) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/mbcs/payroll/${record.id}/invoice`)}
            title="View Invoice"
          />
          <Popconfirm
            title="Are you sure to delete this payroll record?"
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
          onClick={() => navigate("/mbcs/payroll/create")}
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
