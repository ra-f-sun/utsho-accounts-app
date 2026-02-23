import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Typography,
  Row,
  Col,
  Card,
  Statistic,
  Select,
  DatePicker,
  Spin,
  Table,
  Tag,
} from "antd";
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  WalletOutlined,
  WarningOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuthStore } from "../stores/authStore";
import { analyticsService } from "../services/analyticsService";
import { exportRevenueToExcel, exportDashboardToPDF } from "../utils/exportUtils";
import type {
  RevenueStats,
  MonthlyRevenue,
  OutstandingPayment,
  ExpenseBreakdown,
} from "../services/analyticsService";
import dayjs from "dayjs";
import { Button, App, Dropdown } from "antd";
import QueryError from "../components/QueryError";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const COLORS = {
  uac: "#1890ff",
  mbcs: "#52c41a",
  mec: "#faad14",
  revenue: "#2e7d32",
  expense: "#d32f2f",
};

export default function DashboardPage() {
  const { message } = App.useApp();
  const user = useAuthStore((state) => state.user);
  
  // Determine if user can see all orgs
  const canSeeAllOrgs = user?.role === "SUPER_ADMIN" || user?.role === "DIRECTOR";
  
  // Get default organization for accountants
  const defaultOrg = user?.role === "ACCOUNTANT_UAC"
    ? "uac"
    : user?.role === "ACCOUNTANT_MBCS"
      ? "mbcs"
      : user?.role === "ACCOUNTANT_MEC"
        ? "mec"
        : undefined;

  const [orgFilter, setOrgFilter] = useState<string | undefined>(defaultOrg);
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().startOf("year").format("YYYY-MM-DD"),
    dayjs().endOf("year").format("YYYY-MM-DD"),
  ]);

  // Fetch revenue stats
  const { data: revenueData, isLoading: loadingRevenue, isError: revenueIsError, error: revenueError, refetch: refetchRevenue } = useQuery({
    queryKey: ["analytics-revenue", orgFilter, dateRange],
    queryFn: () =>
      analyticsService.getRevenueStats({
        organization: orgFilter,
        startDate: dateRange[0],
        endDate: dateRange[1],
      }),
  });

  // Fetch monthly trend
  const { data: trendData, isLoading: loadingTrend } = useQuery({
    queryKey: ["analytics-trend", orgFilter, dateRange],
    queryFn: () =>
      analyticsService.getMonthlyRevenueTrend({
        organization: orgFilter,
        startDate: dateRange[0],
        endDate: dateRange[1],
      }),
  });

  // Fetch outstanding payments
  const { data: outstandingData, isLoading: loadingOutstanding } = useQuery({
    queryKey: ["analytics-outstanding", orgFilter],
    queryFn: () =>
      analyticsService.getOutstandingPayments({
        organization: orgFilter,
      }),
  });

  // Fetch expense breakdown
  const { data: expenseData, isLoading: loadingExpense } = useQuery({
    queryKey: ["analytics-expenses", orgFilter, dateRange],
    queryFn: () =>
      analyticsService.getExpenseBreakdown({
        organization: orgFilter,
        startDate: dateRange[0],
        endDate: dateRange[1],
      }),
  });

  const revenueStats: RevenueStats | RevenueStats[] = revenueData?.data || [];
  const monthlyTrend: MonthlyRevenue[] = trendData?.data || [];
  const outstanding: OutstandingPayment[] = outstandingData?.data || [];
  const expenses: ExpenseBreakdown[] = expenseData?.data || [];

  // Calculate totals
  const totals = useMemo(() => {
    if (Array.isArray(revenueStats)) {
      return revenueStats.reduce(
        (acc, stat) => ({
          studentPayments: acc.studentPayments + stat.studentPayments,
          teacherPayroll: acc.teacherPayroll + stat.teacherPayroll,
          staffPayroll: acc.staffPayroll + stat.staffPayroll,
          expenses: acc.expenses + stat.expenses,
          netRevenue: acc.netRevenue + stat.netRevenue,
        }),
        {
          studentPayments: 0,
          teacherPayroll: 0,
          staffPayroll: 0,
          expenses: 0,
          netRevenue: 0,
        },
      );
    } else {
      return revenueStats;
    }
  }, [revenueStats]);

  // Pie chart data for revenue distribution
  const pieData = Array.isArray(revenueStats)
    ? revenueStats.map((stat) => ({
        name: stat.organization.toUpperCase(),
        value: stat.studentPayments,
      }))
    : [{ name: orgFilter?.toUpperCase() || "Total", value: totals.studentPayments }];

  const loading = loadingRevenue || loadingTrend || loadingOutstanding || loadingExpense;

  if (revenueIsError) return <QueryError error={revenueError as Error} onRetry={refetchRevenue} />;

  const outstandingColumns = [
    {
      title: "Student",
      dataIndex: "studentName",
      key: "studentName",
    },
    {
      title: "Organization",
      dataIndex: "organization",
      key: "organization",
      render: (org: string) => (
        <Tag color={COLORS[org.toLowerCase() as keyof typeof COLORS]}>
          {org.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Class/Grade",
      key: "class",
      render: (_: unknown, record: OutstandingPayment) => {
        if (record.class) return `Class ${record.class}`;
        if (record.shift) return record.shift;
        return "—";
      },
    },
    {
      title: "Monthly Fee",
      dataIndex: "monthlyFee",
      key: "monthlyFee",
      render: (fee: number) => `৳${fee.toLocaleString()}`,
    },
    {
      title: "Unpaid Months",
      dataIndex: "unpaidMonths",
      key: "unpaidMonths",
      render: (months: number) => (
        <Tag color={months > 2 ? "red" : "orange"}>
          <WarningOutlined /> {months} {months === 1 ? "month" : "months"}
        </Tag>
      ),
    },
    {
      title: "Total Due",
      key: "totalDue",
      render: (_: unknown, record: OutstandingPayment) => (
        <strong style={{ color: "#d32f2f" }}>
          ৳{(record.monthlyFee * record.unpaidMonths).toLocaleString()}
        </strong>
      ),
    },
  ];

  const handleExportExcel = () => {
    try {
      const filename = `revenue_report_${dayjs().format("YYYY-MM-DD")}.xlsx`;
      exportRevenueToExcel(
        revenueStats as RevenueStats | RevenueStats[],
        monthlyTrend,
        outstanding,
        filename,
      );
      message.success("Report exported to Excel successfully!");
    } catch (error) {
      message.error("Failed to export report");
    }
  };

  const handleExportPDF = () => {
    try {
      exportDashboardToPDF();
    } catch (error) {
      message.error("Failed to export to PDF");
    }
  };

  const exportMenuItems = [
    {
      key: "excel",
      label: "Export to Excel",
      icon: <FileExcelOutlined />,
      onClick: handleExportExcel,
    },
    {
      key: "pdf",
      label: "Export to PDF",
      icon: <FilePdfOutlined />,
      onClick: handleExportPDF,
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>Analytics Dashboard</Title>
        </Col>
        <Col>
          <Row gutter={16}>
            <Col>
              <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
                <Button type="primary" icon={<DownloadOutlined />}>
                  Export Report
                </Button>
              </Dropdown>
            </Col>
            {canSeeAllOrgs && (
              <Col>
                <Select
                  style={{ width: 150 }}
                  placeholder="All Organizations"
                  allowClear
                  value={orgFilter}
                  onChange={setOrgFilter}
                >
                  <Select.Option value="uac">UAC</Select.Option>
                  <Select.Option value="mbcs">MBCS</Select.Option>
                  <Select.Option value="mec">MEC</Select.Option>
                </Select>
              </Col>
            )}
            <Col>
              <RangePicker
                value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([
                      dates[0].format("YYYY-MM-DD"),
                      dates[1].format("YYYY-MM-DD"),
                    ]);
                  }
                }}
                format="DD/MM/YYYY"
              />
            </Col>
          </Row>
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Revenue (Student Payments)"
                  value={totals.studentPayments}
                  prefix="৳"
                  styles={{ content: { color: COLORS.revenue } }}
                  suffix={<RiseOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Teacher Payroll"
                  value={totals.teacherPayroll}
                  prefix="৳"
                  styles={{ content: { color: COLORS.expense } }}
                  suffix={<WalletOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Expenses"
                  value={totals.expenses}
                  prefix="৳"
                  styles={{ content: { color: COLORS.expense } }}
                  suffix={<FallOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Net Profit"
                  value={totals.netRevenue}
                  prefix="৳"
                  styles={{ content: { color: totals.netRevenue >= 0 ? COLORS.revenue : COLORS.expense } }}
                  suffix={<DollarOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* Charts Row */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={16}>
              <Card title="Revenue Trend (Monthly)">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `৳${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="studentPayments"
                      stroke={COLORS.revenue}
                      strokeWidth={2}
                      name="Student Payments"
                    />
                    <Line
                      type="monotone"
                      dataKey="teacherPayroll"
                      stroke={COLORS.expense}
                      strokeWidth={2}
                      name="Teacher Payroll"
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#fa8c16"
                      strokeWidth={2}
                      name="Expenses"
                    />
                    <Line
                      type="monotone"
                      dataKey="netRevenue"
                      stroke="#722ed1"
                      strokeWidth={2}
                      name="Net Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Revenue Distribution">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS] || "#8884d8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `৳${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Outstanding Payments Table */}
          {outstanding.length > 0 && (
            <Card
              title={
                <span>
                  <WarningOutlined style={{ color: "#fa8c16", marginRight: 8 }} />
                  Outstanding Payments ({outstanding.length} students)
                </span>
              }
              style={{ marginBottom: 24 }}
            >
              <Table
                columns={outstandingColumns}
                dataSource={outstanding}
                rowKey="studentId"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

