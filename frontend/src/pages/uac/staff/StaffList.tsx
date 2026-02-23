import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Input, Space, App, Popconfirm } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { staffService } from "../../../services/staffService";
import type { Staff } from "../../../services/staffService";
import type { ColumnsType } from "antd/es/table";
import QueryError from "../../../components/QueryError";
import { useDebouncedValue } from "../../../utils/useDebouncedValue";

export default function StaffList() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);

  // Fetch staff with search
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["staff", debouncedSearch, page],
    queryFn: () => staffService.getAll(debouncedSearch || undefined, page),
  });

  const staff = data?.data?.data || [];
  const total = data?.data?.total ?? 0;

  if (isError) return <QueryError error={error as Error} onRetry={refetch} />;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffService.delete(id),
    onSuccess: () => {
      message.success("Staff deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: () => {
      message.error("Failed to delete staff");
    },
  });

  const columns: ColumnsType<Staff> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Designation",
      dataIndex: "designation",
      key: "designation",
    },
    {
      title: "Contact",
      dataIndex: "contactNumber",
      key: "contactNumber",
    },
    {
      title: "Monthly Salary",
      dataIndex: "monthlySalary",
      key: "monthlySalary",
      render: (salary: number) => `৳${salary.toLocaleString()}`,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: any, record: Staff) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/uac/staff/edit/${record.id}`)}
          />
          <Popconfirm
            title="Are you sure to delete this staff member?"
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
        <Input
          placeholder="Search by name, designation, or contact"
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/uac/staff/add")}
        >
          Add Staff
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={staff}
        rowKey="id"
        loading={isLoading}
        pagination={{
          total,
          pageSize: 20,
          current: page,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t) => `Total ${t} staff members`,
        }}
      />
    </div>
  );
}
