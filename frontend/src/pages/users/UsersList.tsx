import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Table,
  Space,
  message,
  Popconfirm,
  Tag,
  Card,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { usersService, type User } from "../../services/usersService";
import type { ColumnsType } from "antd/es/table";
import EmptyState from "../../components/EmptyState";

function UsersList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: usersResponse, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: usersService.getAll,
  });
  const users: User[] = usersResponse?.data?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess: () => {
      message.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      message.error("Failed to delete user");
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "red";
      case "DIRECTOR":
        return "volcano";
      case "ACCOUNTANT_UAC":
        return "blue";
      case "ACCOUNTANT_MBCS":
        return "green";
      case "ACCOUNTANT_MEC":
        return "purple";
      default:
        return "default";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "DIRECTOR":
        return "Director";
      case "ACCOUNTANT_UAC":
        return "UAC Accountant";
      case "ACCOUNTANT_MBCS":
        return "MBCS Accountant";
      case "ACCOUNTANT_MEC":
        return "MEC Accountant";
      default:
        return role;
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: "Full Name",
      dataIndex: "fullName",
      key: "fullName",
      sorter: (a, b) => a.fullName.localeCompare(b.fullName),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>{getRoleLabel(role)}</Tag>
      ),
      filters: [
        { text: "Super Admin", value: "SUPER_ADMIN" },
        { text: "Director", value: "DIRECTOR" },
        { text: "UAC Accountant", value: "ACCOUNTANT_UAC" },
        { text: "MBCS Accountant", value: "ACCOUNTANT_MBCS" },
        { text: "MEC Accountant", value: "ACCOUNTANT_MEC" },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "red"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
      filters: [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: User) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/users/edit/${record.id}`)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete User"
            description="Are you sure you want to delete this user?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {error && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ color: "red" }}>
            Error loading users: {(error as Error).message}
          </div>
        </Card>
      )}
      <Card
        title="User Management"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/users/add")}
          >
            Add User
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={isLoading}
          locale={{
            emptyText: (
              <EmptyState
                description="No users found"
                actionText="Add User"
                onAction={() => navigate("/users/add")}
              />
            ),
          }}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} users`,
          }}
        />
      </Card>
    </div>
  );
}

export default UsersList;
