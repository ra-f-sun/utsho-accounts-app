import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Card, Statistic, Row, Col, Tag, Spin, App, Modal, Alert } from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EyeOutlined,
  UserDeleteOutlined,
  UserAddOutlined,
  VerticalAlignTopOutlined,
  ExclamationCircleOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { Space } from "antd";
import { mecPaymentsService } from "../../../services/mecPaymentsService";
import { mecStudentsService } from "../../../services/mecStudentsService";
import type { MecPayment } from "../../../services/mecPaymentsService";
import type { MecStudent } from "../../../services/mecStudentsService";
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

export default function MecStudentPaymentHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const disassociateMutation = useMutation({
    mutationFn: () => mecStudentsService.disassociate(id!),
    onSuccess: () => {
      message.success("Student marked as no longer associated");
      queryClient.invalidateQueries({ queryKey: ["mec-student", id] });
      queryClient.invalidateQueries({ queryKey: ["mec-students"] });
    },
    onError: () => message.error("Failed to disassociate student"),
  });

  const reassociateMutation = useMutation({
    mutationFn: () => mecStudentsService.reassociate(id!),
    onSuccess: () => {
      message.success("Student re-associated successfully");
      queryClient.invalidateQueries({ queryKey: ["mec-student", id] });
      queryClient.invalidateQueries({ queryKey: ["mec-students"] });
    },
    onError: () => message.error("Failed to re-associate student"),
  });

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteToClass, setPromoteToClass] = useState<number | undefined>(undefined);
  const [promoteNotes, setPromoteNotes] = useState('');

  const promoteMutation = useMutation({
    mutationFn: () => mecStudentsService.promote(id!, { toClass: promoteToClass!, notes: promoteNotes || undefined }),
    onSuccess: () => {
      message.success('Student promoted successfully');
      setPromoteOpen(false);
      setPromoteToClass(undefined);
      setPromoteNotes('');
      queryClient.invalidateQueries({ queryKey: ['mec-student', id] });
      queryClient.invalidateQueries({ queryKey: ['mec-students'] });
    },
    onError: () => message.error('Failed to promote student'),
  });

  const { data: studentData, isLoading: loadingStudent } = useQuery({
    queryKey: ["mec-student", id],
    queryFn: () => mecStudentsService.getOne(id!),
    enabled: !!id,
  });

  const student = (studentData as { data: MecStudent })?.data;

  const { data: paymentsData, isLoading: loadingPayments, isError: paymentsIsError, error: paymentsError, refetch: refetchPayments } = useQuery({
    queryKey: ["mec-payments", { studentId: id }],
    queryFn: () => mecPaymentsService.getAll({ studentId: id }, 1, 1000),
    enabled: !!id,
  });

  const { data: dueSummaryData } = useQuery({
    queryKey: ["mec-due-summary", id],
    queryFn: () => mecPaymentsService.getDueSummary(id!),
    enabled: !!id,
  });

  const dueSummary = (dueSummaryData as { data?: typeof dueSummaryData })?.data ?? dueSummaryData;

  const payments: MecPayment[] = useMemo(
    () => paymentsData?.data?.data || [],
    [paymentsData],
  );

  // Group payments by invoice to get per-invoice totals
  const invoiceMap = new Map<string, MecPayment[]>();
  for (const p of payments) {
    if (!invoiceMap.has(p.invoiceNumber)) invoiceMap.set(p.invoiceNumber, []);
    invoiceMap.get(p.invoiceNumber)!.push(p);
  }

  // Total Paid = sum of officePaid per unique invoice (use first row of each invoice)
  const totalPaid = Array.from(invoiceMap.values()).reduce((sum, rows) => {
    return sum + (rows[0].officePaid ?? rows.reduce((s, r) => s + r.amount, 0));
  }, 0);

  // Total unique invoices (not line items)
  const totalInvoices = invoiceMap.size;

  // Build paid months set for current year
  const currentYear = new Date().getFullYear();
  const monthlyTuition =
    (student?.monthlyTuitionFee ?? 0) - (student?.discountTuition ?? 0);

  // Sum tuition amounts per month (MEC is tuition-only, no paymentType filter needed)
  const tuitionByMonth = new Map<string, number>();
  for (const p of payments) {
    const key = dayjs(p.paymentMonth).format("YYYY-MM");
    tuitionByMonth.set(key, (tuitionByMonth.get(key) ?? 0) + p.amount);
  }

  const paidMonths = new Set<string>();
  const partialMonths = new Set<string>();
  for (const [key, total] of tuitionByMonth) {
    if (monthlyTuition > 0 && total >= monthlyTuition) {
      paidMonths.add(key);
    } else if (total > 0) {
      partialMonths.add(key);
    }
  }

  // Admission month key — months before this are "N/A" (student not yet enrolled)
  const admissionMonthKey = student?.admissionDate
    ? dayjs(student.admissionDate).format("YYYY-MM")
    : null;

  interface GroupedRow {
    invoiceNumber: string;
    paymentMonths: string[];
    amount: number;
    dueAmount: number;
    paymentDate: string;
    paymentMethod: string;
  }

  const groupedPayments = useMemo((): GroupedRow[] => {
    const invoiceMap = new Map<string, MecPayment[]>();
    for (const p of payments) {
      if (!invoiceMap.has(p.invoiceNumber)) invoiceMap.set(p.invoiceNumber, []);
      invoiceMap.get(p.invoiceNumber)!.push(p);
    }
    return Array.from(invoiceMap.values()).map((group) => {
      const first = group[0];
      return {
        invoiceNumber: first.invoiceNumber,
        paymentMonths: group.map((r) => r.paymentMonth),
        amount: first.officePaid ?? first.officeGrandTotal ?? group.reduce((s, r) => s + r.amount, 0),
        dueAmount: first.dueAmount ?? 0,
        paymentDate: first.paymentDate,
        paymentMethod: first.paymentMethod,
      };
    });
  }, [payments]);

  const columns: ColumnsType<GroupedRow> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 150,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Month(s)",
      key: "paymentMonths",
      render: (_: unknown, record: GroupedRow) => (
        <Space size={[4, 4]} wrap>
          {record.paymentMonths.map((m, i) => (
            <Tag key={i} color="blue">{dayjs(m).format("MMM YYYY")}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Amount (Office)",
      key: "amount",
      width: 130,
      render: (_: unknown, record: GroupedRow) => (
        <div>
          <strong style={{ color: "#2e7d32" }}>৳{record.amount.toLocaleString()}</strong>
          {record.dueAmount > 0 && (
            <div style={{ fontSize: 11, color: "#ff4d4f" }}>
              Due: ৳{record.dueAmount.toLocaleString()}
            </div>
          )}
        </div>
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
      width: 110,
      render: (method: string) => (
        <Tag>{method.replace(/_/g, " ").toUpperCase()}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_: unknown, record: GroupedRow) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          title="View Invoice"
          onClick={() => navigate(`/mec/payments/invoice/${encodeURIComponent(record.invoiceNumber)}`)}
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
          onClick={() => navigate("/mec/students")}
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
            onClick={() => navigate(`/mec/payments/record?studentId=${id}`)}
          >
            Record Payment
          </Button>
          <Button
            icon={<DollarOutlined />}
            onClick={() => navigate(`/mec/payments/collect-due?studentId=${id}`)}
          >
            Collect Due
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
              {student?.class ? `Class ${student.class}` : ""}
              {student?.group ? ` — ${student.group}` : ""}
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
            <Statistic title="Total Payments" value={totalInvoices} />
          </Col>
        </Row>
      </Card>

      {/* Monthly Status Grid */}
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
            const isPartial = !isBeforeAdmission && !isPaid && partialMonths.has(monthKey);
            const bg = isBeforeAdmission
              ? "#f5f5f5"
              : isPaid
                ? "#f6ffed"
                : isPartial
                  ? "#fffbe6"
                  : "#fff2f0";
            const borderColor = isBeforeAdmission
              ? "#d9d9d9"
              : isPaid
                ? "#b7eb8f"
                : isPartial
                  ? "#ffe58f"
                  : "#ffccc7";
            const tagText = isBeforeAdmission ? "N/A" : isPaid ? "Paid" : isPartial ? "Partial" : "Unpaid";
            const tagColor = isBeforeAdmission
              ? "default"
              : isPaid
                ? "success"
                : isPartial
                  ? "warning"
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

      {/* Due Summary — MEC tuition only */}
      {dueSummary && (dueSummary as { totalDue?: number }).totalDue! > 0 && (
        <Card
          title={
            <span>
              <ExclamationCircleOutlined style={{ color: "#ff4d4f", marginRight: 8 }} />
              Outstanding Due
            </span>
          }
          style={{ marginBottom: 16, borderColor: "#ffccc7" }}
          styles={{ header: { color: "#cf1322" } }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Tuition Due"
                value={`৳${(dueSummary as { breakdown?: { tuition?: { due?: number } } }).breakdown?.tuition?.due?.toLocaleString() ?? 0}`}
                styles={{ content: { color: "#cf1322", fontSize: 18 } }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Total Outstanding"
                value={`৳${(dueSummary as { totalDue?: number }).totalDue?.toLocaleString()}`}
                styles={{ content: { color: "#cf1322", fontSize: 18 } }}
              />
            </Col>
          </Row>
          <Alert
            type="warning"
            title="Outstanding tuition due exists for this student."
            description="Use the 'Collect Due' page to collect outstanding payments from this student."
            showIcon
            style={{ marginTop: 16 }}
          />
        </Card>
      )}

      {/* Payment Records Table */}
      <Card title="All Payment Records">
        <Table
          columns={columns}
          dataSource={groupedPayments}
          rowKey="invoiceNumber"
          loading={loadingPayments}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} records`,
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
          options={Array.from({ length: 20 }, (_, i) => i + 1)
            .filter((c) => c > (student?.class ?? 0))
            .map((c) => ({ label: `Class ${c}`, value: c }))}
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
