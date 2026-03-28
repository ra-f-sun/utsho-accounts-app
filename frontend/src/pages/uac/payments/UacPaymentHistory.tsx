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
import { paymentsService } from "../../../services/paymentsService";
import type { Payment } from "../../../services/paymentsService";
import { studentsService } from "../../../services/studentsService";
import type { Student } from "../../../services/studentsService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import QueryError from "../../../components/QueryError";

const { Option } = Select;

const PAYMENT_TYPE_COLORS: Record<string, string> = {
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

interface Filters {
  paymentType?: string;
  paymentMethod?: string;
  paymentMonth?: string;
  classFilter?: number;
  groupFilter?: string;
  statusFilter?: "paid" | "unpaid";
}

interface StudentStatus {
  student: Student;
  payment?: Payment;
  isPaid: boolean;
  isAvailable: boolean;
}

export default function UacPaymentHistory() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>({
    paymentMonth: dayjs().startOf("month").toISOString(),
  });
  const [activeTab, setActiveTab] = useState("tuition-status");
  const [showDueOnly, setShowDueOnly] = useState(false);

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ["uac", "students"],
    queryFn: () => studentsService.getAll("uac", undefined, 1, 1000),
  });
  const allStudents: Student[] = useMemo(() => studentsData?.data?.data || [], [studentsData]);

  // Fetch all payments (with any active filters for the records tab)
  const { data: paymentsData, isLoading: loadingPayments, isError: paymentsIsError, error: paymentsError, refetch: refetchPayments } = useQuery({
    queryKey: ["uac", "payment-history", filters],
    queryFn: () =>
      paymentsService.getAll("uac", {
        paymentType: filters.paymentType,
        paymentMethod: filters.paymentMethod,
        paymentMonth: filters.paymentMonth,
      }),
  });
  const allPayments: Payment[] = useMemo(() => paymentsData?.data?.data || [], [paymentsData]);

  // --- Tuition Status tab: cross-reference students × payments for selected month ---
  const tuitionStatusRows = useMemo((): StudentStatus[] => {
    const monthStr = filters.paymentMonth
      ? dayjs(filters.paymentMonth).format("YYYY-MM")
      : dayjs().format("YYYY-MM");

    // Fetch tuition payments for the selected month (all payments filtered client-side)
    const tuitionPayments = allPayments.filter(
      (p) =>
        p.paymentType === "tuition" &&
        dayjs(p.paymentMonth).format("YYYY-MM") === monthStr,
    );
    const paidStudentIds = new Set(tuitionPayments.map((p) => p.studentId));

    let students = allStudents;
    if (filters.classFilter)
      students = students.filter((s) => s.class === filters.classFilter);
    if (filters.groupFilter)
      students = students.filter((s) => s.group === filters.groupFilter);

    const rows: StudentStatus[] = students.map((student) => {
      const admMonth = student.admissionDate
        ? dayjs(student.admissionDate).format("YYYY-MM")
        : null;
      const isAvailable = admMonth === null || admMonth <= monthStr;
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
  }, [allStudents, allPayments, filters]);

  const paidCount = tuitionStatusRows.filter((r) => r.isPaid).length;
  const unpaidCount = tuitionStatusRows.filter(
    (r) => r.isAvailable && !r.isPaid,
  ).length;

  // --- Student status columns ---
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
            Class {record.student.class}
            {record.student.group ? ` · ${record.student.group}` : ""}
          </div>
        </div>
      ),
    },
    {
      title: "Monthly Fee",
      key: "fee",
      width: 120,
      render: (_: unknown, record: StudentStatus) => (
        <span>
          ৳{record.student.monthlyTuitionFee?.toLocaleString() || "-"}
        </span>
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
              navigate(`/uac/payments/invoice/${encodeURIComponent(record.payment!.invoiceNumber)}`)
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
              navigate(`/uac/payments/record?studentId=${record.student.id}`)
            }
          >
            Collect
          </Button>
        ) : (
          <Button
            size="small"
            onClick={() =>
              navigate(`/uac/payments/record?studentId=${record.student.id}`)
            }
          >
            Pay Again
          </Button>
        ),
    },
  ];

  // --- All payments columns ---
  // Guardian row: grouped by invoiceNumber
  interface GuardianRow {
    id: string;
    studentId: string;
    student?: Payment["student"];
    invoiceNumber: string;
    paymentTypes: string[];
    amount: number;
    paymentMonth?: string;
    paymentDate?: string;
    paymentMethod?: string;
  }

  const guardianRows = useMemo((): GuardianRow[] => {
    const invoiceMap = new Map<string, Payment[]>();
    for (const p of allPayments) {
      const key = p.invoiceNumber;
      if (!invoiceMap.has(key)) invoiceMap.set(key, []);
      invoiceMap.get(key)!.push(p);
    }
    return Array.from(invoiceMap.values()).map((group) => {
      const first = group[0];
      return {
        id: first.id,
        studentId: first.studentId,
        student: first.student,
        invoiceNumber: first.invoiceNumber,
        paymentTypes: group.map((p) => p.paymentType),
        amount: first.guardianPaid ?? first.guardianGrandTotal ?? group.reduce((sum, p) => sum + (p.guardianAmount ?? p.amount), 0),
        paymentMonth: first.paymentMonth,
        paymentDate: first.paymentDate,
        paymentMethod: first.paymentMethod,
      };
    });
  }, [allPayments]);

  // Guardian-facing payments columns (shows guardianAmount)
  const paymentsColumns: ColumnsType<GuardianRow> = [
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
      render: (_: unknown, record: GuardianRow) => {
        const student = record.student;
        return (
          <div>
            <strong>{student?.name}</strong>
            <div style={{ fontSize: 12, color: "#888" }}>
              Class {student?.class}
              {student?.group ? ` · ${student.group}` : ""}
            </div>
          </div>
        );
      },
    },
    {
      title: "Type",
      key: "paymentType",
      width: 180,
      render: (_: unknown, record: GuardianRow) => (
        <Space size={[0, 4]} wrap>
          {record.paymentTypes.map((type, i) => (
            <Tag key={i} color={PAYMENT_TYPE_COLORS[type] || "default"}>
              {type.replace(/_/g, " ").toUpperCase()}
            </Tag>
          ))}
        </Space>
      ),
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
      title: "Month",
      dataIndex: "paymentMonth",
      key: "paymentMonth",
      width: 110,
      render: (date: string) => (date ? dayjs(date).format("MMM YYYY") : "-"),
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
          onClick={() => navigate(`/uac/payments/invoice/${encodeURIComponent(record.invoiceNumber)}`)}
        />
      ),
    },
  ];

  // Office-facing payments columns (shows actual/office amounts + due)
  const officeColumns: ColumnsType<OfficeRow> = [
    {
      title: "Invoice #",
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
      render: (_: unknown, record: OfficeRow) => {
        const student = record.student;
        return (
          <div>
            <strong>{student?.name}</strong>
            <div style={{ fontSize: 12, color: "#888" }}>
              Class {student?.class}
              {student?.group ? ` · ${student.group}` : ""}
            </div>
          </div>
        );
      },
    },
    {
      title: "Type",
      key: "paymentType",
      width: 180,
      render: (_: unknown, record: OfficeRow) => (
        <Space size={[0, 4]} wrap>
          {record.paymentTypes.map((type, i) => (
            <Tag key={i} color={PAYMENT_TYPE_COLORS[type] || "default"}>
              {type.replace(/_/g, " ").toUpperCase()}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Amount (Office)",
      dataIndex: "amount",
      key: "amount",
      width: 130,
      render: (amount: number, record: OfficeRow) =>
        record.isVirtual ? (
          <span style={{ color: "#aaa" }}>—</span>
        ) : (
          <div>
            <strong style={{ color: "#2e7d32" }}>৳{amount.toLocaleString()}</strong>
            {(record.dueAmount ?? 0) > 0 && (
              <div style={{ fontSize: 12, color: "#d32f2f" }}>
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
      width: 110,
      render: (date: string) => (date ? dayjs(date).format("MMM YYYY") : "-"),
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
        method ? (
          <Tag>{method.toUpperCase()}</Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Actions",
      key: "action",
      width: 130,
      render: (_: unknown, record: OfficeRow) => (
        <Space>
          {!record.isVirtual && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              title="View Invoice"
              onClick={() => navigate(`/uac/payments/invoice/${encodeURIComponent(record.invoiceNumber!)}`)}
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
                    ? `/uac/payments/record?studentId=${record.studentId}`
                    : `/uac/payments/collect-due?studentId=${record.studentId}`,
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
      <Select
        placeholder="Class"
        style={{ width: 110 }}
        onChange={(value) =>
          setFilters((prev) => ({ ...prev, classFilter: value }))
        }
        allowClear
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((cls) => (
          <Option key={cls} value={cls}>
            Class {cls}
          </Option>
        ))}
      </Select>
      <Select
        placeholder="Group"
        style={{ width: 130 }}
        onChange={(value) =>
          setFilters((prev) => ({ ...prev, groupFilter: value }))
        }
        allowClear
      >
        <Option value="science">Science</Option>
        <Option value="business">Business</Option>
        <Option value="humanities">Humanities</Option>
      </Select>
      <DatePicker
        picker="month"
        placeholder="Month"
        format="MMM YYYY"
        defaultValue={dayjs()}
        onChange={(date) =>
          setFilters((prev) => ({
            ...prev,
            paymentMonth: date
              ? date.startOf("month").toISOString()
              : undefined,
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
      {(activeTab === "guardian-records" || activeTab === "office-records") && (
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
            <Option value="tuition">Tuition</Option>
            <Option value="admission">Admission</Option>
            <Option value="readmission">Re-admission</Option>
            <Option value="exam">Exam</Option>
            <Option value="sheet">Sheet</Option>
            <Option value="session_charge">Session Charge</Option>
            <Option value="study_materials">Study Materials</Option>
            <Option value="study_tour">Study Tour</Option>
            <Option value="other">Other</Option>
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
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => navigate("/uac/payments/record")}
      >
        Record Payment
      </Button>
    </Space>
  );

  // Office records: grouped by invoiceNumber + virtual rows for fully-unpaid students (when showDueOnly)
  interface OfficeRow {
    id: string;
    studentId: string;
    student?: Student;
    invoiceNumber?: string;
    paymentTypes: string[];
    amount: number;
    dueAmount: number;
    paymentMonth?: string;
    paymentDate?: string;
    paymentMethod?: string;
    isVirtual?: boolean;
  }

  const officeRows = useMemo((): OfficeRow[] => {
    // Group payments by invoiceNumber to show one row per invoice (office copy)
    const invoiceMap = new Map<string, Payment[]>();
    for (const p of allPayments) {
      const key = p.invoiceNumber;
      if (!invoiceMap.has(key)) invoiceMap.set(key, []);
      invoiceMap.get(key)!.push(p);
    }

    const paymentRows: OfficeRow[] = Array.from(invoiceMap.values()).map((group) => {
      const first = group[0];
      return {
        id: first.id,
        studentId: first.studentId,
        student: first.student as Student | undefined,
        invoiceNumber: first.invoiceNumber,
        paymentTypes: group.map((p) => p.paymentType),
        amount: first.officePaid ?? first.officeGrandTotal ?? group.reduce((sum, p) => sum + p.amount, 0),
        dueAmount: first.dueAmount ?? 0,
        paymentMonth: first.paymentMonth,
        paymentDate: first.paymentDate,
        paymentMethod: first.paymentMethod,
        isVirtual: false,
      };
    });

    if (!showDueOnly) return paymentRows;

    const monthStr = filters.paymentMonth
      ? dayjs(filters.paymentMonth).format("YYYY-MM")
      : dayjs().format("YYYY-MM");

    // Students who already have a tuition record for this month
    const paidStudentIds = new Set(
      allPayments
        .filter((p) => p.paymentType === "tuition" && dayjs(p.paymentMonth).format("YYYY-MM") === monthStr)
        .map((p) => p.studentId),
    );

    // Virtual rows for fully-unpaid students
    const virtualRows: OfficeRow[] = allStudents
      .filter((s) => {
        if (paidStudentIds.has(s.id)) return false;
        if ((s.monthlyTuitionFee ?? 0) <= 0) return false;
        // Respect class/group filters
        if (filters.classFilter && s.class !== filters.classFilter) return false;
        if (filters.groupFilter && s.group !== filters.groupFilter) return false;
        // Not yet enrolled
        const admMonth = s.admissionDate ? dayjs(s.admissionDate).format("YYYY-MM") : null;
        if (admMonth && admMonth > monthStr) return false;
        return true;
      })
      .map((s) => ({
        id: `virtual-${s.id}`,
        studentId: s.id,
        student: s,
        invoiceNumber: undefined,
        paymentTypes: ["tuition"],
        amount: 0,
        dueAmount: Math.max(0, (s.monthlyTuitionFee ?? 0) - (s.discountTuition ?? 0)),
        paymentMonth: dayjs(monthStr, "YYYY-MM").toISOString(),
        paymentDate: undefined,
        paymentMethod: undefined,
        isVirtual: true,
      }));

    const withDue = paymentRows.filter((r) => r.dueAmount > 0);
    return [...withDue, ...virtualRows];
  }, [allPayments, allStudents, showDueOnly, filters]);

  if (paymentsIsError) return <QueryError error={paymentsError as Error} onRetry={refetchPayments} />;

  return (
    <div>
      {/* Summary Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Total Students"
              value={tuitionStatusRows.length}
            />
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
              styles={{ content: { color: paidCount / (tuitionStatusRows.length || 1) > 0.7 ? "#52c41a" : "#fa8c16" } }}
            />
          </Card>
        </Col>
      </Row>

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
                columns={paymentsColumns}
                dataSource={guardianRows}
                rowKey="id"
                loading={loadingPayments}
                pagination={{
                  pageSize: 15,
                  showSizeChanger: true,
                  showTotal: (total) => `${total} payments`,
                }}
                summary={(pageData) => {
                  const total = pageData.reduce(
                    (sum, row) => sum + row.amount,
                    0,
                  );
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
                      <Table.Summary.Cell index={4} colSpan={4} />
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
                    const total = pageData.reduce((sum, row) => sum + row.amount, 0);
                    const totalDue = pageData.reduce((sum, row) => sum + row.dueAmount, 0);
                    return (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>
                          <strong>Page Total</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>
                          <div>
                            <strong style={{ color: "#2e7d32" }}>৳{total.toLocaleString()}</strong>
                            {totalDue > 0 && (
                              <div style={{ fontSize: 12, color: "#d32f2f" }}>
                                Due: ৳{totalDue.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} colSpan={4} />
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
