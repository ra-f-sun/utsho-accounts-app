import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Select, Space, App, Popconfirm, Tag } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { mbcsTeachersService } from "../../../services/mbcsTeachersService";
import type { MbcsTeacher } from "../../../services/mbcsTeachersService";
import type { ColumnsType } from "antd/es/table";
import QueryError from "../../../components/QueryError";

const { Option } = Select;

export default function MbcsTeachersList() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<
    string | undefined
  >();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["mbcs-teachers", paymentTypeFilter, page],
    queryFn: () => mbcsTeachersService.getAll(paymentTypeFilter, page),
  });

  const teachers: MbcsTeacher[] = data?.data?.data || [];
  const total = data?.data?.total ?? 0;

  if (isError) return <QueryError error={error as Error} onRetry={refetch} />;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mbcsTeachersService.delete(id),
    onSuccess: () => {
      message.success("Teacher deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-teachers"] });
    },
    onError: () => message.error("Failed to delete teacher"),
  });

  const columns: ColumnsType<MbcsTeacher> = [
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
      width: 160,
      render: (_: unknown, record: MbcsTeacher) => {
        if (record.paymentType === "fixed") {
          return `৳${record.monthlySalary?.toLocaleString()}/month`;
        }
        return `৳${record.perLectureRate?.toLocaleString()}/lecture`;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: MbcsTeacher) => (
        <Space>
          <Button
            type="link"
            icon={<HistoryOutlined />}
            onClick={() => navigate(`/mbcs/teachers/${record.id}/payroll`)}
            title="Payroll History"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/mbcs/teachers/edit/${record.id}`)}
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
        <Select
          placeholder="Payment Type"
          style={{ width: 160 }}
          onChange={(value) => setPaymentTypeFilter(value || undefined)}
          allowClear
        >
          <Option value="fixed">Fixed Salary</Option>
          <Option value="lecture_based">Lecture Based</Option>
        </Select>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/mbcs/teachers/add")}
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
