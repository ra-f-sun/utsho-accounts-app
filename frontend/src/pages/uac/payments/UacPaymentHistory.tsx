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
import { paymentsService } from "../../../services/paymentsService";
import type { Payment } from "../../../services/paymentsService";
import { studentsService } from "../../../services/studentsService";
import type { Student } from "../../../services/studentsService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

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

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsService.getAll(),
  });
  const allStudents: Student[] = (studentsData as any)?.data || [];

  // Fetch all payments (with any active filters for the records tab)
  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ["uac-payment-history", filters],
    queryFn: () =>
      paymentsService.getAll({
        paymentType: filters.paymentType,
        paymentMethod: filters.paymentMethod,
        paymentMonth: filters.paymentMonth,
      }),
  });
  const allPayments: Payment[] = (paymentsData as any)?.data || [];

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
            icon={<FilePdfOutlined />}
            onClick={() =>
              navigate(`/uac/payments/${record.payment!.id}/invoice`)
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
  const paymentsColumns: ColumnsType<Payment> = [
    {
      title: "Invoice #",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 150,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Student",
      key: "student",
      render: (_: unknown, record: Payment) => {
        const student = (record as any).student;
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
      dataIndex: "paymentType",
      key: "paymentType",
      width: 140,
      render: (type: string) => (
        <Tag color={PAYMENT_TYPE_COLORS[type] || "default"}>
          {type.replace(/_/g, " ").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 110,
      render: (amount: number) => (
        <strong style={{ color: "#2e7d32" }}>৳{amount.toLocaleString()}</strong>
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
      title: "Invoice",
      key: "invoice",
      width: 80,
      render: (_: unknown, record: Payment) => (
        <Button
          type="link"
          size="small"
          icon={<FilePdfOutlined />}
          onClick={() => navigate(`/uac/payments/${record.id}/invoice`)}
        >
          View
        </Button>
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
      {activeTab === "all-payments" && (
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
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="Unpaid"
              value={unpaidCount}
              valueStyle={{ color: "#ff4d4f" }}
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
              valueStyle={{
                color:
                  paidCount / (tuitionStatusRows.length || 1) > 0.7
                    ? "#52c41a"
                    : "#fa8c16",
              }}
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
            label: `All Payments (${allPayments.length})`,
            children: (
              <Table
                columns={paymentsColumns}
                dataSource={allPayments}
                rowKey="id"
                loading={loadingPayments}
                pagination={{
                  pageSize: 15,
                  showSizeChanger: true,
                  showTotal: (total) => `${total} records`,
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
                      <Table.Summary.Cell index={4} colSpan={3} />
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
