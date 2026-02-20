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
import { teachersService } from "../../../services/teachersService";
import type {
  Teacher,
  FilterTeacherDto,
} from "../../../services/teachersService";
import type { ColumnsType } from "antd/es/table";

const { Option } = Select;

export default function TeachersList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterTeacherDto>({});

  // Fetch teachers with filters
  const { data, isLoading } = useQuery({
    queryKey: ["teachers", filters],
    queryFn: () => teachersService.getAll(filters),
  });

  const teachers = (data as any)?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => teachersService.delete(id),
    onSuccess: () => {
      message.success("Teacher deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: () => {
      message.error("Failed to delete teacher");
    },
  });

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
      render: (_: any, record: Teacher) => {
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
      render: (_: any, record: Teacher) => (
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
          <Input
            placeholder="Search by name or contact"
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                search: e.target.value || undefined,
              }))
            }
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
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} teachers`,
        }}
      />
    </div>
  );
}
