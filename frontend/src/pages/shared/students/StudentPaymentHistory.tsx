import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Button,
  Card,
  Statistic,
  Row,
  Col,
  Tag,
  Spin,
  App,
  Modal,
  Select,
  Input,
  Alert,
  Space,
} from "antd";
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
import type { Student } from "../../../services/studentsService";
import type { Payment } from "../../../services/paymentsService";
import type { ColumnsType } from "antd/es/table";
import QueryError from "../../../components/QueryError";
import dayjs from "dayjs";
import { MBCS_CLASS_MAP } from "../../../constants/mbcsClasses";
import { uacClassLabel } from "../../../constants/uacClasses";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type OrgType = "uac" | "mbcs" | "mec";

const UAC_TYPE_COLORS: Record<string, string> = {
  tuition: "blue", admission: "green", readmission: "cyan", exam: "orange",
  sheet: "purple", session_charge: "magenta", study_materials: "geekblue",
  study_tour: "lime", other: "default",
};

const MBCS_TYPE_COLORS: Record<string, string> = {
  tuition: "blue", late_fee: "volcano", admission: "green", readmission: "cyan",
  exam: "orange", session_charge: "magenta", study_materials: "geekblue",
  study_tour: "lime", stationary: "purple", other: "default",
};

interface OrgConfig {
  hasPaymentTypes: boolean;
  typeColors: Record<string, string>;
  studentSubtitle: (s: Student) => string;
  tuitionAlwaysAvailable: boolean;
  promoteOptions: (currentClass: number | undefined) => { label: string; value: number }[];
  dueSummaryVariant: "breakdown" | "simple";
}

const ORG_CONFIG: Record<OrgType, OrgConfig> = {
  uac: {
    hasPaymentTypes: true,
    typeColors: UAC_TYPE_COLORS,
    studentSubtitle: (s) =>
      `${uacClassLabel(s.class ?? 0)}${s.group ? ` (${s.group})` : ""}`,
    tuitionAlwaysAvailable: false,
    promoteOptions: (cls) =>
      [9, 10, 11, 12, 13]
        .filter((c) => c > (cls ?? 0))
        .map((c) => ({ label: c === 13 ? "Graduated (Class 13)" : `Class ${c}`, value: c })),
    dueSummaryVariant: "breakdown",
  },
  mbcs: {
    hasPaymentTypes: true,
    typeColors: MBCS_TYPE_COLORS,
    studentSubtitle: (s) =>
      `${MBCS_CLASS_MAP[s.class ?? -1] ?? `Class ${s.class}`}${s.shift ? ` — ${s.shift}` : ""}`,
    tuitionAlwaysAvailable: true,
    promoteOptions: (cls) =>
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        .filter((c) => c > (cls ?? -1))
        .map((c) => ({
          label: c === 11 ? "Graduated" : MBCS_CLASS_MAP[c] ?? `Class ${c}`,
          value: c,
        })),
    dueSummaryVariant: "breakdown",
  },
  mec: {
    hasPaymentTypes: false,
    typeColors: {},
    studentSubtitle: (s) =>
      `${s.class ? `Class ${s.class}` : ""}${s.group ? ` — ${s.group}` : ""}`,
    tuitionAlwaysAvailable: false,
    promoteOptions: (cls) =>
      Array.from({ length: 20 }, (_, i) => i + 1)
        .filter((c) => c > (cls ?? 0))
        .map((c) => ({ label: `Class ${c}`, value: c })),
    dueSummaryVariant: "simple",
  },
};

interface GroupedRow {
  invoiceNumber: string;
  paymentTypes: string[];
  typeLabels: string[];
  paymentMonths: string[];
  amount: number;
  dueAmount: number;
  paymentDate: string;
  paymentMethod: string;
}

