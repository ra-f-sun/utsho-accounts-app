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
import {
  SearchOutlined,
  DollarOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  paymentsService,
  UAC_PAYMENT_TYPES,
  MBCS_PAYMENT_TYPES,
} from "../../../services/paymentsService";
import type {
  DueProfile,
  CollectDueDto,
  DueSummary,
} from "../../../services/paymentsService";
import { studentsService } from "../../../services/studentsService";
import type { Student } from "../../../services/studentsService";
import dayjs from "dayjs";
import { MBCS_CLASS_MAP } from "../../../constants/mbcsClasses";

const { TextArea } = Input;
const { Text, Title } = Typography;

type OrgType = "uac" | "mbcs" | "mec";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

interface OrgConfig {
  secondaryFilter: "group" | "shift" | null;
  secondaryFilterLabel: string;
  secondaryFilterStaticOptions: { value: string; label: string }[] | null;
  secondaryFilterDynamic: boolean;
  classLabel: (c: number) => string;
  studentLabel: (s: Student) => string;
  paymentTypes: { value: string; label: string }[];
  backPath: string;
  title: string;
  invoicePath: string;
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
    classLabel: (c) => `Class ${c}`,
    studentLabel: (s) =>
      `${s.name} — Class ${s.class}${s.group ? ` (${s.group})` : ""}`,
    paymentTypes: UAC_PAYMENT_TYPES,
    backPath: "payments",
    title: "Collect Due — UAC",
    invoicePath: "payments/invoice",
  },
  mbcs: {
    secondaryFilter: "shift",
    secondaryFilterLabel: "Shift",
    secondaryFilterStaticOptions: null,
    secondaryFilterDynamic: true,
    classLabel: (c) => MBCS_CLASS_MAP[c] ?? `Class ${c}`,
    studentLabel: (s) =>
      `${s.name} — ${MBCS_CLASS_MAP[s.class!] ?? `Class ${s.class}`}${s.shift ? ` (${s.shift})` : ""}`,
    paymentTypes: MBCS_PAYMENT_TYPES,
    backPath: "payments",
    title: "Collect Due — MBCS",
    invoicePath: "payments/invoice",
  },
  mec: {
    secondaryFilter: null,
    secondaryFilterLabel: "",
    secondaryFilterStaticOptions: null,
    secondaryFilterDynamic: false,
    classLabel: (c) => `Class ${c}`,
    studentLabel: (s) => `${s.name}${s.class ? ` — Class ${s.class}` : ""}`,
    paymentTypes: [],
    backPath: "payment-history",
    title: "Collect Due — MEC",
    invoicePath: "payments/invoice",
  },
};

