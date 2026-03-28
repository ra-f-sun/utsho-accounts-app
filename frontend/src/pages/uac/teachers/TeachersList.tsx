import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  App,
  Popconfirm,
  Tag,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { teachersService } from "../../../services/teachersService";
import type {
  Teacher,
  FilterTeacherDto,
} from "../../../services/teachersService";
import type { ColumnsType } from "antd/es/table";
import QueryError from "../../../components/QueryError";
import { useDebouncedValue } from "../../../utils/useDebouncedValue";

const { Option } = Select;

export default function TeachersList() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterTeacherDto>({});
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const [page, setPage] = useState(1);

  // Fetch teachers with filters
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["uac", "teachers", { ...filters, search: debouncedSearch || undefined }, page],
    queryFn: () => teachersService.getAll("uac", { ...filters, search: debouncedSearch || undefined }, page),
  });

  const teachers = data?.data?.data || [];
  const total = data?.data?.total ?? 0;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => teachersService.delete("uac", id),
    onSuccess: () => {
      message.success("Teacher deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["uac", "teachers"] });
    },
    onError: () => {
      message.error("Failed to delete teacher");
    },
  });

  if (isError) return <QueryError error={error as Error} onRetry={refetch} />;

  const columns: ColumnsType<Teacher> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Contact",
      dataIndex: "contactNumber",
      key: "contactNumber",
    },
    {
      title: "Payment Type",
      dataIndex: "paymentType",
      key: "paymentType",
      width: 150,
      render: (type: string) => (
        <Tag color={type === "fixed" ? "blue" : "green"}>
          {type === "fixed" ? "Fixed Salary" : "Lecture Based"}
        </Tag>
      ),
    },
    {
      title: "Salary/Rate",
      key: "payment",
      width: 150,
      render: (_: unknown, record: Teacher) => {
        if (record.paymentType === "fixed") {
          return `৳${record.monthlySalary?.toLocaleString()}/month`;
        }
        return `৳${record.perLectureRate?.toLocaleString()}/lecture`;
      },
    },
    {
      title: "Subjects",
      dataIndex: "subjects",
      key: "subjects",
      ellipsis: true,
      render: (subjects: string | undefined) => subjects || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: Teacher) => (
        <Space>
          <Button
            type="link"
            icon={<HistoryOutlined />}
            onClick={() => navigate(`/uac/teachers/${record.id}/payroll`)}
            title="Payroll History"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/uac/teachers/edit/${record.id}`)}
          />
          <Popconfirm
            title="Are you sure to delete this teacher?"
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
        }}
      >
        <Space>
          <Input
            placeholder="Search by name or contact"
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            placeholder="Payment Type"
            style={{ width: 150 }}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                paymentType: value || undefined,
              }))
            }
            allowClear
          >
            <Option value="fixed">Fixed Salary</Option>
            <Option value="lecture_based">Lecture Based</Option>
          </Select>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/uac/teachers/add")}
        >
          Add Teacher
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={teachers}
        rowKey="id"
        loading={isLoading}
        pagination={{
          total,
          pageSize: 20,
          current: page,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t) => `Total ${t} teachers`,
        }}
      />
    </div>
  );
}
