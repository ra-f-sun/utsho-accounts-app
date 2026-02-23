import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Table, Button, Card, Statistic, Row, Col, Tag, Spin } from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { Space } from "antd";
import { payrollService } from "../../../services/payrollService";
import { teachersService } from "../../../services/teachersService";
import type { ColumnsType } from "antd/es/table";
import QueryError from "../../../components/QueryError";
import dayjs from "dayjs";

interface PayrollRecord {
  id: string;
  payableType: string;
  payableId: string;
  paymentMonth: string;
  amount: number;
  totalLectures?: number;
  paymentDate: string;
  paymentMethod: string;
  invoiceNumber: string;
  notes?: string;
}

export default function TeacherPayrollHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: teacherData, isLoading: loadingTeacher } = useQuery({
    queryKey: ["teacher", id],
    queryFn: () => teachersService.getOne(id!),
    enabled: !!id,
  });

  const teacher = teacherData?.data;

  const { data: payrollData, isLoading: loadingPayroll, isError: payrollIsError, error: payrollError, refetch: refetchPayroll } = useQuery({
    queryKey: ["payroll", { payableId: id, payableType: "teacher" }],
    queryFn: () =>
      payrollService.getAll({
        payableId: id,
        payableType: "teacher",
      }, 1, 1000),
    enabled: !!id,
  });

  const payrolls: PayrollRecord[] = payrollData?.data?.data || [];
  const totalPaid = payrolls.reduce((sum, p) => sum + p.amount, 0);

  const columns: ColumnsType<PayrollRecord> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      width: 140,
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
      width: 100,
      render: (amount: number) => (
        <strong style={{ color: "#2e7d32" }}>৳{amount.toLocaleString()}</strong>
      ),
    },
    {
      title: "Lectures",
      dataIndex: "totalLectures",
      key: "totalLectures",
      width: 80,
      render: (count: number | null) =>
        count != null ? <Tag color="blue">{count}</Tag> : "-",
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
      width: 80,
      render: (_: unknown, record: PayrollRecord) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/uac/payroll/${record.id}/invoice`)}
            title="View Invoice"
          />
        </Space>
      ),
    },
  ];

  if (payrollIsError) return <QueryError error={payrollError as Error} onRetry={refetchPayroll} />;

  if (loadingTeacher) {
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
          onClick={() => navigate("/uac/teachers")}
        >
          Back to Teachers
        </Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(`/uac/payroll/create?teacherId=${id}`)}
        >
          Create Payroll
        </Button>
      </div>

      {/* Teacher Info */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={8}>
            <Statistic
              title="Teacher"
              value={teacher?.name || "Loading..."}
              styles={{ content: { fontSize: 18 } }}
            />
            <div style={{ color: "#888", fontSize: 13 }}>
              {teacher?.paymentType === "lecture_based"
                ? `Lecture Based — ৳${teacher?.perLectureRate}/lecture`
                : `Fixed — ৳${teacher?.monthlySalary}/month`}
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
            <Statistic title="Total Payroll Records" value={payrolls.length} />
          </Col>
        </Row>
      </Card>

      {/* Payroll Records Table */}
      <Card title="Payroll History">
        <Table
          columns={columns}
          dataSource={payrolls}
          rowKey="id"
          loading={loadingPayroll}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Total ${total} records`,
          }}
        />
      </Card>
    </div>
  );
}
