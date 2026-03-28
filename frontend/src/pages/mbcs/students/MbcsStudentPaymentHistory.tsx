import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Card, Statistic, Row, Col, Tag, Spin, App, Modal, Select, Input, Alert, Space } from "antd";
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
import { paymentsService } from "../../../services/paymentsService";
import { studentsService } from "../../../services/studentsService";
import type { Payment } from "../../../services/paymentsService";
import type { ColumnsType } from "antd/es/table";
import QueryError from "../../../components/QueryError";
import dayjs from "dayjs";
import { MBCS_CLASS_MAP } from "../../../constants/mbcsClasses";

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
    mutationFn: () => studentsService.disassociate("mbcs", id!),
    onSuccess: () => {
      message.success("Student marked as no longer associated");
      queryClient.invalidateQueries({ queryKey: ["mbcs", "student", id] });
      queryClient.invalidateQueries({ queryKey: ["mbcs", "students"] });
    },
    onError: () => message.error("Failed to disassociate student"),
  });

  const reassociateMutation = useMutation({
    mutationFn: () => studentsService.reassociate("mbcs", id!),
    onSuccess: () => {
      message.success("Student re-associated successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs", "student", id] });
      queryClient.invalidateQueries({ queryKey: ["mbcs", "students"] });
    },
    onError: () => message.error("Failed to re-associate student"),
  });

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteToClass, setPromoteToClass] = useState<number | undefined>(undefined);
  const [promoteNotes, setPromoteNotes] = useState('');

  const promoteMutation = useMutation({
    mutationFn: () => studentsService.promote("mbcs", id!, { toClass: promoteToClass!, notes: promoteNotes || undefined }),
    onSuccess: () => {
      message.success('Student promoted successfully');
      setPromoteOpen(false);
      setPromoteToClass(undefined);
      setPromoteNotes('');
      queryClient.invalidateQueries({ queryKey: ['mbcs', 'student', id] });
      queryClient.invalidateQueries({ queryKey: ['mbcs', 'students'] });
    },
    onError: () => message.error('Failed to promote student'),
  });

  const { data: studentData, isLoading: loadingStudent } = useQuery({
    queryKey: ["mbcs", "student", id],
    queryFn: () => studentsService.getOne("mbcs", id!),
    enabled: !!id,
  });

  const student = studentData?.data;

  const { data: paymentsData, isLoading: loadingPayments, isError: paymentsIsError, error: paymentsError, refetch: refetchPayments } = useQuery({
    queryKey: ["mbcs", "payments", { studentId: id }],
    queryFn: () => paymentsService.getAll("mbcs", { studentId: id }, 1, 1000),
    enabled: !!id,
  });

  const { data: dueSummaryData } = useQuery({
    queryKey: ["due-summary", "mbcs", id],
    queryFn: () => paymentsService.getDueSummary("mbcs", id!),
    enabled: !!id,
  });

  const dueSummary = dueSummaryData?.data;

  const payments: Payment[] = useMemo(
    () => paymentsData?.data?.data || [],
    [paymentsData],
  );

  // Group payments by invoice to get per-invoice totals
  const invoiceMap = new Map<string, Payment[]>();
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

  // Compute actual tuition paid per month, accounting for officePaid allocation
  const tuitionByMonth = new Map<string, number>();
  // Group payments by invoiceNumber to allocate officePaid correctly
  const invoiceGroups = new Map<string, typeof payments>();
  for (const p of payments) {
    const inv = p.invoiceNumber ?? `__${p.id}`;
    if (!invoiceGroups.has(inv)) invoiceGroups.set(inv, []);
    invoiceGroups.get(inv)!.push(p);
  }
  for (const rows of invoiceGroups.values()) {
    const { officePaid = 0, isDueCollection } = rows[0];
    const tuitionRows = rows.filter((r) => r.paymentType === "tuition");
    if (isDueCollection) {
      // Due-collection: amount IS actual paid per type
      for (const t of tuitionRows) {
        const mk = dayjs(t.paymentMonth).format("YYYY-MM");
        tuitionByMonth.set(mk, (tuitionByMonth.get(mk) ?? 0) + t.amount);
      }
    } else {
      // Original invoice: tuition is first priority, allocate officePaid in order
      let remaining = officePaid;
      for (const t of tuitionRows) {
        const paid = Math.min(remaining, t.amount);
        remaining -= paid;
        const mk = dayjs(t.paymentMonth).format("YYYY-MM");
        tuitionByMonth.set(mk, (tuitionByMonth.get(mk) ?? 0) + paid);
      }
    }
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

  // MBCS rule: all months from January are always applicable regardless of admission date
  // (admissionMonthKey not used for MBCS tuition grid)

  const TYPE_COLORS: Record<string, string> = {
    tuition: "blue",
    late_fee: "volcano",
    admission: "green",
    readmission: "cyan",
    exam: "orange",
    session_charge: "magenta",
    study_materials: "geekblue",
    study_tour: "lime",
    stationary: "purple",
    other: "default",
  };

  interface GroupedRow {
    invoiceNumber: string;
    paymentTypes: string[];
    typeLabels: string[];
    amount: number;
    dueAmount: number;
    paymentMonth: string;
    paymentDate: string;
    paymentMethod: string;
  }

  const groupedPayments = useMemo((): GroupedRow[] => {
    const invoiceMap = new Map<string, Payment[]>();
    for (const p of payments) {
      if (!invoiceMap.has(p.invoiceNumber)) invoiceMap.set(p.invoiceNumber, []);
      invoiceMap.get(p.invoiceNumber)!.push(p);
    }
    return Array.from(invoiceMap.values()).map((group) => {
      const first = group[0];
      return {
        invoiceNumber: first.invoiceNumber,
        paymentTypes: group.map((r) => r.paymentType).filter((t): t is string => t != null),
        typeLabels: group
          .map((r) =>
            r.paymentType === "study_materials" && r.notes
              ? `${r.paymentType}::${r.notes}`
              : r.paymentType,
          )
          .filter((t): t is string => t != null),
        amount: first.officePaid ?? first.officeGrandTotal ?? group.reduce((s, r) => s + r.amount, 0),
        dueAmount: first.dueAmount ?? 0,
        paymentMonth: first.paymentMonth,
        paymentDate: first.paymentDate,
        paymentMethod: first.paymentMethod,
      };
    })
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
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
      title: "Type",
      key: "paymentType",
      width: 180,
      render: (_: unknown, record: GroupedRow) => (
        <Space size={[0, 4]} wrap>
          {record.typeLabels.map((label, i) => {
            const [type, note] = label.includes("::") ? label.split("::") : [label, ""];
            return (
              <Tag key={i} color={TYPE_COLORS[type] || "default"}>
                {type.replace(/_/g, " ").toUpperCase()}{note ? ` — ${note}` : ""}
              </Tag>
            );
          })}
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
      render: (_: unknown, record: GroupedRow) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          title="View Invoice"
          onClick={() => navigate(`/mbcs/payments/invoice/${encodeURIComponent(record.invoiceNumber)}`)}
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
        style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}
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
          <Button
            icon={<DollarOutlined />}
            onClick={() => navigate(`/mbcs/payments/collect-due?studentId=${id}`)}
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
              {MBCS_CLASS_MAP[student?.class ?? -1] ?? `Class ${student?.class}`}
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
            <Statistic title="Total Payments" value={totalInvoices} />
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
            // MBCS rule: all months always applicable — no N/A state
            const isPaid = paidMonths.has(monthKey);
            const isPartial = !isPaid && partialMonths.has(monthKey);
            const bg = isPaid
              ? "#f6ffed"
              : isPartial
                ? "#fffbe6"
                : "#fff2f0";
            const borderColor = isPaid
              ? "#b7eb8f"
              : isPartial
                ? "#ffe58f"
                : "#ffccc7";
            const tagText = isPaid ? "Paid" : isPartial ? "Partial" : "Unpaid";
            const tagColor = isPaid
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

      {dueSummary && (dueSummary as { totalDue?: number }).totalDue! > 0 && (
        <Card
          title={
            <span>
              <ExclamationCircleOutlined style={{ color: "#ff4d4f", marginRight: 8 }} />
              Outstanding Due Summary
            </span>
          }
          style={{ marginBottom: 16, borderColor: "#ffccc7" }}
          styles={{ header: { color: "#cf1322" } }}
        >
          <Row gutter={16}>
            {Object.entries((dueSummary as { breakdown?: Record<string, { due: number; status: string }> }).breakdown ?? {}).map(([type, info]) => {
              if (info.status === "na") return null;
              const label = type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <Col span={6} key={type}>
                  <Statistic
                    title={label}
                    value={info.due > 0 ? `৳${info.due.toLocaleString()}` : "No Due"}
                    styles={{ content: { color: info.due > 0 ? "#cf1322" : "#52c41a", fontSize: 16 } }}
                  />
                  <Tag color={info.due > 0 ? "error" : "success"} style={{ marginTop: 4 }}>
                    {info.due > 0 ? "DUE" : "PAID"}
                  </Tag>
                </Col>
              );
            })}
          </Row>
          <Alert
            type="warning"
            title={`Total Outstanding: ৳${(dueSummary as { totalDue?: number }).totalDue?.toLocaleString()}`}
            description="Use the 'Collect Due' page to collect outstanding payments from this student."
            showIcon
            style={{ marginTop: 16 }}
          />
        </Card>
      )}

      <Card title="All Payment Records">
        <Table
          columns={columns}
          dataSource={groupedPayments}
          rowKey="invoiceNumber"
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
            .map((c) => ({ label: c === 11 ? 'Graduated' : MBCS_CLASS_MAP[c] ?? `Class ${c}`, value: c }))}
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
