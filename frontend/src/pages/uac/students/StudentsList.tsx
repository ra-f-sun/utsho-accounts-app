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
import { studentsService } from "../../../services/studentsService";
import type {
  Student,
  FilterStudentDto,
} from "../../../services/studentsService";
import type { ColumnsType } from "antd/es/table";
import QueryError from "../../../components/QueryError";
import { useDebouncedValue } from "../../../utils/useDebouncedValue";

const { Option } = Select;

export default function StudentsList() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterStudentDto>({});
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const [page, setPage] = useState(1);

  // Fetch students with filters
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["students", { ...filters, search: debouncedSearch || undefined }, page],
    queryFn: () => studentsService.getAll({ ...filters, search: debouncedSearch || undefined }, page),
  });

  const students: Student[] = data?.data?.data || [];
  const total = data?.data?.total ?? 0;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsService.delete(id),
    onSuccess: () => {
      message.success("Student deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: () => {
      message.error("Failed to delete student");
    },
  });

  if (isError) return <QueryError error={error as Error} onRetry={refetch} />;

  const columns: ColumnsType<Student> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Class",
      dataIndex: "class",
      key: "class",
      width: 80,
    },
    {
      title: "Group",
      dataIndex: "group",
      key: "group",
      width: 100,
      render: (group: string | undefined) =>
        group ? <Tag color="blue">{group.toUpperCase()}</Tag> : "-",
    },
    {
      title: "School",
      dataIndex: "school",
      key: "school",
      ellipsis: true,
    },
    {
      title: "Guardian",
      dataIndex: "guardianName",
      key: "guardianName",
    },
    {
      title: "Contact",
      dataIndex: "contactNumber",
      key: "contactNumber",
    },
    {
      title: "Monthly Fee",
      dataIndex: "monthlyTuitionFee",
      key: "monthlyTuitionFee",
      render: (fee: number) => `৳${fee.toLocaleString()}`,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: Student) => (
        <Space>
          <Button
            type="link"
            icon={<HistoryOutlined />}
            onClick={() => navigate(`/uac/students/${record.id}/payments`)}
            title="Payment History"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/uac/students/edit/${record.id}`)}
          />
          <Popconfirm
            title="Are you sure to delete this student?"
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
            placeholder="Search by name, contact, or guardian"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            placeholder="Class"
            style={{ width: 120 }}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, class: value || undefined }))
            }
            allowClear
          >
            {[8, 9, 10, 11, 12].map((cls) => (
              <Option key={cls} value={cls}>
                Class {cls}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="Group"
            style={{ width: 120 }}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, group: value || undefined }))
            }
            allowClear
          >
            <Option value="science">Science</Option>
            <Option value="business">Business</Option>
          </Select>
          <Input
            placeholder="School"
            style={{ width: 200 }}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                school: e.target.value || undefined,
              }))
            }
            allowClear
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/uac/students/add")}
        >
          Add Student
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={students}
        rowKey="id"
        loading={isLoading}
        pagination={{
          total,
          pageSize: 20,
          current: page,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t) => `Total ${t} students`,
        }}
      />
    </div>
  );
}
