import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Table, Button, Card, Statistic, Row, Col, Tag, Spin } from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { Space } from "antd";
import { mecPaymentsService } from "../../../services/mecPaymentsService";
import { mecStudentsService } from "../../../services/mecStudentsService";
import type { MecPayment } from "../../../services/mecPaymentsService";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

export default function MecStudentPaymentHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: studentData, isLoading: loadingStudent } = useQuery({
    queryKey: ["mec-student", id],
    queryFn: () => mecStudentsService.getOne(id!),
    enabled: !!id,
  });

  const student = (studentData as any)?.data;

  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ["mec-payments", { studentId: id }],
    queryFn: () => mecPaymentsService.getAll({ studentId: id }),
    enabled: !!id,
  });

  const payments: MecPayment[] = (paymentsData as any)?.data || [];
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const columns: ColumnsType<MecPayment> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 150,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Month",
      dataIndex: "paymentMonth",
      key: "paymentMonth",
      width: 120,
      render: (date: string) => dayjs(date).format("MMM YYYY"),
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
      render: (_: unknown, record: MecPayment) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/mec/payments/${record.id}/invoice`)}
            title="View Invoice"
          />
        </Space>
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
          onClick={() => navigate("/mec/students")}
        >
          Back to Students
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(`/mec/payments/record?studentId=${id}`)}
        >
          Record Payment
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={8}>
            <Statistic
              title="Student"
              value={student?.name || "Loading..."}
              valueStyle={{ fontSize: 18 }}
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
              valueStyle={{ color: "#2e7d32" }}
            />
          </Col>
          <Col span={8}>
            <Statistic title="Total Payments" value={payments.length} />
          </Col>
        </Row>
      </Card>

      <Card title="Payment History">
        <Table
          columns={columns}
          dataSource={payments}
          rowKey="id"
          loading={loadingPayments}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} records`,
          }}
        />
      </Card>
    </div>
  );
}