export default function CollectDue({ org }: { org: OrgType }) {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const config = ORG_CONFIG[org];

  const [selectedClass, setSelectedClass] = useState<number | undefined>();
  const [selectedSecondary, setSelectedSecondary] = useState<string | undefined>();
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(
    () => searchParams.get("studentId") ?? undefined,
  );
  const [selectedInvoice, setSelectedInvoice] = useState<DueProfile | null>(null);
  const [successInvoice, setSuccessInvoice] = useState<string | null>(null);

  const { data: studentsData } = useQuery({
    queryKey: [org, "students"],
    queryFn: () => studentsService.getAll(org, undefined, 1, 1000),
  });
  const allStudents = useMemo<Student[]>(
    () => studentsData?.data?.data ?? [],
    [studentsData],
  );

  const availableClasses = useMemo(
    () => [...new Set(allStudents.map((s) => s.class))].filter((c): c is number => c != null).sort((a, b) => a - b),
    [allStudents],
  );

  const dynamicSecondaryOptions = useMemo<{ value: string; label: string }[]>(() => {
    if (!config.secondaryFilterDynamic) return [];
    const src = selectedClass
      ? allStudents.filter((s) => s.class === selectedClass)
      : allStudents;
    const key = config.secondaryFilter === "shift" ? "shift" : "group";
    return [
      ...new Set(
        src.map((s) => s[key] as string | undefined).filter(Boolean) as string[],
      ),
    ].map((v) => ({ value: v, label: v }));
  }, [allStudents, selectedClass, config.secondaryFilterDynamic, config.secondaryFilter]);

  const secondaryOptions =
    config.secondaryFilterStaticOptions ?? dynamicSecondaryOptions;

  const filteredStudents = useMemo(() => {
    let r = allStudents;
    if (config.secondaryFilter !== null) {
      if (selectedClass) r = r.filter((s) => s.class === selectedClass);
      if (selectedSecondary) {
        const key = config.secondaryFilter === "shift" ? "shift" : "group";
        r = r.filter((s) => s[key] === selectedSecondary);
      }
    }
    return r;
  }, [allStudents, selectedClass, selectedSecondary, config.secondaryFilter]);

  const { data: dueProfileData, isLoading: dueLoading } = useQuery({
    queryKey: ["due-profile", org, selectedStudentId],
    queryFn: () => paymentsService.getDueProfile(org, selectedStudentId!),
    enabled: !!selectedStudentId,
  });
  const dueProfiles: DueProfile[] = dueProfileData?.data?.profiles ?? [];

  const { data: dueSummaryData } = useQuery({
    queryKey: ["due-summary", org, selectedStudentId],
    queryFn: () => paymentsService.getDueSummary(org, selectedStudentId!),
    enabled: !!selectedStudentId,
  });
  const dueSummary = dueSummaryData?.data as DueSummary | undefined;

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
    mutationFn: (dto: CollectDueDto) => paymentsService.collectDue(org, dto),
    onSuccess: (result) => {
      setSuccessInvoice(result.data?.invoiceNumber);
      message.success(`Due collection recorded. Invoice: ${result.data?.invoiceNumber}`);
    },
    onError: (err: Error) => {
      message.error(err.message || "Failed to collect due");
    },
  });

  function handleSubmit(values: {
    paidAmount: number;
    paymentMethod: string;
    paymentDate: dayjs.Dayjs;
    notes?: string;
  }) {
    if (!selectedInvoice) return;
    modal.confirm({
      title: "Confirm Due Collection",
      content: (
        <Space orientation="vertical">
          <Text>
            Invoice: <strong>{selectedInvoice.invoiceNumber}</strong>
          </Text>
          <Text>
            Amount: <strong>৳{values.paidAmount}</strong>
          </Text>
          <Text>
            Remaining after: <strong>৳{remainingAfterPayment}</strong>
          </Text>
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

  const getPaymentTypeLabel = (type: string): string =>
    config.paymentTypes.length > 0
      ? (config.paymentTypes.find((t) => t.value === type)?.label ?? type)
      : "Tuition Fee";

  const invoiceColumns = [
    {
      title: "Invoice #",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      render: (inv: string) => (
        <Link to={`/${org}/${config.invoicePath}/${inv}`} target="_blank">
          {inv}
        </Link>
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
      render: (_: unknown, record: DueProfile) => (
        <Button
          type={
            selectedInvoice?.invoiceNumber === record.invoiceNumber
              ? "primary"
              : "default"
          }
          size="small"
          onClick={() => setSelectedInvoice(record)}
        >
          {selectedInvoice?.invoiceNumber === record.invoiceNumber
            ? "Selected"
            : "Select"}
        </Button>
      ),
    },
  ];

  const itemColumns = [
    {
      title: "Payment Type",
      dataIndex: "paymentType",
      key: "paymentType",
      render: (t: string) => getPaymentTypeLabel(t),
    },
    {
      title: "Original Amount",
      dataIndex: "originalAmount",
      key: "originalAmount",
      render: (v: number) => `৳${v.toFixed(2)}`,
    },
    {
      title: "Paid So Far",
      dataIndex: "paidSoFar",
      key: "paidSoFar",
      render: (v: number) => <Text type="success">৳{v.toFixed(2)}</Text>,
    },
    {
      title: "Remaining Due",
      dataIndex: "remainingDue",
      key: "remainingDue",
      render: (v: number) => <Text type="danger">৳{v.toFixed(2)}</Text>,
    },
  ];

  if (successInvoice) {
    return (
      <Card>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Alert
            type="success"
            icon={<CheckCircleOutlined />}
            title="Due Collection Recorded"
            description={`New invoice number: ${successInvoice}`}
            showIcon
          />
          <Space>
            <Button
              type="primary"
              onClick={() =>
                navigate(`/${org}/${config.invoicePath}/${successInvoice}`)
              }
            >
              View Invoice
            </Button>
            <Button
              onClick={() => {
                setSuccessInvoice(null);
                form.resetFields();
                setSelectedInvoice(null);
              }}
            >
              Collect Another Due
            </Button>
            <Button onClick={() => navigate(`/${org}/${config.backPath}`)}>
              Back to Payments
            </Button>
          </Space>
        </Space>
      </Card>
    );
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Title level={4}>
        <DollarOutlined /> {config.title}
      </Title>

      <Card title="Step 1 — Select Student">
        <Row gutter={16}>
          {config.secondaryFilter !== null && (
            <>
              <Col span={8}>
                <Form.Item label="Class">
                  <Select
                    allowClear
                    placeholder="All Classes"
                    value={selectedClass}
                    onChange={(v) => {
                      setSelectedClass(v);
                      setSelectedSecondary(undefined);
                      setSelectedStudentId(undefined);
                      form.resetFields();
                    }}
                    options={availableClasses.map((c) => ({
                      value: c,
                      label: config.classLabel(c),
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label={config.secondaryFilterLabel}>
                  <Select
                    allowClear
                    placeholder={`All ${config.secondaryFilterLabel}s`}
                    value={selectedSecondary}
                    onChange={(v) => {
                      setSelectedSecondary(v);
                      setSelectedStudentId(undefined);
                      form.resetFields();
                    }}
                    disabled={secondaryOptions.length === 0}
                    options={secondaryOptions}
                  />
                </Form.Item>
              </Col>
            </>
          )}
          <Col span={config.secondaryFilter !== null ? 8 : 24}>
            <Form.Item label="Student" required>
              <Select
                showSearch
                filterOption={(input, option) =>
                  String(option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                placeholder="Search student..."
                value={selectedStudentId}
                onChange={(v) => {
                  setSelectedStudentId(v);
                  setSelectedInvoice(null);
                  setSuccessInvoice(null);
                  form.resetFields([
                    "paidAmount",
                    "paymentMethod",
                    "paymentDate",
                    "notes",
                  ]);
                }}
                suffixIcon={<SearchOutlined />}
                style={config.secondaryFilter === null ? { maxWidth: 400 } : undefined}
                options={filteredStudents.map((s) => ({
                  value: s.id,
                  label: config.studentLabel(s),
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
                <Alert
                  type="info"
                  title="No outstanding dues found for this student."
                />
              )}
            </>
          ) : (
            <Table
              dataSource={dueProfiles}
              columns={invoiceColumns}
              rowKey="invoiceNumber"
              pagination={false}
              size="small"
            />
          )}
        </Card>
      )}

      {selectedInvoice && (
        <Card
          title={`Step 3 — Collect Due for Invoice ${selectedInvoice.invoiceNumber}`}
        >
          <Table
            dataSource={selectedInvoice.perItemDues}
            columns={itemColumns}
            rowKey="paymentType"
            pagination={false}
            size="small"
            style={{ marginBottom: 24 }}
          />

          <Divider />

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="Amount to Pay (৳)"
                  name="paidAmount"
                  rules={[
                    { required: true, message: "Enter amount" },
                    {
                      validator: (_, v) =>
                        v > 0 && v <= selectedInvoice.remainingDue
                          ? Promise.resolve()
                          : Promise.reject(
                              `Must be between 0.01 and ${selectedInvoice.remainingDue}`,
                            ),
                    },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0.01}
                    max={selectedInvoice.remainingDue}
                    precision={2}
                    prefix="৳"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Payment Method"
                  name="paymentMethod"
                  rules={[{ required: true }]}
                >
                  <Select placeholder="Select method" options={PAYMENT_METHODS} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Payment Date"
                  name="paymentDate"
                  rules={[{ required: true }]}
                  initialValue={dayjs()}
                >
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="Notes" name="notes">
                  <TextArea rows={2} placeholder="Optional notes..." />
                </Form.Item>
              </Col>
            </Row>

            <Card
              size="small"
              style={{
                background: "#f6ffed",
                borderColor: "#b7eb8f",
                marginBottom: 16,
              }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary">Total Remaining Due</Text>
                  <br />
                  <Text strong style={{ fontSize: 18, color: "#cf1322" }}>
                    ৳{selectedInvoice.remainingDue.toFixed(2)}
                  </Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Collecting Now</Text>
                  <br />
                  <Text strong style={{ fontSize: 18, color: "#52c41a" }}>
                    ৳{(paidAmount || 0).toFixed(2)}
                  </Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary">Remaining After Payment</Text>
                  <br />
                  <Text
                    strong
                    style={{
                      fontSize: 18,
                      color: remainingAfterPayment > 0 ? "#fa8c16" : "#52c41a",
                    }}
                  >
                    ৳{remainingAfterPayment.toFixed(2)}
                  </Text>
                </Col>
              </Row>
            </Card>

            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={isPending}
                icon={<CheckCircleOutlined />}
              >
                Collect Due
              </Button>
              <Button onClick={() => navigate(`/${org}/${config.backPath}`)}>
                Cancel
              </Button>
            </Space>
          </Form>
        </Card>
      )}
    </Space>
  );
}
