import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  message,
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
import { MBCS_CLASSES, MBCS_CLASS_MAP } from "../../../constants/mbcsClasses";

const { Option } = Select;

export default function MbcsStudentsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterStudentDto>({});
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["mbcs", "students", filters, page],
    queryFn: () => studentsService.getAll("mbcs", filters, page),
  });

  const students: Student[] = data?.data?.data || [];
  const total = data?.data?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsService.delete("mbcs", id),
    onSuccess: () => {
      message.success("Student deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs", "students"] });
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
      width: 120,
      render: (cls: number) => MBCS_CLASS_MAP[cls] ?? `Class ${cls}`,
    },
    {
      title: "Shift",
      dataIndex: "shift",
      key: "shift",
      width: 100,
      render: (shift: string | undefined) =>
        shift ? (
          <Tag color={shift === "morning" ? "orange" : "blue"}>
            {shift.charAt(0).toUpperCase() + shift.slice(1)}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Branch",
      dataIndex: "branch",
      key: "branch",
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
            onClick={() => navigate(`/mbcs/students/${record.id}/payments`)}
            title="Payment History"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/mbcs/students/edit/${record.id}`)}
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
        style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}
      >
        <Space>
          <Input
            placeholder="Search by name, contact, or guardian"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                search: e.target.value || undefined,
              }))
            }
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
            {MBCS_CLASSES.map(({ value: cls, label }) => (
              <Option key={cls} value={cls}>
                {label}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="Shift"
            style={{ width: 120 }}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, shift: value || undefined }))
            }
            allowClear
          >
            <Option value="morning">Morning</Option>
            <Option value="day">Day</Option>
          </Select>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/mbcs/students/add")}
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
