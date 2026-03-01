import { useState, useMemo, useEffect } from "react";
import {
  Form,
  Select,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  App,
  DatePicker,
  Typography,
  Space,
  Table,
  Tag,
  Alert,
  Divider,
  Input,
} from "antd";
import { SearchOutlined, DollarOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { mecPaymentsService } from "../../../services/mecPaymentsService";
import type { MecDueProfile, MecCollectDueDto, MecDueSummary } from "../../../services/mecPaymentsService";
import { mecStudentsService } from "../../../services/mecStudentsService";
import type { MecStudent } from "../../../services/mecStudentsService";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text, Title } = Typography;

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

export default function MecCollectDue() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(
    () => searchParams.get("studentId") ?? undefined,
  );
  const [selectedInvoice, setSelectedInvoice] = useState<MecDueProfile | null>(null);
  const [successInvoice, setSuccessInvoice] = useState<string | null>(null);

  const { data: studentsData } = useQuery({
    queryKey: ["mec-students"],
    queryFn: () => mecStudentsService.getAll(undefined, 1, 1000),
  });
  const allStudents = useMemo<MecStudent[]>(
    () => studentsData?.data?.data ?? [],
    [studentsData],
  );

  const filteredStudents = useMemo(() => allStudents, [allStudents]);

  const { data: dueProfileData, isLoading: dueLoading } = useQuery({
    queryKey: ["due-profile", "mec", selectedStudentId],
    queryFn: () => mecPaymentsService.getDueProfile(selectedStudentId!),
    enabled: !!selectedStudentId,
  });
  const dueProfiles: MecDueProfile[] = dueProfileData?.data?.profiles ?? [];

  // Also fetch due summary (includes unpaid months with no invoices)
  const { data: dueSummaryData } = useQuery({
    queryKey: ["due-summary", "mec", selectedStudentId],
    queryFn: () => mecPaymentsService.getDueSummary(selectedStudentId!),
    enabled: !!selectedStudentId,
  });
  const dueSummary = dueSummaryData?.data as MecDueSummary | undefined;

  useEffect(() => {
    if (selectedInvoice) {
      form.setFieldValue("paidAmount", selectedInvoice.remainingDue);
    }
  }, [selectedInvoice, form]);

  const paidAmount = Form.useWatch("paidAmount", form) ?? 0;
  const remainingAfterPayment = selectedInvoice
    ? Math.max(0, selectedInvoice.remainingDue - (paidAmount || 0))
    : 0;

  const { mutate: collectDue, isPending } = useMutation({
    mutationFn: (dto: MecCollectDueDto) => mecPaymentsService.collectDue(dto),
    onSuccess: (result) => {
      setSuccessInvoice(result.data?.invoiceNumber);
      message.success(`Due collection recorded. Invoice: ${result.data?.invoiceNumber}`);
    },
    onError: (err: Error) => {
      message.error(err.message || "Failed to collect due");
    },
  });

  function handleSubmit(values: { paidAmount: number; paymentMethod: string; paymentDate: dayjs.Dayjs; notes?: string }) {
    if (!selectedInvoice) return;
    modal.confirm({
      title: "Confirm Due Collection",
      content: (
        <Space orientation="vertical">
          <Text>Invoice: <strong>{selectedInvoice.invoiceNumber}</strong></Text>
          <Text>Amount: <strong>৳{values.paidAmount}</strong></Text>
          <Text>Remaining after: <strong>৳{remainingAfterPayment}</strong></Text>
        </Space>
      ),
      onOk: () => {
        collectDue({
          parentInvoiceNumber: selectedInvoice.invoiceNumber,
          paidAmount: values.paidAmount,
          paymentDate: values.paymentDate.format("YYYY-MM-DD"),
          paymentMethod: values.paymentMethod,
          notes: values.notes,
        });
      },
    });
  }

  const invoiceColumns = [
    {
      title: "Invoice #",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      render: (inv: string) => (
        <Link to={`/mec/payments/invoice/${inv}`} target="_blank">{inv}</Link>
      ),
    },
    {
      title: "Payment Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      render: (d: string) => dayjs(d).format("DD MMM YYYY"),
    },
    {
      title: "Remaining Due",
      dataIndex: "remainingDue",
      key: "remainingDue",
      render: (v: number) => <Tag color="red">৳{v.toFixed(2)}</Tag>,
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: MecDueProfile) => (
        <Button
          type={selectedInvoice?.invoiceNumber === record.invoiceNumber ? "primary" : "default"}
          size="small"
          onClick={() => setSelectedInvoice(record)}
        >
          {selectedInvoice?.invoiceNumber === record.invoiceNumber ? "Selected" : "Select"}
        </Button>
      ),
    },
  ];

  const itemColumns = [
    { title: "Payment Type", dataIndex: "paymentType", key: "paymentType", render: () => "Tuition Fee" },
    { title: "Original Amount", dataIndex: "originalAmount", key: "originalAmount", render: (v: number) => `৳${v.toFixed(2)}` },
    { title: "Paid So Far", dataIndex: "paidSoFar", key: "paidSoFar", render: (v: number) => <Text type="success">৳{v.toFixed(2)}</Text> },
    { title: "Remaining Due", dataIndex: "remainingDue", key: "remainingDue", render: (v: number) => <Text type="danger">৳{v.toFixed(2)}</Text> },
  ];

  if (successInvoice) {
    return (
      <Card>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Alert type="success" icon={<CheckCircleOutlined />} title="Due Collection Recorded"
            description={`New invoice number: ${successInvoice}`} showIcon />
          <Space>
            <Button type="primary" onClick={() => navigate(`/mec/payments/invoice/${successInvoice}`)}>View Invoice</Button>
            <Button onClick={() => { setSuccessInvoice(null); form.resetFields(); setSelectedInvoice(null); }}>Collect Another Due</Button>
            <Button onClick={() => navigate("/mec/payment-history")}>Back to Payments</Button>
          </Space>
        </Space>
      </Card>
    );
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Title level={4}><DollarOutlined /> Collect Due — MEC</Title>

      <Card title="Step 1 — Select Student">
        <Row gutter={16}>
          <Col xs={24} sm={24}>
            <Form.Item label="Student" required>
              <Select
                showSearch
                filterOption={(input, option) =>
                  String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                placeholder="Search student..."
                value={selectedStudentId}
                onChange={(v) => {
                  setSelectedStudentId(v);
                  setSelectedInvoice(null);
                  setSuccessInvoice(null);
                  form.resetFields(["paidAmount", "paymentMethod", "paymentDate", "notes"]);
                }}
                suffixIcon={<SearchOutlined />}
                style={{ maxWidth: 400 }}
                options={filteredStudents.map((s) => ({
                  value: s.id,
                  label: `${s.name}${s.class ? ` — Class ${s.class}` : ""}`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {selectedStudentId && (
        <Card title="Step 2 — Outstanding Dues">
          {dueLoading ? (
            <Text>Loading due profile...</Text>
          ) : dueProfiles.length === 0 ? (
            <>
              {dueSummary && dueSummary.totalDue > 0 ? (
                <Alert
                  type="warning"
                  title={`This student has ৳${dueSummary.totalDue.toLocaleString()} in outstanding dues`}
                  description="However, there are no invoices to collect from. Use 'Record Payment' to create payment records first, then collect any remaining dues here."
                  showIcon
                  style={{ marginBottom: 12 }}
                />
              ) : (
                <Alert type="info" title="No outstanding dues found for this student." />
              )}
            </>
          ) : (
            <Table dataSource={dueProfiles} columns={invoiceColumns} rowKey="invoiceNumber" pagination={false} size="small" />
          )}
        </Card>
      )}

      {selectedInvoice && (
        <Card title={`Step 3 — Collect Due for Invoice ${selectedInvoice.invoiceNumber}`}>
          <Table dataSource={selectedInvoice.perItemDues} columns={itemColumns} rowKey="paymentType"
            pagination={false} size="small" style={{ marginBottom: 24 }} />
          <Divider />
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item label="Amount to Pay (৳)" name="paidAmount"
                  rules={[
                    { required: true, message: "Enter amount" },
                    { validator: (_, v) => v > 0 && v <= selectedInvoice.remainingDue ? Promise.resolve() : Promise.reject(`Must be between 0.01 and ${selectedInvoice.remainingDue}`) },
                  ]}>
                  <InputNumber style={{ width: "100%" }} min={0.01} max={selectedInvoice.remainingDue} precision={2} prefix="৳" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="Payment Method" name="paymentMethod" rules={[{ required: true }]}>
                  <Select placeholder="Select method" options={PAYMENT_METHODS} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="Payment Date" name="paymentDate" rules={[{ required: true }]} initialValue={dayjs()}>
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Notes" name="notes">
                  <TextArea rows={2} placeholder="Optional notes..." />
                </Form.Item>
              </Col>
            </Row>
            <Card size="small" style={{ background: "#f6ffed", borderColor: "#b7eb8f", marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary">Total Remaining Due</Text><br />
                  <Text strong style={{ fontSize: 18, color: "#cf1322" }}>৳{selectedInvoice.remainingDue.toFixed(2)}</Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Collecting Now</Text><br />
                  <Text strong style={{ fontSize: 18, color: "#52c41a" }}>৳{(paidAmount || 0).toFixed(2)}</Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Remaining After Payment</Text><br />
                  <Text strong style={{ fontSize: 18, color: remainingAfterPayment > 0 ? "#fa8c16" : "#52c41a" }}>
                    ৳{remainingAfterPayment.toFixed(2)}
                  </Text>
                </Col>
              </Row>
            </Card>
            <Space>
              <Button type="primary" htmlType="submit" loading={isPending} icon={<CheckCircleOutlined />}>
                Collect Due
              </Button>
              <Button onClick={() => navigate("/mec/payment-history")}>Cancel</Button>
            </Space>
          </Form>
        </Card>
      )}
    </Space>
  );
}
