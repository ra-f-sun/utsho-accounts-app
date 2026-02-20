import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Space, message, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { mbcsStaffService } from "../../../services/mbcsStaffService";
import type { MbcsStaff } from "../../../services/mbcsStaffService";
import type { ColumnsType } from "antd/es/table";

export default function MbcsStaffList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["mbcs-staff"],
    queryFn: () => mbcsStaffService.getAll(),
  });

  const staff: MbcsStaff[] = (data as any)?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mbcsStaffService.delete(id),
    onSuccess: () => {
      message.success("Staff deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-staff"] });
    },
    onError: () => message.error("Failed to delete staff"),
  });

  const columns: ColumnsType<MbcsStaff> = [
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
      render: (val: string | undefined) => val || "-",
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
      render: (_: unknown, record: MbcsStaff) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/mbcs/staff/edit/${record.id}`)}
          />
          <Popconfirm
            title="Are you sure to delete this staff member?"
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
          justifyContent: "flex-end",
        }}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/mbcs/staff/add")}
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
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} staff members`,
        }}
      />
    </div>
  );
}
