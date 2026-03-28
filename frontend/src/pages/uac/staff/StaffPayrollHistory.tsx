import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Table, Button, Card, Statistic, Row, Col, Tag, Spin, App, Modal, InputNumber, DatePicker, Select, Form, Input, Space } from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EyeOutlined,
  DollarOutlined,
  UserDeleteOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { payrollService } from "../../../services/payrollService";
import { staffService } from "../../../services/staffService";
import type { ColumnsType } from "antd/es/table";
import QueryError from "../../../components/QueryError";
import dayjs from "dayjs";

interface PayrollRecord {
  id: string;
  payableType: string;
  payableId: string;
  paymentMonth: string;
  amount: number;
  paidAmount?: number;
  dueAmount?: number;
  isDueCollection?: boolean;
  paymentDate: string;
  paymentMethod: string;
  invoiceNumber: string;
  notes?: string;
}

export default function StaffPayrollHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const disassociateMutation = useMutation({
    mutationFn: () => staffService.disassociate("uac", id!),
    onSuccess: () => {
      message.success("Staff marked as no longer associated");
      queryClient.invalidateQueries({ queryKey: ["uac", "staff-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["uac", "staff"] });
    },
    onError: () => message.error("Failed to disassociate staff"),
  });

  const reassociateMutation = useMutation({
    mutationFn: () => staffService.reassociate("uac", id!),
    onSuccess: () => {
      message.success("Staff re-associated successfully");
      queryClient.invalidateQueries({ queryKey: ["uac", "staff-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["uac", "staff"] });
    },
    onError: () => message.error("Failed to re-associate staff"),
  });

  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ["uac", "staff-detail", id],
    queryFn: () => staffService.getOne("uac", id!),
    enabled: !!id,
  });

  const staff = staffData?.data;

  const { data: payrollData, isLoading: loadingPayroll, isError: payrollIsError, error: payrollError, refetch: refetchPayroll } = useQuery({
    queryKey: ["uac", "payroll", { payableId: id, payableType: "staff" }],
    queryFn: () =>
      payrollService.getAll("uac", {
        payableId: id,
        payableType: "staff",
      }, 1, 1000),
    enabled: !!id,
  });

  const payrolls: PayrollRecord[] = payrollData?.data?.data || [];
  const totalPaid = payrolls.reduce((sum, p) => sum + (p.paidAmount ?? p.amount), 0);
  const totalDue = payrolls.reduce((sum, p) => sum + (p.dueAmount || 0), 0);

  // Collect Due modal state
  const [collectDueRecord, setCollectDueRecord] = useState<PayrollRecord | null>(null);
  const [collectDueForm] = Form.useForm();
  const [collectingDue, setCollectingDue] = useState(false);

  const handleCollectDue = async () => {
    try {
      const values = await collectDueForm.validateFields();
      setCollectingDue(true);
      await payrollService.collectDue("uac", collectDueRecord!.id, {
        paidAmount: values.paidAmount,
        paymentDate: values.paymentDate.toISOString(),
        paymentMethod: values.paymentMethod,
        notes: values.notes,
      });
      message.success("Due collected successfully!");
      setCollectDueRecord(null);
      collectDueForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["uac", "payroll"] });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) message.error(err.response.data.message);
    } finally {
      setCollectingDue(false);
    }
  };

  const columns: ColumnsType<PayrollRecord> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 140,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Month",
      dataIndex: "paymentMonth",
      key: "paymentMonth",
      width: 120,
      render: (date: string) => dayjs(date).format("MMM YYYY"),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 100,
      render: (amount: number) => (
        <strong style={{ color: "#2e7d32" }}>৳{amount.toLocaleString()}</strong>
      ),
    },
    {
      title: "Paid",
      dataIndex: "paidAmount",
      key: "paidAmount",
      width: 100,
      render: (paid: number | undefined, record: PayrollRecord) => (
        <span>৳{(paid ?? record.amount).toLocaleString()}</span>
      ),
    },
    {
      title: "Due",
      dataIndex: "dueAmount",
      key: "dueAmount",
      width: 100,
      render: (due: number) =>
        due > 0 ? (
          <strong style={{ color: "#f5222d" }}>৳{due.toLocaleString()}</strong>
        ) : (
          <Tag color="green">Paid</Tag>
        ),
    },
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 110,
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 100,
      render: (method: string) => (
        <Tag>{method.replace(/_/g, " ").toUpperCase()}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, record: PayrollRecord) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/uac/payroll/${record.id}/invoice`)}
            title="View Invoice"
          />
          {(record.dueAmount ?? 0) > 0 && !record.isDueCollection && (
            <Button
              type="link"
              size="small"
              icon={<DollarOutlined />}
              style={{ color: "#f5222d" }}
              onClick={() => {
                setCollectDueRecord(record);
                collectDueForm.setFieldsValue({ paidAmount: record.dueAmount });
              }}
            >
              Collect
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (payrollIsError) return <QueryError error={payrollError as Error} onRetry={refetchPayroll} />;

  if (loadingStaff) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/uac/staff")}
        >
          Back to Staff
        </Button>
        <div style={{ display: "flex", gap: 8 }}>
          {staff?.associationEndDate ? (
            <Button
              icon={<UserAddOutlined />}
              onClick={() =>
                Modal.confirm({
                  title: "Re-associate Staff",
                  content: `Re-associate ${staff?.name} to the organization?`,
                  onOk: () => reassociateMutation.mutateAsync(),
                })
              }
              loading={reassociateMutation.isPending}
            >
              Re-associate
            </Button>
          ) : (
            <Button
              danger
              icon={<UserDeleteOutlined />}
              onClick={() =>
                Modal.confirm({
                  title: "Mark as No Longer Associated",
                  content: `Mark ${staff?.name} as no longer associated? They will be removed from active lists.`,
                  okText: "Confirm",
                  okButtonProps: { danger: true },
                  onOk: () => disassociateMutation.mutateAsync(),
                })
              }
              loading={disassociateMutation.isPending}
            >
              No Longer Associated
            </Button>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/uac/payroll/create`)}
          >
            Create Payroll
          </Button>
        </div>
      </div>

      {/* Staff Info */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={8}>
            <Statistic
              title="Staff"
              value={staff?.name || "Loading..."}
              styles={{ content: { fontSize: 18 } }}
            />
            <div style={{ color: "#888", fontSize: 13 }}>
              {staff?.designation || "Staff"} — ৳{staff?.monthlySalary?.toLocaleString()}/month
            </div>
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Paid"
              value={`৳${totalPaid.toLocaleString()}`}
              styles={{ content: { color: "#2e7d32" } }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Due"
              value={`৳${totalDue.toLocaleString()}`}
              styles={{ content: { color: totalDue > 0 ? "#f5222d" : "#2e7d32" } }}
            />
          </Col>
          <Col span={4}>
            <Statistic title="Total Payroll Records" value={payrolls.length} />
          </Col>
        </Row>
      </Card>

      {/* Payroll Records Table */}
      <Card title="Payroll History">
        <Table
          columns={columns}
          dataSource={payrolls}
          rowKey="id"
          loading={loadingPayroll}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} records`,
          }}
        />
      </Card>

      {/* Collect Due Modal */}
      <Modal
        title={`Collect Due — ${collectDueRecord?.invoiceNumber || ""}`}
        open={!!collectDueRecord}
        onCancel={() => { setCollectDueRecord(null); collectDueForm.resetFields(); }}
        onOk={handleCollectDue}
        confirmLoading={collectingDue}
        okText="Collect Due"
      >
        <Form form={collectDueForm} layout="vertical">
          <Form.Item label="Outstanding Due">
            <strong style={{ color: "#f5222d", fontSize: 16 }}>
              ৳{(collectDueRecord?.dueAmount || 0).toLocaleString()}
            </strong>
          </Form.Item>
          <Form.Item label="Amount to Collect (৳)" name="paidAmount" rules={[{ required: true }]}>
            <InputNumber min={1} max={collectDueRecord?.dueAmount || undefined} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Payment Date" name="paymentDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Payment Method" name="paymentMethod" rules={[{ required: true }]}>
            <Select placeholder="Select method">
              <Select.Option value="cash">Cash</Select.Option>
              <Select.Option value="bkash">bKash</Select.Option>
              <Select.Option value="nagad">Nagad</Select.Option>
              <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
