import { useState, useEffect, useMemo, useRef } from "react";
import {
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  App,
  DatePicker,
  Alert,
  Divider,
  Space,
  Typography,
  Collapse,
} from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { paymentsService } from "../../../services/paymentsService";
import type { CreateMultiPaymentDto } from "../../../services/paymentsService";
import { studentsService } from "../../../services/studentsService";
import type { Student } from "../../../services/studentsService";
import axios from "axios";
import settingsService from "../../../services/settingsService";
import { ALL_PAYMENT_METHODS } from "../../../constants/paymentMethods";
import dayjs from "dayjs";

const { Option } = Select;
const { Text } = Typography;

interface MecPaymentFormLineItem {
  amount?: number;
  paymentMonth?: ReturnType<typeof dayjs>;
  notes?: string;
}

interface MecPaymentFormValues {
  studentId: string;
  paymentDate?: ReturnType<typeof dayjs>;
  paymentMethod: string;
  lineItems: MecPaymentFormLineItem[];
  additionalDiscount?: number;
  dueAmount?: number;
}

export default function MecRecordPayment() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<
    string | undefined
  >();
  const initialStudentApplied = useRef(false);

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ["mec", "students"],
    queryFn: () => studentsService.getAll("mec", undefined, 1, 1000),
  });

  const allStudents: Student[] = useMemo(() => studentsData?.data?.data || [], [studentsData]);

  // Fetch invoice mode setting
  const { data: invoiceModeData } = useQuery({
    queryKey: ["mec-settings", "invoice_mode"],
    queryFn: () => settingsService.getSetting("mec", "invoice_mode"),
  });
  const invoiceMode =
    (invoiceModeData as { settingValue?: string } | null)?.settingValue ?? "dual";

  // Fetch enabled payment methods
  const { data: pmSetting } = useQuery({
    queryKey: ["mec-settings", "payment_methods"],
    queryFn: () => settingsService.getSetting("mec", "payment_methods"),
  });
  const enabledPaymentMethods = (() => {
    const vals = (pmSetting?.settingValue as { values?: string[] } | null)?.values;
    return Array.isArray(vals) && vals.length > 0
      ? ALL_PAYMENT_METHODS.filter((m) => vals.includes(m.value))
      : ALL_PAYMENT_METHODS;
  })();

  // Auto-populate from URL ?studentId=
  useEffect(() => {
    if (initialStudentApplied.current) return;
    const studentId = searchParams.get("studentId");
    if (studentId && allStudents.length > 0) {
      const student = allStudents.find((s) => s.id === studentId);
      if (student) {
        initialStudentApplied.current = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URL param auto-population
        setSelectedStudentId(studentId);
        form.setFieldsValue({
          studentId,
          amount: (student.monthlyTuitionFee ?? 0) - (student.discountTuition ?? 0),
        });
      }
    }
  }, [searchParams, allStudents, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateMultiPaymentDto) =>
      paymentsService.createMulti("mec", data),
    onSuccess: (response) => {
      const invoice = response?.data?.invoiceNumber;
      setInvoiceNumber(invoice || "");
      message.success(`Payment recorded! Invoice: ${invoice}`);
      queryClient.invalidateQueries({ queryKey: ["mec", "payment-history"] });
      queryClient.invalidateQueries({ queryKey: ["mec", "payments"] });
      queryClient.invalidateQueries({ queryKey: ["mec", "students"] });
      setSelectedStudentId(undefined);
      form.setFieldsValue({ lineItems: [{}], paymentDate: dayjs(), additionalDiscount: 0, dueAmount: 0 });
    },
    onError: (err: Error) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        message.error(err.response.data?.message || "Duplicate payment detected");
      } else {
        message.error("Failed to record payment");
      }
    },
  });

  const onFinish = (values: MecPaymentFormValues) => {
    const paymentDate = values.paymentDate
      ? values.paymentDate.toISOString()
      : new Date().toISOString();

    const allItems = values.lineItems || [];
    const validItems = allItems.filter(
      (item): item is MecPaymentFormLineItem & { amount: number } =>
        typeof item?.amount === "number",
    );
    const removedCount = allItems.length - validItems.length;
    if (removedCount > 0) {
      message.warning(`${removedCount} empty line item${removedCount > 1 ? "s" : ""} removed before submission.`);
    }
    if (validItems.length === 0) {
      message.error("Please fill in at least one payment line item.");
      return;
    }

    const lineItems: CreateMecMultiPaymentDto["lineItems"] = validItems.map((item) => ({
      amount: item.amount,
      paymentMonth: item.paymentMonth
        ? item.paymentMonth.startOf("month").toISOString()
        : values.paymentDate
          ? values.paymentDate.startOf("month").toISOString()
          : new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1,
            ).toISOString(),
      notes: item.notes,
    }));

    const data: CreateMultiPaymentDto = {
      studentId: values.studentId,
      paymentDate,
      paymentMethod: values.paymentMethod,
      lineItems,
      additionalDiscount: values.additionalDiscount ?? 0,
      dueAmount: values.dueAmount ?? 0,
    };
    createMutation.mutate(data);
  };

  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
    const student = allStudents.find((s) => s.id === studentId);
    if (student) {
      // Pre-fill the first line item's amount with the effective tuition fee (minus discount)
      const lineItems = form.getFieldValue("lineItems") || [{}];
      if (lineItems.length > 0) {
        lineItems[0] = {
          ...lineItems[0],
          amount:
            (student.monthlyTuitionFee ?? 0) -
            (student.discountTuition ?? 0),
        };
        form.setFieldValue("lineItems", lineItems);
      }
    }
  };

  const selectedStudent = allStudents.find((s) => s.id === selectedStudentId);

  // Live form watchers for summary card
  const formLineItems = Form.useWatch("lineItems", form);
  const additionalDiscountValue = Form.useWatch("additionalDiscount", form) ?? 0;
  const dueAmountValue = Form.useWatch("dueAmount", form) ?? 0;

  const guardianSubTotal = useMemo(() => {
    if (!Array.isArray(formLineItems)) return 0;
    return formLineItems.reduce((sum: number, item: MecPaymentFormLineItem | undefined) => {
      if (!item) return sum;
      if (invoiceMode === "unified") return sum + (item.amount ?? 0);
      // MEC: all items are tuition — guardian amount = full monthly fee (pre-discount)
      return sum + (selectedStudent?.monthlyTuitionFee ?? item.amount ?? 0);
    }, 0);
  }, [formLineItems, selectedStudent, invoiceMode]);

  const officeSubTotal = useMemo(() => {
    if (!Array.isArray(formLineItems)) return 0;
    return formLineItems.reduce((sum: number, item: MecPaymentFormLineItem | undefined) => sum + (item?.amount ?? 0), 0);
  }, [formLineItems]);

  const guardianGrandTotal = guardianSubTotal - additionalDiscountValue;
  const officeGrandTotal = officeSubTotal - additionalDiscountValue;
  const guardianPaid = guardianGrandTotal - dueAmountValue;
  const officePaid = officeGrandTotal - dueAmountValue;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>Record Payment — MEC</h2>

      {invoiceNumber && (
        <Alert
          title="Payment Recorded Successfully!"
          description={
            <div>
              <div>
                Invoice Number: <strong>{invoiceNumber}</strong>
              </div>
              <Button
                type="link"
                icon={<EyeOutlined />}
                onClick={() =>
                  navigate(`/mec/payments/invoice/${invoiceNumber}`)
                }
                style={{ padding: 0, marginTop: 4 }}
              >
                View / Print Invoice
              </Button>
            </div>
          }
          type="success"
          showIcon
          closable
          onClose={() => setInvoiceNumber("")}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ lineItems: [{}], paymentDate: dayjs(), additionalDiscount: 0, dueAmount: 0 }}
      >
        <Card title="Student Selection" style={{ marginBottom: 16 }}>
          <Form.Item
            label="Select Student"
            name="studentId"
            rules={[{ required: true, message: "Please select a student" }]}
          >
            <Select
              showSearch
              placeholder="Search by name..."
              optionFilterProp="label"
              onChange={handleStudentChange}
              style={{ width: "100%" }}
              options={allStudents.map((s) => ({
                value: s.id,
                label: `${s.name}${s.class ? ` — Class ${s.class}` : ""}`,
              }))}
            />
          </Form.Item>
          {selectedStudent && (
            <Text type="secondary">
              Monthly Tuition:{" "}
              <strong>৳{selectedStudent.monthlyTuitionFee}</strong>
            </Text>
          )}
        </Card>

        {/* Global Payment Settings */}
        <Card title="Payment Settings" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Payment Method"
                name="paymentMethod"
                rules={[{ required: true, message: "Required" }]}
              >
                <Select>
                  {enabledPaymentMethods.map((m) => (
                    <Option key={m.value} value={m.value}>{m.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Payment Date"
                name="paymentDate"
                rules={[{ required: true, message: "Required" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Line Items */}
        <Card title="Tuition Line Items" style={{ marginBottom: 16 }}>
          <Form.List name="lineItems">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <div key={key}>
                    {index > 0 && <Divider style={{ margin: "12px 0" }} />}
                    <Row gutter={12} align="middle">
                      <Col flex="30px">
                        <Text type="secondary" style={{ fontWeight: 600 }}>
                          #{index + 1}
                        </Text>
                      </Col>
                      <Col flex="180px">
                        <Form.Item
                          {...restField}
                          name={[name, "paymentMonth"]}
                          label="Month"
                          rules={[{ required: true, message: "Required" }]}
                          style={{ marginBottom: 0 }}
                        >
                          <DatePicker
                            picker="month"
                            style={{ width: "100%" }}
                            format="MMM YYYY"
                            disabledDate={(d) => d.isAfter(dayjs(), "month")}
                          />
                        </Form.Item>
                      </Col>
                      <Col flex="140px">
                        <Form.Item
                          {...restField}
                          name={[name, "amount"]}
                          label="Amount (৳)"
                          rules={[{ required: true, message: "Required" }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            min={0}
                            style={{ width: "100%" }}
                            placeholder="0"
                          />
                        </Form.Item>
                      </Col>
                      <Col flex="1">
                        <Form.Item
                          {...restField}
                          name={[name, "notes"]}
                          label="Notes"
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="Optional" maxLength={500} />
                        </Form.Item>
                      </Col>
                      <Col flex="32px" style={{ paddingTop: 28 }}>
                        {fields.length > 1 && (
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          />
                        )}
                      </Col>
                    </Row>
                  </div>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  style={{ marginTop: 16, width: "100%" }}
                >
                  Add Month
                </Button>
              </>
            )}
          </Form.List>
        </Card>

        {/* Payment Summary */}
        <Card title="Payment Summary" style={{ marginBottom: 16 }}>
          <Row gutter={24}>
            <Col span={invoiceMode === "dual" ? 12 : 24}>
              {invoiceMode === "dual" && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#667eea",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Guardian Copy
                </div>
              )}
              {Array.isArray(formLineItems) &&
                formLineItems.map(
                  (item: MecPaymentFormLineItem | undefined, i: number) => {
                    if (!item) return null;
                    const guardianAmt =
                      invoiceMode !== "unified"
                        ? (selectedStudent?.monthlyTuitionFee ?? item.amount ?? 0)
                        : (item.amount ?? 0);
                    return (
                      <Row
                        key={i}
                        justify="space-between"
                        style={{ marginBottom: 4, fontSize: 13 }}
                      >
                        <Col>Month {i + 1}</Col>
                        <Col>৳{guardianAmt.toFixed(2)}</Col>
                      </Row>
                    );
                  },
                )}
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Col>Sub Total</Col>
                <Col>৳{guardianSubTotal.toFixed(2)}</Col>
              </Row>
              <Form.Item
                name="additionalDiscount"
                label="Additional Discount (৳)"
                style={{ marginBottom: 8 }}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Col>
                  <strong>Grand Total</strong>
                </Col>
                <Col>
                  <strong>৳{guardianGrandTotal.toFixed(2)}</strong>
                </Col>
              </Row>
              <Form.Item
                name="dueAmount"
                label="Due Amount (৳)"
                style={{ marginBottom: 8 }}
              >
                <InputNumber
                  min={0}
                  max={guardianGrandTotal}
                  style={{ width: "100%" }}
                />
              </Form.Item>
              <Divider style={{ margin: "8px 0" }} />
              <Row justify="space-between">
                <Col>
                  <strong>Paid</strong>
                </Col>
                <Col>
                  <strong style={{ color: "#52c41a" }}>
                    ৳{guardianPaid.toFixed(2)}
                  </strong>
                </Col>
              </Row>
            </Col>

            {invoiceMode === "dual" && (
              <Col span={12}>
                <Collapse
                  ghost
                  items={[{
                    key: "office",
                    label: (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#f5222d",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Office Summary (Actual)
                      </span>
                    ),
                    children: (
                      <>
                        {Array.isArray(formLineItems) && formLineItems.map((item: Record<string, unknown>, idx: number) => (
                          <Row key={idx} justify="space-between" style={{ marginBottom: 4, fontSize: 13 }}>
                            <Col>Month {idx + 1}</Col>
                            <Col>৳{((item?.amount as number) ?? 0).toFixed(2)}</Col>
                          </Row>
                        ))}
                        <Divider style={{ margin: "6px 0" }} />
                        <Row justify="space-between" style={{ marginBottom: 4 }}>
                          <Col>Sub Total</Col>
                          <Col>৳{officeSubTotal.toFixed(2)}</Col>
                        </Row>
                        {additionalDiscountValue > 0 && (
                          <Row justify="space-between" style={{ marginBottom: 4 }}>
                            <Col>Additional Discount</Col>
                            <Col style={{ color: "#ff4d4f" }}>-৳{additionalDiscountValue.toFixed(2)}</Col>
                          </Row>
                        )}
                        <Row justify="space-between" style={{ marginBottom: 4 }}>
                          <Col><strong>Grand Total</strong></Col>
                          <Col><strong>৳{officeGrandTotal.toFixed(2)}</strong></Col>
                        </Row>
                        {dueAmountValue > 0 && (
                          <Row justify="space-between" style={{ marginBottom: 4 }}>
                            <Col style={{ color: "#ff4d4f" }}>Due</Col>
                            <Col style={{ color: "#ff4d4f" }}>৳{dueAmountValue.toFixed(2)}</Col>
                          </Row>
                        )}
                        <Divider style={{ margin: "6px 0" }} />
                        <Row justify="space-between">
                          <Col><strong>Paid</strong></Col>
                          <Col><strong style={{ color: "#52c41a" }}>৳{officePaid.toFixed(2)}</strong></Col>
                        </Row>
                      </>
                    ),
                  }]}
                />
              </Col>
            )}
          </Row>
        </Card>

        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending}
            size="large"
            disabled={!selectedStudentId}
          >
            Record Payment
          </Button>
          <Button onClick={() => navigate("/mec/payment-history")} size="large">
            Cancel
          </Button>
        </Space>
      </Form>
    </div>
  );
}

