import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Input, Space, message, Popconfirm, Tag } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { mecStudentsService } from "../../../services/mecStudentsService";
import type { MecStudent } from "../../../services/mecStudentsService";
import type { ColumnsType } from "antd/es/table";

export default function MecStudentsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["mec-students", { search }],
    queryFn: () => mecStudentsService.getAll(search ? { search } : {}),
  });

  const students: MecStudent[] = (data as any)?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mecStudentsService.remove(id),
    onSuccess: () => {
      message.success("Student deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["mec-students"] });
    },
    onError: () => message.error("Failed to delete student"),
  });

  const columns: ColumnsType<MecStudent> = [
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
      render: (cls: number | undefined) => cls ?? "-",
    },
    {
      title: "Group",
      dataIndex: "group",
      key: "group",
      width: 100,
      render: (g: string | undefined) =>
        g ? <Tag color="blue">{g}</Tag> : "-",
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
      width: 130,
    },
    {
      title: "Monthly Fee",
      dataIndex: "monthlyTuitionFee",
      key: "monthlyTuitionFee",
      width: 120,
      render: (fee: number) => (
        <strong style={{ color: "#2e7d32" }}>৳{fee.toLocaleString()}</strong>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_: unknown, record: MecStudent) => (
        <Space>
          <Button
            type="link"
            icon={<HistoryOutlined />}
            onClick={() => navigate(`/mec/students/${record.id}/payments`)}
            title="Payment History"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/mec/students/edit/${record.id}`)}
            title="Edit"
          />
          <Popconfirm
            title="Deactivate this student?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              title="Delete"
            />
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
        <h2 style={{ margin: 0 }}>MEC Students</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/mec/students/add")}
        >
          Add Student
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by name, contact, or guardian..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 360 }}
        />
      </div>

      <Table
        columns={columns}
        dataSource={students}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 15,
          showTotal: (total) => `Total ${total} students`,
        }}
      />
    </div>
  );
}
