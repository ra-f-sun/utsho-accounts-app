import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Card, Statistic, Row, Col, Tag, Spin, App, Modal, Select, Input } from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EyeOutlined,
  UserDeleteOutlined,
  UserAddOutlined,
  VerticalAlignTopOutlined,
} from "@ant-design/icons";
import { mbcsPaymentsService } from "../../../services/mbcsPaymentsService";
import { mbcsStudentsService } from "../../../services/mbcsStudentsService";
import type { MbcsPayment } from "../../../services/mbcsPaymentsService";
import type { ColumnsType } from "antd/es/table";
import QueryError from "../../../components/QueryError";
import dayjs from "dayjs";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function MbcsStudentPaymentHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const disassociateMutation = useMutation({
    mutationFn: () => mbcsStudentsService.disassociate(id!),
    onSuccess: () => {
      message.success("Student marked as no longer associated");
      queryClient.invalidateQueries({ queryKey: ["mbcs-student", id] });
      queryClient.invalidateQueries({ queryKey: ["mbcs-students"] });
    },
    onError: () => message.error("Failed to disassociate student"),
  });

  const reassociateMutation = useMutation({
    mutationFn: () => mbcsStudentsService.reassociate(id!),
    onSuccess: () => {
      message.success("Student re-associated successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-student", id] });
      queryClient.invalidateQueries({ queryKey: ["mbcs-students"] });
    },
    onError: () => message.error("Failed to re-associate student"),
  });

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteToClass, setPromoteToClass] = useState<number | undefined>(undefined);
  const [promoteNotes, setPromoteNotes] = useState('');

  const promoteMutation = useMutation({
    mutationFn: () => mbcsStudentsService.promote(id!, { toClass: promoteToClass!, notes: promoteNotes || undefined }),
    onSuccess: () => {
      message.success('Student promoted successfully');
      setPromoteOpen(false);
      setPromoteToClass(undefined);
      setPromoteNotes('');
      queryClient.invalidateQueries({ queryKey: ['mbcs-student', id] });
      queryClient.invalidateQueries({ queryKey: ['mbcs-students'] });
    },
    onError: () => message.error('Failed to promote student'),
  });

  const { data: studentData, isLoading: loadingStudent } = useQuery({
    queryKey: ["mbcs-student", id],
    queryFn: () => mbcsStudentsService.getOne(id!),
    enabled: !!id,
  });

  const student = studentData?.data;

  const { data: paymentsData, isLoading: loadingPayments, isError: paymentsIsError, error: paymentsError, refetch: refetchPayments } = useQuery({
    queryKey: ["mbcs-payments", { studentId: id }],
    queryFn: () => mbcsPaymentsService.getAll({ studentId: id }, 1, 1000),
    enabled: !!id,
  });

  const payments: MbcsPayment[] = paymentsData?.data?.data || [];
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const currentYear = new Date().getFullYear();
  const paidMonths = new Set(
    payments
      .filter((p) => p.paymentType === "tuition")
      .map((p) => dayjs(p.paymentMonth).format("YYYY-MM")),
  );

  // Admission month key — months before this are "N/A" (student not yet enrolled)
  const admissionMonthKey = student?.admissionDate
    ? dayjs(student.admissionDate).format("YYYY-MM")
    : null;

  const columns: ColumnsType<MbcsPayment> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 140,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Type",
      dataIndex: "paymentType",
      key: "paymentType",
      width: 130,
      render: (type: string) => (
        <Tag color="purple">{type.replace(/_/g, " ").toUpperCase()}</Tag>
      ),
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
      title: "Month",
      dataIndex: "paymentMonth",
      key: "paymentMonth",
      width: 120,
      render: (date: string) => dayjs(date).format("MMM YYYY"),
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
      width: 60,
      render: (_: any, record: MbcsPayment) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/mbcs/payments/${record.id}/invoice`)}
        />
      ),
    },
  ];

  if (paymentsIsError) return <QueryError error={paymentsError as Error} onRetry={refetchPayments} />;

  if (loadingStudent) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
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
          onClick={() => navigate("/mbcs/students")}
        >
          Back to Students
        </Button>
        <div style={{ display: "flex", gap: 8 }}>
          {student?.associationEndDate ? (
            <Button
              icon={<UserAddOutlined />}
              onClick={() =>
                Modal.confirm({
                  title: "Re-associate Student",
                  content: `Re-associate ${student?.name} to the organization?`,
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
                  content: `Mark ${student?.name} as no longer associated? They will be removed from active lists.`,
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
          {!student?.associationEndDate && (
            <Button
              icon={<VerticalAlignTopOutlined />}
              onClick={() => setPromoteOpen(true)}
            >
              Promote
            </Button>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/mbcs/payments/record?studentId=${id}`)}
          >
            Record Payment
          </Button>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={8}>
            <Statistic
              title="Student"
              value={student?.name || "Loading..."}
              styles={{ content: { fontSize: 18 } }}
            />
            <div style={{ color: "#888", fontSize: 13 }}>
              Class {student?.class}
              {student?.shift ? ` — ${student.shift}` : ""}
            </div>
          </Col>
          <Col span={8}>
            <Statistic
              title="Total Paid"
              value={`৳${totalPaid.toLocaleString()}`}
              styles={{ content: { color: "#2e7d32" } }}
            />
          </Col>
          <Col span={8}>
            <Statistic title="Total Payments" value={payments.length} />
          </Col>
        </Row>
      </Card>

      <Card
        title="Tuition Payment Status (Current Year)"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[8, 8]}>
          {MONTHS.map((month, idx) => {
            const monthKey = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
            const isBeforeAdmission =
              admissionMonthKey !== null && monthKey < admissionMonthKey;
            const isPaid = !isBeforeAdmission && paidMonths.has(monthKey);
            const bg = isBeforeAdmission
              ? "#f5f5f5"
              : isPaid
                ? "#f6ffed"
                : "#fff2f0";
            const borderColor = isBeforeAdmission
              ? "#d9d9d9"
              : isPaid
                ? "#b7eb8f"
                : "#ffccc7";
            const tagText = isBeforeAdmission ? "N/A" : isPaid ? "Paid" : "Unpaid";
            const tagColor = isBeforeAdmission
              ? "default"
              : isPaid
                ? "success"
                : "error";
            return (
              <Col span={4} key={monthKey}>
                <div
                  style={{
                    padding: "8px 12px",
                    textAlign: "center",
                    borderRadius: 6,
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {month.slice(0, 3)}
                  </div>
                  <Tag color={tagColor} style={{ margin: 0 }}>
                    {tagText}
                  </Tag>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Card title="All Payment Records">
        <Table
          columns={columns}
          dataSource={payments}
          rowKey="id"
          loading={loadingPayments}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} payments`,
          }}
        />
      </Card>
    </div>

    <Modal
      title={`Promote ${student?.name ?? 'Student'}`}
      open={promoteOpen}
      onCancel={() => { setPromoteOpen(false); setPromoteToClass(undefined); setPromoteNotes(''); }}
      onOk={() => promoteMutation.mutate()}
      okText="Promote"
      confirmLoading={promoteMutation.isPending}
      okButtonProps={{ disabled: !promoteToClass }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, fontWeight: 500 }}>Promote to Class</div>
        <Select
          style={{ width: '100%' }}
          placeholder="Select new class"
          value={promoteToClass}
          onChange={setPromoteToClass}
          options={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
            .filter((c) => c > (student?.class ?? -1))
            .map((c) => ({ label: c === 11 ? 'Graduated (Class 11)' : c === 0 ? 'Nursery (Class 0)' : `Class ${c}`, value: c }))}
        />
      </div>
      <div>
        <div style={{ marginBottom: 4, fontWeight: 500 }}>Notes (optional)</div>
        <Input.TextArea
          rows={2}
          value={promoteNotes}
          onChange={(e) => setPromoteNotes(e.target.value)}
          placeholder="e.g. Passed final exam"
        />
      </div>
    </Modal>
    </>
  );
}
