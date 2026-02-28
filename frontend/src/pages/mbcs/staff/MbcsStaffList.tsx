import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Space, App, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, UserDeleteOutlined, UserAddOutlined, HistoryOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { mbcsStaffService } from "../../../services/mbcsStaffService";
import type { MbcsStaff } from "../../../services/mbcsStaffService";
import type { ColumnsType } from "antd/es/table";
import QueryError from "../../../components/QueryError";

export default function MbcsStaffList() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["mbcs-staff", page],
    queryFn: () => mbcsStaffService.getAll(page),
  });

  const staff: MbcsStaff[] = data?.data?.data || [];
  const total = data?.data?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mbcsStaffService.delete(id),
    onSuccess: () => {
      message.success("Staff deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-staff"] });
    },
    onError: () => message.error("Failed to delete staff"),
  });

  const disassociateMutation = useMutation({
    mutationFn: (id: string) => mbcsStaffService.disassociate(id),
    onSuccess: () => {
      message.success("Staff member marked as no longer associated");
      queryClient.invalidateQueries({ queryKey: ["mbcs-staff"] });
    },
    onError: () => message.error("Failed to disassociate staff member"),
  });

  const reassociateMutation = useMutation({
    mutationFn: (id: string) => mbcsStaffService.reassociate(id),
    onSuccess: () => {
      message.success("Staff member re-associated successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-staff"] });
    },
    onError: () => message.error("Failed to re-associate staff member"),
  });

  if (isError) return <QueryError error={error as Error} onRetry={refetch} />;

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
      width: 180,
      render: (_: unknown, record: MbcsStaff) => (
        <Space>
          <Button
            type="link"
            icon={<HistoryOutlined />}
            onClick={() => navigate(`/mbcs/staff/${record.id}/payroll`)}
            title="View Payroll History"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/mbcs/staff/edit/${record.id}`)}
          />
          {record.associationEndDate ? (
            <Popconfirm
              title="Re-associate this staff member?"
              onConfirm={() => reassociateMutation.mutate(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" icon={<UserAddOutlined />} loading={reassociateMutation.isPending} title="Re-associate" />
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Mark as no longer associated?"
              onConfirm={() => disassociateMutation.mutate(record.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" danger icon={<UserDeleteOutlined />} loading={disassociateMutation.isPending} title="No Longer Associated" />
            </Popconfirm>
          )}
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
