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
  mbcsPaymentsService,
  MBCS_PAYMENT_TYPES,
} from "../../../services/mbcsPaymentsService";
import type { MbcsPayment } from "../../../services/mbcsPaymentsService";
import { mbcsStudentsService } from "../../../services/mbcsStudentsService";
import type { MbcsStudent } from "../../../services/mbcsStudentsService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { MBCS_CLASS_MAP, MBCS_CLASSES } from "../../../constants/mbcsClasses";

const { Option } = Select;

const PAYMENT_TYPE_COLORS: Record<string, string> = {
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

interface Filters {
  paymentType?: string;
  paymentMethod?: string;
  paymentMonth?: string;
  classFilter?: number;
  shiftFilter?: string;
  statusFilter?: "paid" | "unpaid";
}

interface StudentStatus {
  student: MbcsStudent;
  payment?: MbcsPayment;
  isPaid: boolean;
  isAvailable: boolean;
}

export default function MbcsPaymentHistory() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>({
    paymentMonth: dayjs().startOf("month").toISOString(),
  });
  const [activeTab, setActiveTab] = useState("tuition-status");
  const [showDueOnly, setShowDueOnly] = useState(false);

  const { data: studentsData } = useQuery({
    queryKey: ["mbcs-students"],
    queryFn: () => mbcsStudentsService.getAll(undefined, 1, 1000),
  });
  const allStudents: MbcsStudent[] = useMemo(() => studentsData?.data?.data || [], [studentsData]);

  const { data: paymentsData, isLoading: loadingPayments, isError: paymentsIsError, error: paymentsError, refetch: refetchPayments } = useQuery({
    queryKey: ["mbcs-payment-history", filters],
    queryFn: () =>
      mbcsPaymentsService.getAll({
        paymentType: filters.paymentType,
        paymentMethod: filters.paymentMethod,
      }, 1, 1000),
  });
  const allPayments: MbcsPayment[] = useMemo(() => paymentsData?.data?.data || [], [paymentsData]);

  // Cross-reference students × tuition payments for selected month
  const tuitionStatusRows = useMemo((): StudentStatus[] => {
    const monthStr = filters.paymentMonth
      ? dayjs(filters.paymentMonth).format("YYYY-MM")
      : dayjs().format("YYYY-MM");

    const tuitionPayments = allPayments.filter(
      (p) =>
        p.paymentType === "tuition" &&
        dayjs(p.paymentMonth).format("YYYY-MM") === monthStr,
    );
    const paidStudentIds = new Set(tuitionPayments.map((p) => p.studentId));

    let students = allStudents;
    if (filters.classFilter)
      students = students.filter((s) => s.class === filters.classFilter);
    if (filters.shiftFilter)
      students = students.filter((s) => s.shift === filters.shiftFilter);

    const rows: StudentStatus[] = students.map((student) => {
      // MBCS rule: all months from January are always applicable regardless of admission date
      return {
        student,
        payment: tuitionPayments.find((p) => p.studentId === student.id),
        isPaid: paidStudentIds.has(student.id),
        isAvailable: true,
      };
    });

    if (filters.statusFilter === "paid") return rows.filter((r) => r.isPaid);
    if (filters.statusFilter === "unpaid")
      return rows.filter((r) => !r.isPaid);
    return rows;
  }, [allStudents, allPayments, filters]);

  const paidCount = tuitionStatusRows.filter((r) => r.isPaid).length;
  const unpaidCount = tuitionStatusRows.filter(
    (r) => !r.isPaid,
  ).length;

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
            {MBCS_CLASS_MAP[record.student.class] ?? `Class ${record.student.class}`}
            {record.student.shift ? ` · ${record.student.shift}` : ""}
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
              navigate(`/mbcs/payments/invoice/${encodeURIComponent(record.payment!.invoiceNumber)}`)
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
              navigate(`/mbcs/payments/record?studentId=${record.student.id}`)
            }
          >
            Collect
          </Button>
        ) : (
          <Button
            size="small"
            onClick={() =>
              navigate(`/mbcs/payments/record?studentId=${record.student.id}`)
            }
          >
            Pay Again
          </Button>
        ),
    },
  ];

  // Guardian row: grouped by invoiceNumber
  interface GuardianRow {
    id: string;
    studentId: string;
    student?: MbcsPayment["student"];
    invoiceNumber: string;
    paymentTypes: string[];
    amount: number;
    paymentMonth?: string;
    paymentDate?: string;
    paymentMethod?: string;
  }

  const guardianRows = useMemo((): GuardianRow[] => {
    const invoiceMap = new Map<string, MbcsPayment[]>();
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

  // Guardian-facing columns (shows guardian amounts)
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
              {MBCS_CLASS_MAP[student?.class ?? -1] ?? `Class ${student?.class}`}
              {student?.shift ? ` · ${student.shift}` : ""}
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
          onClick={() => navigate(`/mbcs/payments/invoice/${encodeURIComponent(record.invoiceNumber)}`)}
        />
      ),
    },
  ];

  // Office row: grouped by invoiceNumber
  interface OfficeRow {
    id: string;
    studentId: string;
    student?: MbcsPayment["student"];
    invoiceNumber: string;
    paymentTypes: string[];
    amount: number;
    dueAmount: number;
    paymentMonth?: string;
    paymentDate?: string;
    paymentMethod?: string;
  }

  // Office-facing columns (shows actual office amounts + due tracking)
  const officeColumns: ColumnsType<OfficeRow> = [
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
      render: (_: unknown, record: OfficeRow) => {
        const student = record.student;
        return (
          <div>
            <strong>{student?.name}</strong>
            <div style={{ fontSize: 12, color: "#888" }}>
              {MBCS_CLASS_MAP[student?.class ?? -1] ?? `Class ${student?.class}`}
              {student?.shift ? ` · ${student.shift}` : ""}
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
      key: "amount",
      width: 130,
      render: (_: unknown, record: OfficeRow) => (
        <div>
          <strong style={{ color: "#2e7d32" }}>৳{record.amount.toLocaleString()}</strong>
          {record.dueAmount > 0 && (
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
        method ? <Tag>{method.toUpperCase()}</Tag> : "-",
    },
    {
      title: "Actions",
      key: "action",
      width: 130,
      render: (_: unknown, record: OfficeRow) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            title="View Invoice"
            onClick={() => navigate(`/mbcs/payments/invoice/${encodeURIComponent(record.invoiceNumber)}`)}
          />
          {record.dueAmount > 0 && (
            <Button
              type="primary"
              size="small"
              danger
              onClick={() =>
                navigate(`/mbcs/payments/collect-due?studentId=${record.studentId}`)
              }
            >
              Collect Due
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
        {MBCS_CLASSES.map(({ value: cls, label }) => (
          <Option key={cls} value={cls}>
            {label}
          </Option>
        ))}
      </Select>
      <Select
        placeholder="Shift"
        style={{ width: 120 }}
        onChange={(value) =>
          setFilters((prev) => ({ ...prev, shiftFilter: value }))
        }
        allowClear
      >
        <Option value="morning">Morning</Option>
        <Option value="day">Day</Option>
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
            {MBCS_PAYMENT_TYPES.map((pt) => (
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
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => navigate("/mbcs/payments/record")}
      >
        Record Payment
      </Button>
    </Space>
  );

  const officeRows = useMemo((): OfficeRow[] => {
    const invoiceMap = new Map<string, MbcsPayment[]>();
    for (const p of allPayments) {
      const key = p.invoiceNumber;
      if (!invoiceMap.has(key)) invoiceMap.set(key, []);
      invoiceMap.get(key)!.push(p);
    }
    const rows: OfficeRow[] = Array.from(invoiceMap.values()).map((group) => {
      const first = group[0];
      return {
        id: first.id,
        studentId: first.studentId,
        student: first.student,
        invoiceNumber: first.invoiceNumber,
        paymentTypes: group.map((p) => p.paymentType),
        amount: first.officePaid ?? first.officeGrandTotal ?? group.reduce((sum, p) => sum + p.amount, 0),
        dueAmount: first.dueAmount ?? 0,
        paymentMonth: first.paymentMonth,
        paymentDate: first.paymentDate,
        paymentMethod: first.paymentMethod,
      };
    });
    return showDueOnly ? rows.filter((r) => r.dueAmount > 0) : rows;
  }, [allPayments, showDueOnly]);

  if (paymentsIsError) return <QueryError error={paymentsError as Error} onRetry={refetchPayments} />;

  return (
    <div>
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
                  showTotal: (total) => `Total ${total} payments`,
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
                  {showDueOnly && <Tag color="error">{officeRows.length} with due</Tag>}
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
