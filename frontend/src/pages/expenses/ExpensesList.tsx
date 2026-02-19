import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Input, Space, message, Popconfirm, Tag } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { expensesService } from "../../services/expensesService";
import type { Expense } from "../../services/expensesService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

export default function ExpensesList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState<string>("");

  // Fetch expenses with search
  const { data, isLoading } = useQuery({
    queryKey: ["expenses", search],
    queryFn: () => expensesService.getAll(search || undefined),
  });

  const expenses = (data as any)?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesService.delete(id),
    onSuccess: () => {
      message.success("Expense deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: () => {
      message.error("Failed to delete expense");
    },
  });

  const getPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      cash: "green",
      bkash: "pink",
      nagad: "orange",
      bank_transfer: "blue",
    };
    return colors[method] || "default";
  };

  const columns: ColumnsType<Expense> = [
    {
      title: "Expense Type",
      dataIndex: "expenseType",
      key: "expenseType",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 120,
      render: (amount: number) => (
        <strong style={{ color: "#c62828" }}>৳{amount.toLocaleString()}</strong>
      ),
    },
    {
      title: "Payment Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 130,
      render: (method: string) => (
        <Tag color={getPaymentMethodColor(method)}>
          {method.replace("_", " ").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 110,
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (text: string | undefined) => text || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: any, record: Expense) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/expenses/edit/${record.id}`)}
          />
          <Popconfirm
            title="Are you sure to delete this expense?"
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
        <Input
          placeholder="Search by expense type or description"
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/expenses/add")}
        >
          Add Expense
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={expenses}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} expenses`,
        }}
      />
    </div>
  );
}
