import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Table, Button, Card, Statistic, Row, Col, Tag, Spin } from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { paymentsService } from "../../../services/paymentsService";
import { studentsService } from "../../../services/studentsService";
import type { Payment } from "../../../services/paymentsService";
import type { ColumnsType } from "antd/es/table";
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

export default function StudentPaymentHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: studentData, isLoading: loadingStudent } = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentsService.getOne(id!),
    enabled: !!id,
  });

  const student = (studentData as any)?.data;

  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ["payments", { studentId: id }],
    queryFn: () => paymentsService.getAll({ studentId: id }),
    enabled: !!id,
  });

  const payments: Payment[] = (paymentsData as any)?.data || [];
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  // Build paid months set for current year
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

  const columns: ColumnsType<Payment> = [
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
        <Tag color="blue">{type.replace(/_/g, " ").toUpperCase()}</Tag>
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
      render: (_: any, record: Payment) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/uac/payments/${record.id}/invoice`)}
        />
      ),
    },
  ];

  if (loadingStudent) {
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
          onClick={() => navigate("/uac/students")}
        >
          Back to Students
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(`/uac/payments/record?studentId=${id}`)}
        >
          Record Payment
        </Button>
      </div>

      {/* Student Info */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={8}>
            <Statistic
              title="Student"
              value={student?.name || "Loading..."}
              valueStyle={{ fontSize: 18 }}
            />
            <div style={{ color: "#888", fontSize: 13 }}>
              Class {student?.class}
              {student?.group ? ` (${student.group})` : ""}
            </div>
          </Col>
          <Col span={8}>
            <Statistic
              title="Total Paid"
              value={`৳${totalPaid.toLocaleString()}`}
              valueStyle={{ color: "#2e7d32" }}
            />
          </Col>
          <Col span={8}>
            <Statistic title="Total Payments" value={payments.length} />
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

      {/* Payment Records Table */}
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
  );
}