export default function StudentPaymentHistory({ org }: { org: OrgType }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const config = ORG_CONFIG[org];

  const disassociateMutation = useMutation({
    mutationFn: () => studentsService.disassociate(org, id!),
    onSuccess: () => {
      message.success("Student marked as no longer associated");
      void queryClient.invalidateQueries({ queryKey: [org, "student", id] });
      void queryClient.invalidateQueries({ queryKey: [org, "students"] });
    },
    onError: () => message.error("Failed to disassociate student"),
  });

  const reassociateMutation = useMutation({
    mutationFn: () => studentsService.reassociate(org, id!),
    onSuccess: () => {
      message.success("Student re-associated successfully");
      void queryClient.invalidateQueries({ queryKey: [org, "student", id] });
      void queryClient.invalidateQueries({ queryKey: [org, "students"] });
    },
    onError: () => message.error("Failed to re-associate student"),
  });

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteToClass, setPromoteToClass] = useState<number | undefined>(undefined);
  const [promoteNotes, setPromoteNotes] = useState("");

  const promoteMutation = useMutation({
    mutationFn: () =>
      studentsService.promote(org, id!, {
        toClass: promoteToClass!,
        notes: promoteNotes || undefined,
      }),
    onSuccess: () => {
      message.success("Student promoted successfully");
      setPromoteOpen(false);
      setPromoteToClass(undefined);
      setPromoteNotes("");
      void queryClient.invalidateQueries({ queryKey: [org, "student", id] });
      void queryClient.invalidateQueries({ queryKey: [org, "students"] });
    },
    onError: () => message.error("Failed to promote student"),
  });

  const { data: studentData, isLoading: loadingStudent } = useQuery({
    queryKey: [org, "student", id],
    queryFn: () => studentsService.getOne(org, id!),
    enabled: !!id,
  });

  const student = studentData?.data as Student | undefined;

  const {
    data: paymentsData,
    isLoading: loadingPayments,
    isError: paymentsIsError,
    error: paymentsError,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: [org, "payments", { studentId: id }],
    queryFn: () => paymentsService.getAll(org, { studentId: id }, 1, 1000),
    enabled: !!id,
  });

  const { data: dueSummaryData } = useQuery({
    queryKey: ["due-summary", org, id],
    queryFn: () => paymentsService.getDueSummary(org, id!),
    enabled: !!id,
  });

  const dueSummary = dueSummaryData?.data;

  const payments: Payment[] = useMemo(
    () => paymentsData?.data?.data || [],
    [paymentsData],
  );

  const invoiceMap = useMemo(() => {
    const m = new Map<string, Payment[]>();
    for (const p of payments) {
      if (!m.has(p.invoiceNumber)) m.set(p.invoiceNumber, []);
      m.get(p.invoiceNumber)!.push(p);
    }
    return m;
  }, [payments]);

  const totalPaid = Array.from(invoiceMap.values()).reduce(
    (sum, rows) => sum + (rows[0].officePaid ?? rows.reduce((s, r) => s + r.amount, 0)),
    0,
  );
  const totalInvoices = invoiceMap.size;

  const currentYear = new Date().getFullYear();
  const monthlyTuition = (student?.monthlyTuitionFee ?? 0) - (student?.discountTuition ?? 0);

  const tuitionByMonth = useMemo(() => {
    const m = new Map<string, number>();
    const groups = new Map<string, Payment[]>();
    for (const p of payments) {
      const inv = p.invoiceNumber ?? `__${p.id}`;
      if (!groups.has(inv)) groups.set(inv, []);
      groups.get(inv)!.push(p);
    }
    for (const rows of groups.values()) {
      const { officePaid = 0, isDueCollection } = rows[0];
      const relevant = config.hasPaymentTypes
        ? rows.filter((r) => r.paymentType === "tuition")
        : rows;
      if (isDueCollection) {
        for (const r of relevant) {
          const mk = dayjs(r.paymentMonth).format("YYYY-MM");
          m.set(mk, (m.get(mk) ?? 0) + r.amount);
        }
      } else {
        let remaining = officePaid;
        for (const r of relevant) {
          const paid = Math.min(remaining, r.amount);
          remaining -= paid;
          const mk = dayjs(r.paymentMonth).format("YYYY-MM");
          m.set(mk, (m.get(mk) ?? 0) + paid);
        }
      }
    }
    return m;
  }, [payments, config.hasPaymentTypes]);

  const paidMonths = new Set<string>();
  const partialMonths = new Set<string>();
  for (const [key, total] of tuitionByMonth) {
    if (monthlyTuition > 0 && total >= monthlyTuition) paidMonths.add(key);
    else if (total > 0) partialMonths.add(key);
  }

  const admissionMonthKey =
    !config.tuitionAlwaysAvailable && student?.admissionDate
      ? dayjs(student.admissionDate).format("YYYY-MM")
      : null;

  const groupedPayments = useMemo((): GroupedRow[] => {
    const m = new Map<string, Payment[]>();
    for (const p of payments) {
      if (!m.has(p.invoiceNumber)) m.set(p.invoiceNumber, []);
      m.get(p.invoiceNumber)!.push(p);
    }
    return Array.from(m.values())
      .map((group) => {
        const first = group[0];
        return {
          invoiceNumber: first.invoiceNumber,
          paymentTypes: config.hasPaymentTypes
            ? group.map((r) => r.paymentType).filter((t): t is string => t != null)
            : [],
          typeLabels: config.hasPaymentTypes
            ? group
                .map((r) =>
                  r.paymentType === "study_materials" && r.notes
                    ? `${r.paymentType}::${r.notes}`
                    : r.paymentType,
                )
                .filter((t): t is string => t != null)
            : [],
          paymentMonths: config.hasPaymentTypes
            ? [first.paymentMonth]
            : group.map((r) => r.paymentMonth),
          amount:
            first.officePaid ?? first.officeGrandTotal ?? group.reduce((s, r) => s + r.amount, 0),
          dueAmount: first.dueAmount ?? 0,
          paymentDate: first.paymentDate,
          paymentMethod: first.paymentMethod,
        };
      })
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [payments, config.hasPaymentTypes]);

  const columns: ColumnsType<GroupedRow> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 150,
      render: (text: string) => <strong>{text}</strong>,
    },
    config.hasPaymentTypes
      ? {
          title: "Type",
          key: "paymentType",
          width: 180,
          render: (_: unknown, record: GroupedRow) => (
            <Space size={[0, 4]} wrap>
              {record.typeLabels.map((label, i) => {
                const [type, note] = label.includes("::") ? label.split("::") : [label, ""];
                return (
                  <Tag key={i} color={config.typeColors[type] || "default"}>
                    {type.replace(/_/g, " ").toUpperCase()}
                    {note ? ` — ${note}` : ""}
                  </Tag>
                );
              })}
            </Space>
          ),
        }
      : {
          title: "Month(s)",
          key: "paymentMonths",
          render: (_: unknown, record: GroupedRow) => (
            <Space size={[4, 4]} wrap>
              {record.paymentMonths.map((m, i) => (
                <Tag key={i} color="blue">
                  {dayjs(m).format("MMM YYYY")}
                </Tag>
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
    ...(config.hasPaymentTypes
      ? [
          {
            title: "Month",
            dataIndex: "paymentMonths",
            key: "paymentMonth",
            width: 120,
            render: (months: string[]) => dayjs(months[0]).format("MMM YYYY"),
          },
        ]
      : []),
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
          onClick={() =>
            navigate(`/${org}/payments/invoice/${encodeURIComponent(record.invoiceNumber)}`)
          }
        />
      ),
    },
  ];

  if (paymentsIsError)
    return <QueryError error={paymentsError as Error} onRetry={refetchPayments} />;

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
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${org}/students`)}>
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
              onClick={() => navigate(`/${org}/payments/record?studentId=${id}`)}
            >
              Record Payment
            </Button>
            <Button
              icon={<DollarOutlined />}
              onClick={() => navigate(`/${org}/payments/collect-due?studentId=${id}`)}
            >
              Collect Due
            </Button>
          </div>
        </div>

        {/* Student info card */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={24}>
            <Col span={8}>
              <Statistic
                title="Student"
                value={student?.name || "Loading..."}
                styles={{ content: { fontSize: 18 } }}
              />
              <div style={{ color: "#888", fontSize: 13 }}>
                {config.studentSubtitle(student ?? ({} as Student))}
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

        {/* Monthly tuition status grid */}
        <Card title="Tuition Payment Status (Current Year)" style={{ marginBottom: 16 }}>
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
              const tagText = isBeforeAdmission
                ? "N/A"
                : isPaid
                  ? "Paid"
                  : isPartial
                    ? "Partial"
                    : "Unpaid";
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
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{month.slice(0, 3)}</div>
                    <Tag color={tagColor} style={{ margin: 0 }}>
                      {tagText}
                    </Tag>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Card>

        {/* Due summary */}
        {dueSummary && (dueSummary as { totalDue?: number }).totalDue! > 0 && (
          <Card
            title={
              <span>
                <ExclamationCircleOutlined style={{ color: "#ff4d4f", marginRight: 8 }} />
                Outstanding Due
                {config.dueSummaryVariant === "breakdown" ? " Summary" : ""}
              </span>
            }
            style={{ marginBottom: 16, borderColor: "#ffccc7" }}
            styles={{ header: { color: "#cf1322" } }}
          >
            {config.dueSummaryVariant === "breakdown" ? (
              <Row gutter={16}>
                {Object.entries(
                  (
                    dueSummary as {
                      breakdown?: Record<string, { due: number; status: string }>;
                    }
                  ).breakdown ?? {},
                ).map(([type, info]) => {
                  if (info.status === "na") return null;
                  const label =
                    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <Col span={6} key={type}>
                      <Statistic
                        title={label}
                        value={info.due > 0 ? `৳${info.due.toLocaleString()}` : "No Due"}
                        styles={{
                          content: { color: info.due > 0 ? "#cf1322" : "#52c41a", fontSize: 16 },
                        }}
                      />
                      <Tag color={info.due > 0 ? "error" : "success"} style={{ marginTop: 4 }}>
                        {info.due > 0 ? "DUE" : "PAID"}
                      </Tag>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Tuition Due"
                    value={`৳${(
                      dueSummary as {
                        breakdown?: { tuition?: { due?: number } };
                      }
                    ).breakdown?.tuition?.due?.toLocaleString() ?? 0}`}
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
            )}
            <Alert
              type="warning"
              title={`Total Outstanding: ৳${(dueSummary as { totalDue?: number }).totalDue?.toLocaleString()}`}
              description="Use the 'Collect Due' page to collect outstanding payments from this student."
              showIcon
              style={{ marginTop: 16 }}
            />
          </Card>
        )}

        {/* Payment records table */}
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

      {/* Promote modal */}
      <Modal
        title={`Promote ${student?.name ?? "Student"}`}
        open={promoteOpen}
        onCancel={() => {
          setPromoteOpen(false);
          setPromoteToClass(undefined);
          setPromoteNotes("");
        }}
        onOk={() => promoteMutation.mutate()}
        okText="Promote"
        confirmLoading={promoteMutation.isPending}
        okButtonProps={{ disabled: !promoteToClass }}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>Promote to Class</div>
          <Select
            style={{ width: "100%" }}
            placeholder="Select new class"
            value={promoteToClass}
            onChange={setPromoteToClass}
            options={config.promoteOptions(student?.class)}
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
