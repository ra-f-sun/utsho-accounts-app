import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
  Select,
  Space,
  Popconfirm,
  Tag,
  DatePicker,
  Modal,
  Form,
  InputNumber,
  Input,
  App,
} from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined, DollarOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { mbcsPayrollService } from "../../../services/mbcsPayrollService";
import type { MbcsPayroll } from "../../../services/mbcsPayrollService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import QueryError from "../../../components/QueryError";

export default function MbcsPayrollList() {
  const { message: msg } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dueForm] = Form.useForm();
  const [filters, setFilters] = useState<{
    payableType?: string;
    paymentMonth?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [collectDueTarget, setCollectDueTarget] = useState<MbcsPayroll | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["mbcs-payroll", filters, page],
    queryFn: () => mbcsPayrollService.getAll(filters, page),
  });

  const payrolls: MbcsPayroll[] = data?.data?.data || [];
  const total = data?.data?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mbcsPayrollService.delete(id),
    onSuccess: () => {
      msg.success("Payroll deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-payroll"] });
    },
    onError: () => msg.error("Failed to delete payroll"),
  });

  const collectDueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { paidAmount: number; paymentDate: string; paymentMethod: string; notes?: string } }) =>
      mbcsPayrollService.collectDue(id, data),
    onSuccess: () => {
      msg.success("Due collected successfully");
      setCollectDueTarget(null);
      dueForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["mbcs-payroll"] });
    },
    onError: (err: Error) => msg.error(err.message || "Failed to collect due"),
  });

  if (isError) return <QueryError error={error as Error} onRetry={refetch} />;

  const columns: ColumnsType<MbcsPayroll> = [
    {
      title: "Invoice #",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 160,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Type",
      dataIndex: "payableType",
      key: "payableType",
      width: 100,
      render: (type: string) => (
        <Tag color={type === "teacher" ? "blue" : "green"}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 130,
      render: (amount: number) => (
        <strong style={{ color: "#1565c0" }}>৳{amount.toLocaleString()}</strong>
      ),
    },
    {
      title: "Lectures",
      dataIndex: "totalLectures",
      key: "totalLectures",
      width: 100,
      render: (count: number | undefined) => count ?? "-",
    },
    {
      title: "Month",
      dataIndex: "paymentMonth",
      key: "paymentMonth",
      width: 130,
      render: (date: string) => (date ? dayjs(date).format("MMM YYYY") : "-"),
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 120,
      render: (method: string) =>
        method?.replace(/_/g, " ").toUpperCase() || "-",
    },
    {
      title: "Due",
      key: "due",
      width: 90,
      render: (_: unknown, record: MbcsPayroll) => {
        if (!record.dueAmount || record.dueAmount <= 0) return null;
        return <Tag color="red">৳{record.dueAmount.toFixed(0)}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 110,
      render: (_: unknown, record: MbcsPayroll) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/mbcs/payroll/${record.id}/invoice`)}
            title="View Invoice"
          />
          {!!record.dueAmount && record.dueAmount > 0 && !record.isDueCollection && (
            <Button
              type="link"
              icon={<DollarOutlined />}
              title="Collect Due"
              style={{ color: "#fa8c16" }}
              onClick={() => { setCollectDueTarget(record); dueForm.resetFields(); }}
            />
          )}
          <Popconfirm
            title="Are you sure to delete this payroll record?"
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
          <DatePicker
            picker="month"
            placeholder="Select Month"
            onChange={(date) =>
              setFilters((prev) => ({
                ...prev,
                paymentMonth: date
                  ? date.startOf("month").toISOString()
                  : undefined,
              }))
            }
            format="MMMM YYYY"
          />
          <Select
            placeholder="Payable Type"
            style={{ width: 130 }}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                payableType: value || undefined,
              }))
            }
            allowClear
          >
            <Option value="teacher">Teacher</Option>
            <Option value="staff">Staff</Option>
          </Select>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/mbcs/payroll/create")}
        >
          Create Payroll
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={payrolls}
        rowKey="id"
        loading={isLoading}
        pagination={{
          total,
          pageSize: 20,
          current: page,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t) => `Total ${t} payroll records`,
        }}
      />

      {/* Collect Due Modal */}
      <Modal
        open={!!collectDueTarget}
        title={`Collect Payroll Due — ${collectDueTarget?.invoiceNumber}`}
        onCancel={() => { setCollectDueTarget(null); dueForm.resetFields(); }}
        onOk={() => dueForm.submit()}
        okText="Collect"
        confirmLoading={collectDueMutation.isPending}
      >
        {collectDueTarget && (
          <>
            <p>Remaining due: <strong>৳{(collectDueTarget.dueAmount ?? 0).toFixed(2)}</strong></p>
            <Form form={dueForm} layout="vertical"
              onFinish={(values) => {
                collectDueMutation.mutate({
                  id: collectDueTarget.id,
                  data: {
                    paidAmount: values.paidAmount,
                    paymentDate: dayjs(values.paymentDate).format("YYYY-MM-DD"),
                    paymentMethod: values.paymentMethod,
                    notes: values.notes,
                  },
                });
              }}
            >
              <Form.Item label="Amount" name="paidAmount" rules={[{ required: true }]}
                initialValue={collectDueTarget.dueAmount}>
                <InputNumber style={{ width: "100%" }} min={0.01} max={collectDueTarget.dueAmount ?? undefined} precision={2} prefix="৳" />
              </Form.Item>
              <Form.Item label="Payment Method" name="paymentMethod" rules={[{ required: true }]}>
                <Select
                  placeholder="Select method"
                  options={[
                    { value: "cash", label: "Cash" },
                    { value: "bkash", label: "bKash" },
                    { value: "nagad", label: "Nagad" },
                    { value: "bank_transfer", label: "Bank Transfer" },
                  ]}
                />
              </Form.Item>
              <Form.Item label="Payment Date" name="paymentDate" rules={[{ required: true }]} initialValue={dayjs()}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={2} placeholder="Optional" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
