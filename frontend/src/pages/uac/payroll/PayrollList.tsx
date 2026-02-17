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
    month?: string;
    year?: number;
    paymentType?: string;
  }>({});

  // Fetch payroll with filters
  const { data, isLoading } = useQuery({
    queryKey: ["payroll", filters],
    queryFn: () => payrollService.getAll(filters),
  });

  const payrolls = data?.data.data || [];

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
      title: "Name",
      key: "name",
      render: (_: any, record: Payroll) => (
        <div>
          <strong>{record.teacher?.name || record.staff?.name}</strong>
          <div style={{ fontSize: 12, color: "#888" }}>
            {record.paymentType === "teacher" ? "Teacher" : "Staff"}
          </div>
        </div>
      ),
    },
    {
      title: "Type",
      key: "type",
      width: 120,
      render: (_: any, record: Payroll) => {
        if (record.paymentType === "teacher") {
          return (
            <Tag color="blue">
              {record.teacher?.paymentType === "fixed" ? "Fixed" : "Lecture"}
            </Tag>
          );
        }
        return <Tag color="green">Staff</Tag>;
      },
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
      dataIndex: "lectureCount",
      key: "lectureCount",
      width: 100,
      render: (count: number | undefined) => count || "-",
    },
    {
      title: "Month/Year",
      key: "monthYear",
      width: 130,
      render: (_: any, record: Payroll) => `${record.month} ${record.year}`,
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 110,
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: any, record: Payroll) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() =>
              message.info(`View details for ${record.invoiceNumber}`)
            }
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
                month: date ? date.format("MMMM") : undefined,
                year: date ? date.year() : undefined,
              }))
            }
            format="MMMM YYYY"
          />
          <Select
            placeholder="Payment Type"
            style={{ width: 130 }}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                paymentType: value || undefined,
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
