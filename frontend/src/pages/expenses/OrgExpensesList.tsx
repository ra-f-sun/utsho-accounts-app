import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Space, App, Popconfirm, Tag, Select } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { expensesService } from "../../services/expensesService";
import type { Expense, Organization } from "../../services/expensesService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useState } from "react";
import QueryError from "../../components/QueryError";

const { Option } = Select;

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  rent: "Rent",
  electricity: "Electricity",
  water: "Water",
  internet: "Internet",
  salary: "Salary",
  other: "Other",
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  cash: "green",
  bank: "blue",
  mobile: "orange",
};

interface Props {
  org: Organization;
  basePath: string; // e.g. "/uac/expenses"
  title: string;
}

export default function OrgExpensesList({ org, basePath, title }: Props) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<
    string | undefined
  >(undefined);

  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["expenses", org, expenseTypeFilter, page],
    queryFn: () => expensesService.getAll(org, expenseTypeFilter, undefined, page),
  });

  const expenses: Expense[] = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;

  if (isError) return <QueryError error={error as Error} onRetry={refetch} />;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesService.delete(org, id),
    onSuccess: () => {
      message.success("Expense deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["expenses", org] });
    },
    onError: () => {
      message.error("Failed to delete expense");
    },
  });

  const columns: ColumnsType<Expense> = [
    {
      title: "Expense Type",
      dataIndex: "expenseType",
      key: "expenseType",
      render: (type: string) => (
        <strong>{EXPENSE_TYPE_LABELS[type] ?? type}</strong>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 130,
      render: (amount: number) => (
        <strong style={{ color: "#c62828" }}>৳{amount.toLocaleString()}</strong>
      ),
    },
    {
      title: "Expense Month",
      dataIndex: "expenseMonth",
      key: "expenseMonth",
      width: 130,
      render: (date: string) => dayjs(date).format("MMM YYYY"),
    },
    {
      title: "Payment Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 120,
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Payment Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 140,
      render: (method: string) => (
        <Tag color={PAYMENT_METHOD_COLORS[method] ?? "default"}>
          {method.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
      render: (text: string | undefined) => text || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, record: Expense) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`${basePath}/edit/${record.id}`)}
          />
          <Popconfirm
            title="Delete this expense?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending} />
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
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>{title}</h2>
        <Space>
          <Select
            placeholder="Filter by type"
            allowClear
            style={{ width: 160 }}
            onChange={(val) => setExpenseTypeFilter(val)}
          >
            <Option value="rent">Rent</Option>
            <Option value="electricity">Electricity</Option>
            <Option value="water">Water</Option>
            <Option value="internet">Internet</Option>
            <Option value="salary">Salary</Option>
            <Option value="other">Other</Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`${basePath}/add`)}
          >
            Add Expense
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={expenses}
        rowKey="id"
        loading={isLoading}
        pagination={{
          total,
          pageSize: 20,
          current: page,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t) => `Total ${t} expenses`,
        }}
      />
    </div>
  );
}
