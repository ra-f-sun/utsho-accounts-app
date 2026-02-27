import { useState, useEffect, useMemo } from "react";
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
  Alert,
  Divider,
  Space,
  Typography,
  Collapse,
} from "antd";
import { Input } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { mecPaymentsService } from "../../../services/mecPaymentsService";
import type { CreateMecMultiPaymentDto } from "../../../services/mecPaymentsService";
import { mecStudentsService } from "../../../services/mecStudentsService";
import type { MecStudent } from "../../../services/mecStudentsService";
import settingsService from "../../../services/settingsService";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

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

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ["mec-students"],
    queryFn: () => mecStudentsService.getAll(undefined, 1, 1000),
  });

  const allStudents: MecStudent[] = studentsData?.data?.data || [];

  // Fetch invoice mode setting
  const { data: invoiceModeData } = useQuery({
    queryKey: ["mec-settings", "invoice_mode"],
    queryFn: () => settingsService.getSetting("mec", "invoice_mode"),
  });
  const invoiceMode =
    (invoiceModeData as { settingValue?: string } | null)?.settingValue ?? "dual";

  // Auto-populate from URL ?studentId=
  useEffect(() => {
    const studentId = searchParams.get("studentId");
    if (studentId && allStudents.length > 0) {
      const student = allStudents.find((s) => s.id === studentId);
      if (student) {
        setSelectedStudentId(studentId);
        form.setFieldsValue({
          studentId,
          amount: (student.monthlyTuitionFee ?? 0) - (student.discountTuition ?? 0),
        });
      }
    }
  }, [searchParams, allStudents, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateMecMultiPaymentDto) =>
      mecPaymentsService.createMulti(data),
    onSuccess: (response) => {
      const invoice = response?.data?.invoiceNumber;
      setInvoiceNumber(invoice || "");
      message.success(`Payment recorded! Invoice: ${invoice}`);
      queryClient.invalidateQueries({ queryKey: ["mec-payment-history"] });
      queryClient.invalidateQueries({ queryKey: ["mec-payments"] });
      queryClient.invalidateQueries({ queryKey: ["mec-students"] });
      setSelectedStudentId(undefined);
      form.setFieldsValue({ lineItems: [{}], paymentDate: dayjs(), additionalDiscount: 0, dueAmount: 0 });
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        message.error(err.response.data?.message || "Duplicate payment detected");
      } else {
        message.error("Failed to record payment");
      }
    },
  });

  const onFinish = (values: any) => {
    const paymentDate = values.paymentDate
      ? values.paymentDate.toISOString()
      : new Date().toISOString();

    const lineItems = (values.lineItems || []).map((item: any) => ({
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

    const data: CreateMecMultiPaymentDto = {
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
    return formLineItems.reduce((sum: number, item: any) => {
      if (!item) return sum;
      if (invoiceMode === "unified") return sum + (item.amount ?? 0);
      // MEC: all items are tuition — guardian amount = full monthly fee (pre-discount)
      return sum + (selectedStudent?.monthlyTuitionFee ?? item.amount ?? 0);
    }, 0);
  }, [formLineItems, selectedStudent, invoiceMode]);

  const officeSubTotal = useMemo(() => {
    if (!Array.isArray(formLineItems)) return 0;
    return formLineItems.reduce((sum: number, item: any) => sum + (item?.amount ?? 0), 0);
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
                  <Option value="cash">Cash</Option>
                  <Option value="bkash">bKash</Option>
                  <Option value="nagad">Nagad</Option>
                  <Option value="bank_transfer">Bank Transfer</Option>
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
                          <Input placeholder="Optional" />
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
                <Collapse ghost>
                  <Collapse.Panel
                    header={
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
                    }
                    key="office"
                  >
                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                      <Col>Sub Total</Col>
                      <Col>৳{officeSubTotal.toFixed(2)}</Col>
                    </Row>
                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                      <Col>
                        <strong>Grand Total</strong>
                      </Col>
                      <Col>
                        <strong>৳{officeGrandTotal.toFixed(2)}</strong>
                      </Col>
                    </Row>
                    <Divider style={{ margin: "8px 0" }} />
                    <Row justify="space-between">
                      <Col>
                        <strong>Paid</strong>
                      </Col>
                      <Col>
                        <strong style={{ color: "#52c41a" }}>
                          ৳{officePaid.toFixed(2)}
                        </strong>
                      </Col>
                    </Row>
                  </Collapse.Panel>
                </Collapse>
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

