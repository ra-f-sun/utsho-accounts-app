import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  Button,
  Select,
  Space,
  Tag,
  DatePicker,
  Statistic,
  Row,
  Col,
  Card,
  Tabs,
  Switch,
} from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import QueryError from "../../../components/QueryError";
import {
  paymentsService,
  UAC_PAYMENT_TYPES,
  MBCS_PAYMENT_TYPES,
} from "../../../services/paymentsService";
import type { Payment } from "../../../services/paymentsService";
import { studentsService } from "../../../services/studentsService";
import type { Student } from "../../../services/studentsService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { MBCS_CLASS_MAP, MBCS_CLASSES } from "../../../constants/mbcsClasses";

const { Option } = Select;

type OrgType = "uac" | "mbcs" | "mec";

const UAC_TYPE_COLORS: Record<string, string> = {
  tuition: "blue",
  admission: "green",
  readmission: "cyan",
  exam: "orange",
  sheet: "volcano",
  session_charge: "magenta",
  study_materials: "geekblue",
  study_tour: "lime",
  other: "default",
};

const MBCS_TYPE_COLORS: Record<string, string> = {
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

interface OrgConfig {
  secondaryFilter: "group" | "shift" | null;
  secondaryFilterLabel: string;
  secondaryFilterStaticOptions: { value: string; label: string }[] | null;
  secondaryFilterDynamic: boolean;
  classOptions: { value: number; label: string }[];
  studentSubLabel: (s: Student) => string;
  tuitionAlwaysAvailable: boolean;
  hasPaymentTypes: boolean;
  paymentTypes: { value: string; label: string }[];
  typeColors: Record<string, string>;
  showTotalCollection: boolean;
  backPath: string;
  hasVirtualUnpaidRows: boolean;
}

const ORG_CONFIG: Record<OrgType, OrgConfig> = {
  uac: {
    secondaryFilter: "group",
    secondaryFilterLabel: "Group",
    secondaryFilterStaticOptions: [
      { value: "science", label: "Science" },
      { value: "business", label: "Business" },
      { value: "humanities", label: "Humanities" },
    ],
    secondaryFilterDynamic: false,
    classOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((c) => ({
      value: c,
      label: `Class ${c}`,
    })),
    studentSubLabel: (s) =>
      `Class ${s.class}${s.group ? ` · ${s.group}` : ""}`,
    tuitionAlwaysAvailable: false,
    hasPaymentTypes: true,
    paymentTypes: UAC_PAYMENT_TYPES,
    typeColors: UAC_TYPE_COLORS,
    showTotalCollection: false,
    backPath: "payments",
    hasVirtualUnpaidRows: true,
  },
  mbcs: {
    secondaryFilter: "shift",
    secondaryFilterLabel: "Shift",
    secondaryFilterStaticOptions: null,
    secondaryFilterDynamic: true,
    classOptions: MBCS_CLASSES,
    studentSubLabel: (s) =>
      `${MBCS_CLASS_MAP[s.class!] ?? `Class ${s.class}`}${s.shift ? ` · ${s.shift}` : ""}`,
    tuitionAlwaysAvailable: true,
    hasPaymentTypes: true,
    paymentTypes: MBCS_PAYMENT_TYPES,
    typeColors: MBCS_TYPE_COLORS,
    showTotalCollection: false,
    backPath: "payments",
    hasVirtualUnpaidRows: false,
  },
  mec: {
    secondaryFilter: null,
    secondaryFilterLabel: "",
    secondaryFilterStaticOptions: null,
    secondaryFilterDynamic: false,
    classOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((c) => ({
      value: c,
      label: `Class ${c}`,
    })),
    studentSubLabel: (s) =>
      `${s.class ? `Class ${s.class}` : ""}${s.group ? ` · ${s.group}` : ""}`,
    tuitionAlwaysAvailable: false,
    hasPaymentTypes: false,
    paymentTypes: [],
    typeColors: {},
    showTotalCollection: true,
    backPath: "payment-history",
    hasVirtualUnpaidRows: false,
  },
};

interface Filters {
  paymentType?: string;
  paymentMethod?: string;
  paymentMonth?: string;
  classFilter?: number;
  secondaryFilterValue?: string;
  statusFilter?: "paid" | "unpaid";
}

interface StudentStatus {
  student: Student;
  payment?: Payment;
  isPaid: boolean;
  isAvailable: boolean;
}

interface GuardianRow {
  id: string;
  studentId: string;
  student?: Payment["student"];
  invoiceNumber: string;
  paymentTypes: string[];
  paymentMonths: string[];
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
}

interface OfficeRow {
  id: string;
  studentId: string;
  student?: Student;
  invoiceNumber?: string;
  paymentTypes: string[];
  paymentMonths: string[];
  amount: number;
  dueAmount: number;
  paymentMonth?: string;
  paymentDate?: string;
  paymentMethod?: string;
  isVirtual?: boolean;
}

export default function PaymentHistory({ org }: { org: OrgType }) {
  const navigate = useNavigate();
  const config = ORG_CONFIG[org];
  const [filters, setFilters] = useState<Filters>({
    paymentMonth: dayjs().startOf("month").toISOString(),
  });
  const [activeTab, setActiveTab] = useState("tuition-status");
  const [showDueOnly, setShowDueOnly] = useState(false);

  const { data: studentsData } = useQuery({
    queryKey: [org, "students"],
    queryFn: () => studentsService.getAll(org, undefined, 1, 1000),
  });
  const allStudents: Student[] = useMemo(
    () => studentsData?.data?.data || [],
    [studentsData],
  );

  const dynamicSecondaryOptions = useMemo<{ value: string; label: string }[]>(() => {
    if (!config.secondaryFilterDynamic || !config.secondaryFilter) return [];
    const key = config.secondaryFilter;
    return [
      ...new Set(
        allStudents.map((s) => s[key] as string | undefined).filter(Boolean) as string[],
      ),
    ].map((v) => ({ value: v, label: v }));
  }, [allStudents, config.secondaryFilterDynamic, config.secondaryFilter]);

  const secondaryOptions =
    config.secondaryFilterStaticOptions ?? dynamicSecondaryOptions;

  const {
    data: paymentsData,
    isLoading: loadingPayments,
    isError: paymentsIsError,
    error: paymentsError,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: [org, "payment-history", filters],
    queryFn: () =>
      paymentsService.getAll(
        org,
        {
          paymentType: filters.paymentType,
          paymentMethod: filters.paymentMethod,
          paymentMonth: filters.paymentMonth,
        },
        1,
        1000,
      ),
  });
  const allPayments: Payment[] = useMemo(
    () => paymentsData?.data?.data || [],
    [paymentsData],
  );

  // Tuition status: cross-reference students × payments
  const tuitionStatusRows = useMemo((): StudentStatus[] => {
    const monthStr = filters.paymentMonth
      ? dayjs(filters.paymentMonth).format("YYYY-MM")
      : dayjs().format("YYYY-MM");

    const tuitionPayments = config.hasPaymentTypes
      ? allPayments.filter(
          (p) =>
            p.paymentType === "tuition" &&
            dayjs(p.paymentMonth).format("YYYY-MM") === monthStr,
        )
      : allPayments.filter(
          (p) => dayjs(p.paymentMonth).format("YYYY-MM") === monthStr,
        );

    const paidStudentIds = new Set(tuitionPayments.map((p) => p.studentId));

    let students = allStudents.filter((s) => s.isActive !== false);
    if (filters.classFilter)
      students = students.filter((s) => s.class === filters.classFilter);
    if (filters.secondaryFilterValue && config.secondaryFilter) {
      students = students.filter(
        (s) => s[config.secondaryFilter!] === filters.secondaryFilterValue,
      );
    }

    const rows: StudentStatus[] = students.map((student) => {
      let isAvailable: boolean;
      if (config.tuitionAlwaysAvailable) {
        isAvailable = true;
      } else {
        const admMonth = student.admissionDate
          ? dayjs(student.admissionDate).format("YYYY-MM")
          : null;
        isAvailable = admMonth === null || admMonth <= monthStr;
      }
      return {
        student,
        payment: tuitionPayments.find((p) => p.studentId === student.id),
        isPaid: isAvailable && paidStudentIds.has(student.id),
        isAvailable,
      };
    });

    if (filters.statusFilter === "paid") return rows.filter((r) => r.isPaid);
    if (filters.statusFilter === "unpaid")
      return rows.filter((r) => r.isAvailable && !r.isPaid);
    return rows;
  }, [allStudents, allPayments, filters, config]);

  const paidCount = tuitionStatusRows.filter((r) => r.isPaid).length;
  const unpaidCount = tuitionStatusRows.filter(
    (r) => r.isAvailable && !r.isPaid,
  ).length;
  const totalCollection = config.showTotalCollection
    ? tuitionStatusRows
        .filter((r) => r.isPaid && r.payment)
        .reduce((sum, r) => sum + (r.payment?.amount || 0), 0)
    : 0;

  // Guardian rows
  const guardianRows = useMemo((): GuardianRow[] => {
    const invoiceMap = new Map<string, Payment[]>();
    for (const p of allPayments) {
      if (!invoiceMap.has(p.invoiceNumber)) invoiceMap.set(p.invoiceNumber, []);
      invoiceMap.get(p.invoiceNumber)!.push(p);
    }
    return Array.from(invoiceMap.values()).map((group) => {
      const first = group[0];
      if (config.hasPaymentTypes) {
        return {
          id: first.id,
          studentId: first.studentId,
          student: first.student,
          invoiceNumber: first.invoiceNumber,
          paymentTypes: group.map((p) => p.paymentType).filter((t): t is string => t != null),
          paymentMonths: [first.paymentMonth],
          amount:
            first.guardianPaid ??
            first.guardianGrandTotal ??
            group.reduce((sum, p) => sum + (p.guardianAmount ?? p.amount), 0),
          paymentDate: first.paymentDate,
          paymentMethod: first.paymentMethod,
        };
      } else {
        // MEC: no payment types, show months
        return {
          id: first.id,
          studentId: first.studentId,
          student: first.student,
          invoiceNumber: first.invoiceNumber,
          paymentTypes: [],
          paymentMonths: group.map((p) => p.paymentMonth),
          amount: group.reduce((sum, p) => sum + p.amount, 0),
          paymentDate: first.paymentDate,
          paymentMethod: first.paymentMethod,
        };
      }
    });
  }, [allPayments, config.hasPaymentTypes]);

  // Office rows
  const officeRows = useMemo((): OfficeRow[] => {
    const invoiceMap = new Map<string, Payment[]>();
    for (const p of allPayments) {
      if (!invoiceMap.has(p.invoiceNumber)) invoiceMap.set(p.invoiceNumber, []);
      invoiceMap.get(p.invoiceNumber)!.push(p);
    }
    const paymentRows: OfficeRow[] = Array.from(invoiceMap.values()).map(
      (group) => {
        const first = group[0];
        return {
          id: first.id,
          studentId: first.studentId,
          student: first.student as Student | undefined,
          invoiceNumber: first.invoiceNumber,
          paymentTypes: config.hasPaymentTypes
            ? group.map((p) => p.paymentType).filter((t): t is string => t != null)
            : [],
          paymentMonths: config.hasPaymentTypes
            ? [first.paymentMonth]
            : group.map((p) => p.paymentMonth),
          amount:
            first.officePaid ??
            first.officeGrandTotal ??
            group.reduce((sum, p) => sum + p.amount, 0),
          dueAmount: first.dueAmount ?? 0,
          paymentMonth: first.paymentMonth,
          paymentDate: first.paymentDate,
          paymentMethod: first.paymentMethod,
          isVirtual: false,
        };
      },
    );

    if (!showDueOnly) return paymentRows;

    if (!config.hasVirtualUnpaidRows) {
      return paymentRows.filter((r) => r.dueAmount > 0);
    }

    // UAC only: add virtual rows for fully-unpaid students
    const monthStr = filters.paymentMonth
      ? dayjs(filters.paymentMonth).format("YYYY-MM")
      : dayjs().format("YYYY-MM");

    const paidStudentIds = new Set(
      allPayments
        .filter(
          (p) =>
            p.paymentType === "tuition" &&
            dayjs(p.paymentMonth).format("YYYY-MM") === monthStr,
        )
        .map((p) => p.studentId),
    );

    const virtualRows: OfficeRow[] = allStudents
      .filter((s) => {
        if (paidStudentIds.has(s.id)) return false;
        if ((s.monthlyTuitionFee ?? 0) <= 0) return false;
        if (filters.classFilter && s.class !== filters.classFilter) return false;
        if (
          filters.secondaryFilterValue &&
          config.secondaryFilter &&
          s[config.secondaryFilter] !== filters.secondaryFilterValue
        )
          return false;
        const admMonth = s.admissionDate
          ? dayjs(s.admissionDate).format("YYYY-MM")
          : null;
        if (admMonth && admMonth > monthStr) return false;
        return true;
      })
      .map((s) => ({
        id: `virtual-${s.id}`,
        studentId: s.id,
        student: s,
        invoiceNumber: undefined,
        paymentTypes: ["tuition"],
        paymentMonths: [dayjs(monthStr, "YYYY-MM").toISOString()],
        amount: 0,
        dueAmount: Math.max(
          0,
          (s.monthlyTuitionFee ?? 0) - (s.discountTuition ?? 0),
        ),
        paymentMonth: dayjs(monthStr, "YYYY-MM").toISOString(),
        paymentDate: undefined,
        paymentMethod: undefined,
        isVirtual: true,
      }));

    const withDue = paymentRows.filter((r) => r.dueAmount > 0);
    return [...withDue, ...virtualRows];
  }, [allPayments, allStudents, showDueOnly, filters, config]);

  // Status columns
  const statusColumns: ColumnsType<StudentStatus> = [
    {
      title: "Student",
      key: "student",
      render: (_: unknown, record: StudentStatus) => (
        <div>
          <div>
            <strong>{record.student.name}</strong>
          </div>
          <div style={{ fontSize: 12, color: "#888" }}>
            {config.studentSubLabel(record.student)}
          </div>
        </div>
      ),
    },
    {
      title: "Monthly Fee",
      key: "fee",
      width: 120,
      render: (_: unknown, record: StudentStatus) => (
        <span>৳{record.student.monthlyTuitionFee?.toLocaleString() || "-"}</span>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_: unknown, record: StudentStatus) =>
        !record.isAvailable ? (
          <Tag color="default">N/A</Tag>
        ) : record.isPaid ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Paid
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Unpaid
          </Tag>
        ),
    },
    {
      title: "Paid Amount",
      key: "amount",
      width: 120,
      render: (_: unknown, record: StudentStatus) =>
        record.payment ? (
          <strong style={{ color: "#2e7d32" }}>
            ৳{record.payment.amount.toLocaleString()}
          </strong>
        ) : (
          <span style={{ color: "#aaa" }}>—</span>
        ),
    },
    {
      title: "Paid On",
      key: "paidOn",
      width: 110,
      render: (_: unknown, record: StudentStatus) =>
        record.payment
          ? dayjs(record.payment.paymentDate).format("DD/MM/YYYY")
          : "—",
    },
    {
      title: "Invoice",
      key: "invoice",
      width: 80,
      render: (_: unknown, record: StudentStatus) =>
        record.payment ? (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            title="View Invoice"
            onClick={() =>
              navigate(
                `/${org}/payments/invoice/${encodeURIComponent(record.payment!.invoiceNumber)}`,
              )
            }
          />
        ) : null,
    },
    {
      title: "Action",
      key: "action",
      width: 130,
      render: (_: unknown, record: StudentStatus) =>
        !record.isAvailable ? null : !record.isPaid ? (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() =>
              navigate(`/${org}/payments/record?studentId=${record.student.id}`)
            }
          >
            Collect
          </Button>
        ) : (
          <Button
            size="small"
            onClick={() =>
              navigate(`/${org}/payments/record?studentId=${record.student.id}`)
            }
          >
            Pay Again
          </Button>
        ),
    },
  ];

  const renderTypeOrMonthCell = (row: GuardianRow | OfficeRow) => {
    if (config.hasPaymentTypes) {
      return (
        <Space size={[0, 4]} wrap>
          {row.paymentTypes.map((type, i) => (
            <Tag key={i} color={config.typeColors[type] || "default"}>
              {type.replace(/_/g, " ").toUpperCase()}
            </Tag>
          ))}
        </Space>
      );
    }
    return (
      <Space size={[4, 4]} wrap>
        {row.paymentMonths.map((m, i) => (
          <Tag key={i} color="blue">
            {dayjs(m).format("MMM YYYY")}
          </Tag>
        ))}
      </Space>
    );
  };

  const guardianColumns: ColumnsType<GuardianRow> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 150,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Student",
      key: "student",
      render: (_: unknown, record: GuardianRow) => (
        <div>
          <strong>{record.student?.name}</strong>
          <div style={{ fontSize: 12, color: "#888" }}>
            {config.hasPaymentTypes
              ? config.studentSubLabel(record.student as Student)
              : record.student?.class
                ? `Class ${record.student.class}`
                : ""}
          </div>
        </div>
      ),
    },
    {
      title: config.hasPaymentTypes ? "Type" : "Month(s)",
      key: "typeOrMonth",
      width: 180,
      render: (_: unknown, record: GuardianRow) => renderTypeOrMonthCell(record),
    },
    {
      title: "Amount (Guardian)",
      key: "guardianAmount",
      width: 140,
      render: (_: unknown, record: GuardianRow) => (
        <strong style={{ color: "#2e7d32" }}>
          ৳{record.amount.toLocaleString()}
        </strong>
      ),
    },
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 100,
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 100,
      render: (method: string) =>
        method ? <Tag>{method.toUpperCase()}</Tag> : "-",
    },
    {
      title: "Actions",
      key: "invoice",
      width: 80,
      render: (_: unknown, record: GuardianRow) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          title="View Invoice"
          onClick={() =>
            navigate(
              `/${org}/payments/invoice/${encodeURIComponent(record.invoiceNumber)}`,
            )
          }
        />
      ),
    },
  ];

  const officeColumns: ColumnsType<OfficeRow> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 150,
      render: (text: string, record: OfficeRow) =>
        record.isVirtual ? (
          <Tag color="warning">Unpaid</Tag>
        ) : (
          <strong>{text}</strong>
        ),
    },
    {
      title: "Student",
      key: "student",
      render: (_: unknown, record: OfficeRow) => (
        <div>
          <strong>{record.student?.name}</strong>
          <div style={{ fontSize: 12, color: "#888" }}>
            {record.student
              ? config.studentSubLabel(record.student as Student)
              : ""}
          </div>
        </div>
      ),
    },
    {
      title: config.hasPaymentTypes ? "Type" : "Month(s)",
      key: "typeOrMonth",
      width: 180,
      render: (_: unknown, record: OfficeRow) => renderTypeOrMonthCell(record),
    },
    {
      title: "Amount (Office)",
      key: "amount",
      width: 130,
      render: (_: unknown, record: OfficeRow) =>
        record.isVirtual ? (
          <span style={{ color: "#aaa" }}>—</span>
        ) : (
          <div>
            <strong style={{ color: "#2e7d32" }}>
              ৳{record.amount.toLocaleString()}
            </strong>
            {(record.dueAmount ?? 0) > 0 && (
              <div style={{ fontSize: 12, color: "#d32f2f" }}>
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
      width: 100,
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 100,
      render: (method: string) =>
        method ? <Tag>{method.toUpperCase()}</Tag> : "-",
    },
    {
      title: "Actions",
      key: "action",
      width: 130,
      render: (_: unknown, record: OfficeRow) => (
        <Space>
          {!record.isVirtual && record.invoiceNumber && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              title="View Invoice"
              onClick={() =>
                navigate(
                  `/${org}/payments/invoice/${encodeURIComponent(record.invoiceNumber!)}`,
                )
              }
            />
          )}
          {record.dueAmount > 0 && (
            <Button
              type="primary"
              size="small"
              danger
              onClick={() =>
                navigate(
                  record.isVirtual
                    ? `/${org}/payments/record?studentId=${record.studentId}`
                    : `/${org}/payments/collect-due?studentId=${record.studentId}`,
                )
              }
            >
              {record.isVirtual ? "Collect" : "Collect Due"}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const sharedFilters = (
    <Space wrap style={{ marginBottom: 16 }}>
      {config.classOptions.length > 0 && (
        <Select
          placeholder="Class"
          style={{ width: 130 }}
          onChange={(value) =>
            setFilters((prev) => ({ ...prev, classFilter: value }))
          }
          allowClear
        >
          {config.classOptions.map(({ value, label }) => (
            <Option key={value} value={value}>
              {label}
            </Option>
          ))}
        </Select>
      )}
      {config.secondaryFilter !== null && (
        <Select
          placeholder={config.secondaryFilterLabel}
          style={{ width: 130 }}
          onChange={(value) =>
            setFilters((prev) => ({ ...prev, secondaryFilterValue: value }))
          }
          allowClear
        >
          {secondaryOptions.map(({ value, label }) => (
            <Option key={value} value={value}>
              {label}
            </Option>
          ))}
        </Select>
      )}
      <DatePicker
        picker="month"
        placeholder="Month"
        format="MMM YYYY"
        defaultValue={dayjs()}
        onChange={(date) =>
          setFilters((prev) => ({
            ...prev,
            paymentMonth: date ? date.startOf("month").toISOString() : undefined,
          }))
        }
      />
      {activeTab === "tuition-status" && (
        <Select
          placeholder="Status"
          style={{ width: 120 }}
          onChange={(value) =>
            setFilters((prev) => ({ ...prev, statusFilter: value }))
          }
          allowClear
        >
          <Option value="paid">Paid</Option>
          <Option value="unpaid">Unpaid</Option>
        </Select>
      )}
      {config.hasPaymentTypes &&
        (activeTab === "guardian-records" || activeTab === "office-records") && (
          <>
            <Select
              placeholder="Payment Type"
              style={{ width: 150 }}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  paymentType: value || undefined,
                }))
              }
              allowClear
            >
              {config.paymentTypes.map((pt) => (
                <Option key={pt.value} value={pt.value}>
                  {pt.label}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Method"
              style={{ width: 140 }}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  paymentMethod: value || undefined,
                }))
              }
              allowClear
            >
              <Option value="cash">Cash</Option>
              <Option value="bkash">bKash</Option>
              <Option value="nagad">Nagad</Option>
              <Option value="bank_transfer">Bank Transfer</Option>
            </Select>
          </>
        )}
      {!config.hasPaymentTypes &&
        (activeTab === "guardian-records" || activeTab === "office-records") && (
          <Select
            placeholder="Method"
            style={{ width: 150 }}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                paymentMethod: value || undefined,
              }))
            }
            allowClear
          >
            <Option value="cash">Cash</Option>
            <Option value="bkash">bKash</Option>
            <Option value="nagad">Nagad</Option>
            <Option value="bank_transfer">Bank Transfer</Option>
          </Select>
        )}
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => navigate(`/${org}/payments/record`)}
      >
        Record Payment
      </Button>
    </Space>
  );

  if (paymentsIsError)
    return (
      <QueryError error={paymentsError as Error} onRetry={refetchPayments} />
    );

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Students" value={tuitionStatusRows.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Paid"
              value={paidCount}
              styles={{ content: { color: "#52c41a" } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Unpaid"
              value={unpaidCount}
              styles={{ content: { color: "#ff4d4f" } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Collection Rate"
              value={
                tuitionStatusRows.length > 0
                  ? Math.round((paidCount / tuitionStatusRows.length) * 100)
                  : 0
              }
              suffix="%"
              styles={{
                content: {
                  color:
                    paidCount / (tuitionStatusRows.length || 1) > 0.7
                      ? "#52c41a"
                      : "#fa8c16",
                },
              }}
            />
          </Card>
        </Col>
      </Row>

      {config.showTotalCollection && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card size="small">
              <Statistic
                title="Total Collected (this month)"
                value={`৳${totalCollection.toLocaleString()}`}
                styles={{ content: { color: "#2e7d32", fontSize: 18 } }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {sharedFilters}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "tuition-status",
            label: `Tuition Status (${tuitionStatusRows.length})`,
            children: (
              <Table
                columns={statusColumns}
                dataSource={tuitionStatusRows}
                rowKey={(r) => r.student.id}
                loading={loadingPayments}
                rowClassName={(r) => (!r.isPaid ? "unpaid-row" : "")}
                pagination={{
                  pageSize: 15,
                  showSizeChanger: true,
                  showTotal: (total) => `${total} students`,
                }}
              />
            ),
          },
          {
            key: "guardian-records",
            label: `Guardian Records (${guardianRows.length})`,
            children: (
              <Table
                columns={guardianColumns}
                dataSource={guardianRows}
                rowKey="id"
                loading={loadingPayments}
                pagination={{
                  pageSize: 15,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} payments`,
                }}
                summary={(pageData) => {
                  const total = pageData.reduce((sum, row) => sum + row.amount, 0);
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}>
                        <strong>Page Total</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        <strong style={{ color: "#2e7d32" }}>
                          ৳{total.toLocaleString()}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} colSpan={3} />
                    </Table.Summary.Row>
                  );
                }}
              />
            ),
          },
          {
            key: "office-records",
            label: `Office Records (${officeRows.length})`,
            children: (
              <div>
                <Space style={{ marginBottom: 12 }}>
                  <span style={{ fontWeight: 500 }}>Show Due Only:</span>
                  <Switch checked={showDueOnly} onChange={setShowDueOnly} />
                  {showDueOnly && (
                    <Tag color="error">{officeRows.length} with due</Tag>
                  )}
                </Space>
                <Table
                  columns={officeColumns}
                  dataSource={officeRows}
                  rowKey="id"
                  loading={loadingPayments}
                  pagination={{
                    pageSize: 15,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} payments`,
                  }}
                  summary={(pageData) => {
                    const total = pageData.reduce(
                      (sum, row) => sum + row.amount,
                      0,
                    );
                    const totalDue = pageData.reduce(
                      (sum, row) => sum + row.dueAmount,
                      0,
                    );
                    return (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>
                          <strong>Page Total</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>
                          <div>
                            <strong style={{ color: "#2e7d32" }}>
                              ৳{total.toLocaleString()}
                            </strong>
                            {totalDue > 0 && (
                              <div style={{ fontSize: 12, color: "#d32f2f" }}>
                                Due: ৳{totalDue.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} colSpan={3} />
                      </Table.Summary.Row>
                    );
                  }}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
