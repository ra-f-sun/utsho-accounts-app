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
} from "antd";
import {
  PlusOutlined,
  FilePdfOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import QueryError from "../../../components/QueryError";
import { mecPaymentsService } from "../../../services/mecPaymentsService";
import type { MecPayment } from "../../../services/mecPaymentsService";
import { mecStudentsService } from "../../../services/mecStudentsService";
import type { MecStudent } from "../../../services/mecStudentsService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Option } = Select;

interface Filters {
  paymentMethod?: string;
  paymentMonth?: string;
  classFilter?: number;
  statusFilter?: "paid" | "unpaid";
}

interface StudentStatus {
  student: MecStudent;
  payment?: MecPayment;
  isPaid: boolean;
  isAvailable: boolean;
}

interface GroupedMecPayment {
  invoiceNumber: string;
  student: MecPayment["student"];
  paymentMonths: string[];
  totalAmount: number;
  paymentMethod: string;
  paymentDate: string;
  ids: string[];
}

export default function MecPaymentHistory() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>({
    paymentMonth: dayjs().startOf("month").toISOString(),
  });
  const [activeTab, setActiveTab] = useState("tuition-status");

  // Fetch all active students
  const { data: studentsData } = useQuery({
    queryKey: ["mec-students"],
    queryFn: () => mecStudentsService.getAll(undefined, 1, 1000),
  });
  const allStudents: MecStudent[] = studentsData?.data?.data || [];

  // Fetch all payments with active filters
  const { data: paymentsData, isLoading: loadingPayments, isError: paymentsIsError, error: paymentsError, refetch: refetchPayments } = useQuery({
    queryKey: ["mec-payment-history", filters],
    queryFn: () =>
      mecPaymentsService.getAll({
        paymentMethod: filters.paymentMethod,
        paymentMonth: filters.paymentMonth,
      }),
  });
  const allPayments: MecPayment[] = paymentsData?.data?.data || [];

  const groupedMecPayments = useMemo((): GroupedMecPayment[] => {
    const groups: Record<string, GroupedMecPayment> = {};
    allPayments.forEach((p: MecPayment) => {
      if (!groups[p.invoiceNumber]) {
        groups[p.invoiceNumber] = {
          invoiceNumber: p.invoiceNumber,
          student: p.student,
          paymentMonths: [],
          totalAmount: 0,
          paymentMethod: p.paymentMethod,
          paymentDate: p.paymentDate,
          ids: [],
        };
      }
      groups[p.invoiceNumber].paymentMonths.push(p.paymentMonth);
      groups[p.invoiceNumber].totalAmount += p.amount;
      groups[p.invoiceNumber].ids.push(p.id);
    });
    return Object.values(groups);
  }, [allPayments]);

  // Cross-reference: every student × payments for selected month
  const tuitionStatusRows = useMemo((): StudentStatus[] => {
    const monthStr = filters.paymentMonth
      ? dayjs(filters.paymentMonth).format("YYYY-MM")
      : dayjs().format("YYYY-MM");

    const monthPayments = allPayments.filter(
      (p) => dayjs(p.paymentMonth).format("YYYY-MM") === monthStr,
    );
    const paidStudentIds = new Set(monthPayments.map((p) => p.studentId));

    let students = allStudents.filter((s) => s.isActive);
    if (filters.classFilter)
      students = students.filter((s) => s.class === filters.classFilter);

    const rows: StudentStatus[] = students.map((student) => {
      const admMonth = student.admissionDate
        ? dayjs(student.admissionDate).format("YYYY-MM")
        : null;
      const isAvailable = admMonth === null || admMonth <= monthStr;
      return {
        student,
        payment: monthPayments.find((p) => p.studentId === student.id),
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
  const totalCollection = tuitionStatusRows
    .filter((r) => r.isPaid && r.payment)
    .reduce((sum, r) => sum + (r.payment?.amount || 0), 0);

  // --- Tuition Status columns ---
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
            {record.student.class ? `Class ${record.student.class}` : ""}
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
          ৳{record.student.monthlyTuitionFee?.toLocaleString() || "—"}
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
            icon={<FilePdfOutlined />}
            onClick={() =>
              navigate(`/mec/payments/invoice/${encodeURIComponent(record.payment!.invoiceNumber)}`)
            }
          >
            View
          </Button>
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
              navigate(`/mec/payments/record?studentId=${record.student.id}`)
            }
          >
            Collect
          </Button>
        ) : (
          <Button
            size="small"
            onClick={() =>
              navigate(`/mec/payments/record?studentId=${record.student.id}`)
            }
          >
            Pay Again
          </Button>
        ),
    },
  ];

  // --- All Payments columns ---
  const paymentsColumns: ColumnsType<GroupedMecPayment> = [
    {
      title: "Invoice #",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 160,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Student",
      key: "student",
      render: (_: unknown, record: GroupedMecPayment) => {
        const student = record.student;
        return (
          <div>
            <strong>{student?.name}</strong>
            {student?.class && (
              <div style={{ fontSize: 12, color: "#888" }}>
                Class {student.class}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Month(s)",
      key: "paymentMonths",
      render: (_: unknown, record: GroupedMecPayment) => (
        <Space size={[4, 4]} wrap>
          {record.paymentMonths.map((m, i) => (
            <Tag key={i} color="blue">{dayjs(m).format("MMM YYYY")}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Total",
      key: "totalAmount",
      width: 110,
      render: (_: unknown, record: GroupedMecPayment) => (
        <strong style={{ color: "#2e7d32" }}>
          \u09f3{record.totalAmount.toLocaleString()}
        </strong>
      ),
    },
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 100,
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY") : "\u2014"),
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 120,
      render: (method: string) => (
        <Tag
          color={
            method === "cash"
              ? "green"
              : method === "bkash"
                ? "pink"
                : method === "nagad"
                  ? "orange"
                  : "blue"
          }
        >
          {method.replace(/_/g, " ").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Invoice",
      key: "invoice",
      width: 80,
      render: (_: unknown, record: GroupedMecPayment) => (
        <Button
          type="link"
          size="small"
          icon={<FilePdfOutlined />}
          onClick={() =>
            navigate(
              `/mec/payments/invoice/${encodeURIComponent(record.invoiceNumber)}`,
            )
          }
        >
          View
        </Button>
      ),
    },
  ];

  const sharedFilters = (
    <Space wrap style={{ marginBottom: 16 }}>
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
        <>
          <Select
            placeholder="Class"
            style={{ width: 120 }}
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
        </>
      )}
      {activeTab === "all-payments" && (
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
        onClick={() => navigate("/mec/payments/record")}
      >
        Record Payment
      </Button>
    </Space>
  );

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
            key: "all-payments",
            label: `All Payments (${groupedMecPayments.length})`,
            children: (
              <Table
                columns={paymentsColumns}
                dataSource={groupedMecPayments}
                rowKey="invoiceNumber"
                loading={loadingPayments}
                pagination={{
                  pageSize: 15,
                  showSizeChanger: true,
                  showTotal: (total) => `${total} invoices`,
                }}
                summary={(pageData) => {
                  const total = pageData.reduce(
                    (sum, row) => sum + row.totalAmount,
                    0,
                  );
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <strong>Page Total</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <strong style={{ color: "#2e7d32" }}>
                          ৳{total.toLocaleString()}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} colSpan={4} />
                    </Table.Summary.Row>
                  );
                }}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
