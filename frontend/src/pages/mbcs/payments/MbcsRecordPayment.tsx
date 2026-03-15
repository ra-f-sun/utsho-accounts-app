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
import {
  mbcsPaymentsService,
  MBCS_PAYMENT_TYPES,
} from "../../../services/mbcsPaymentsService";
import type { CreateMbcsMultiPaymentDto } from "../../../services/mbcsPaymentsService";
import { mbcsStudentsService } from "../../../services/mbcsStudentsService";
import type { MbcsStudent } from "../../../services/mbcsStudentsService";
import settingsService from "../../../services/settingsService";
import axios from "axios";
import { MBCS_CLASS_MAP } from "../../../constants/mbcsClasses";
import dayjs from "dayjs";

const { Option } = Select;
const { Text } = Typography;

interface MbcsPaymentFormLineItem {
  paymentType?: string;
  amount?: number;
  paymentMonth?: ReturnType<typeof dayjs>;
  notes?: string;
}

interface MbcsPaymentFormValues {
  studentId: string;
  paymentDate?: ReturnType<typeof dayjs>;
  paymentMethod: string;
  lineItems: MbcsPaymentFormLineItem[];
  additionalDiscount?: number;
  dueAmount?: number;
}

export default function MbcsRecordPayment() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");

  // Cascading filter state
  const [selectedClass, setSelectedClass] = useState<number | undefined>();
  const [selectedShift, setSelectedShift] = useState<string | undefined>();
  const [selectedStudentId, setSelectedStudentId] = useState<
    string | undefined
  >();
  const initialStudentApplied = useRef(false);

  // Fetch invoice mode setting
  const { data: invoiceModeData } = useQuery({
    queryKey: ["mbcs-settings", "invoice_mode"],
    queryFn: () => settingsService.getSetting("mbcs", "invoice_mode"),
  });
  const invoiceMode =
    (invoiceModeData as { settingValue?: string } | null)?.settingValue ?? "dual";

  // Fetch study materials setting
  const { data: studyMaterialsData } = useQuery({
    queryKey: ["mbcs-settings", "study_materials"],
    queryFn: () => settingsService.getSetting("mbcs", "study_materials"),
  });
  const studyMaterials: Array<{ name: string; price: number }> =
    (studyMaterialsData as { settingValue?: { items: Array<{ name: string; price: number }> } } | null)
      ?.settingValue?.items ?? [];

  // Fetch late fee amount setting
  const { data: lateFeeData } = useQuery({
    queryKey: ["mbcs-settings", "late_fee_amount"],
    queryFn: () => settingsService.getSetting("mbcs", "late_fee_amount"),
  });
  const lateFeeAmount: number =
    (lateFeeData as { settingValue?: { value?: number } } | null)?.settingValue?.value ?? 0;

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ["mbcs-students"],
    queryFn: () => mbcsStudentsService.getAll(undefined, 1, 1000),
  });

  const allStudents: MbcsStudent[] = useMemo(() => studentsData?.data?.data || [], [studentsData]);

  // Derive unique classes and shifts
  const availableClasses = useMemo(
    () => [...new Set(allStudents.map((s) => s.class))].sort((a, b) => a - b),
    [allStudents],
  );

  const availableShifts = useMemo(() => {
    const students = selectedClass
      ? allStudents.filter((s) => s.class === selectedClass)
      : allStudents;
    return [
      ...new Set(students.map((s) => s.shift).filter(Boolean) as string[]),
    ];
  }, [allStudents, selectedClass]);

  // Filter students for the dropdown
  const filteredStudents = useMemo(() => {
    let result = allStudents;
    if (selectedClass) result = result.filter((s) => s.class === selectedClass);
    if (selectedShift) result = result.filter((s) => s.shift === selectedShift);
    return result;
  }, [allStudents, selectedClass, selectedShift]);

  // Auto-populate from URL query params
  useEffect(() => {
    if (initialStudentApplied.current) return;
    const studentId = searchParams.get("studentId");
    if (studentId && allStudents.length > 0) {
      const student = allStudents.find((s) => s.id === studentId);
      if (student) {
        initialStudentApplied.current = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URL param auto-population
        setSelectedClass(student.class);
         
        setSelectedShift(student.shift);
         
        setSelectedStudentId(studentId);
        form.setFieldsValue({ studentId });
      }
    }
  }, [searchParams, allStudents, form]);

  // Get currently selected student object
  const selectedStudent = allStudents.find((s) => s.id === selectedStudentId);

  // Auto-fill amount on type change — discount-aware
  const onLineItemTypeChange = (type: string, fieldIndex: number) => {
    if (!selectedStudent) return;
    const lineItems: MbcsPaymentFormLineItem[] = form.getFieldValue("lineItems") || [];
    let amount: number | undefined;
    if (type === "tuition") {
      amount =
        (selectedStudent.monthlyTuitionFee ?? 0) -
        (selectedStudent.discountTuition ?? 0);
    } else if (type === "admission") {
      const base = selectedStudent.admissionFee ?? 0;
      if (base > 0)
        amount = base - (selectedStudent.discountAdmission ?? 0);
    } else if (type === "readmission") {
      const base = selectedStudent.readmissionFee ?? 0;
      if (base > 0)
        amount = base - (selectedStudent.discountReadmission ?? 0);
    } else if (type === "late_fee") {
      if (lateFeeAmount > 0) amount = lateFeeAmount;
    }
    if (amount !== undefined) {
      lineItems[fieldIndex] = { ...lineItems[fieldIndex], amount };
      form.setFieldValue("lineItems", lineItems);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateMbcsMultiPaymentDto) =>
      mbcsPaymentsService.createMulti(data),
    onSuccess: (response) => {
      const invoice = response?.data?.invoiceNumber;
      setInvoiceNumber(invoice || "");
      message.success(`Payment recorded! Invoice: ${invoice}`);
      queryClient.invalidateQueries({ queryKey: ["mbcs-payments"] });
      queryClient.invalidateQueries({ queryKey: ["mbcs-payment-history"] });
      form.setFieldsValue({ lineItems: [{}], paymentDate: dayjs(), additionalDiscount: 0, dueAmount: 0 });
      setSelectedStudentId(undefined);
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        message.error(err.response.data?.message || "Duplicate payment detected");
      } else {
        message.error("Failed to record payment");
      }
    },
  });

  const onFinish = (values: MbcsPaymentFormValues) => {
    const paymentDate = values.paymentDate
      ? values.paymentDate.toISOString()
      : new Date().toISOString();

    const lineItems: CreateMbcsMultiPaymentDto["lineItems"] = (values.lineItems || [])
      .filter(
        (
          item,
        ): item is MbcsPaymentFormLineItem & { paymentType: string; amount: number } =>
          Boolean(item?.paymentType) && typeof item?.amount === "number",
      )
      .map((item) => ({
      paymentType: item.paymentType,
      amount: item.amount,
      paymentMonth:
        item.paymentType === "tuition" && item.paymentMonth
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

    const data: CreateMbcsMultiPaymentDto = {
      studentId: values.studentId,
      paymentDate,
      paymentMethod: values.paymentMethod,
      lineItems,
      additionalDiscount: values.additionalDiscount ?? 0,
      dueAmount: values.dueAmount ?? 0,
    };
    createMutation.mutate(data);
  };

  // Live form watchers for summary card
  const formLineItems = Form.useWatch("lineItems", form);
  const additionalDiscountValue = Form.useWatch("additionalDiscount", form) ?? 0;
  const dueAmountValue = Form.useWatch("dueAmount", form) ?? 0;

  const guardianSubTotal = useMemo(() => {
    if (!Array.isArray(formLineItems)) return 0;
    return formLineItems.reduce((sum: number, item: MbcsPaymentFormLineItem | undefined) => {
      if (!item) return sum;
      if (invoiceMode === "unified") return sum + (item.amount ?? 0);
      if (item.paymentType === "tuition") {
        return sum + (selectedStudent?.monthlyTuitionFee ?? item.amount ?? 0);
      } else if (item.paymentType === "admission") {
        return sum + (selectedStudent?.admissionFee ?? item.amount ?? 0);
      } else if (item.paymentType === "readmission") {
        return sum + (selectedStudent?.readmissionFee ?? item.amount ?? 0);
      }
      return sum + (item.amount ?? 0);
    }, 0);
  }, [formLineItems, selectedStudent, invoiceMode]);

  const officeSubTotal = useMemo(() => {
    if (!Array.isArray(formLineItems)) return 0;
    return formLineItems.reduce((sum: number, item: MbcsPaymentFormLineItem | undefined) => sum + (item?.amount ?? 0), 0);
  }, [formLineItems]);

  const guardianGrandTotal = guardianSubTotal - additionalDiscountValue;
  const officeGrandTotal = officeSubTotal - additionalDiscountValue;
  const guardianPaid = guardianGrandTotal - dueAmountValue;
  const officePaid = officeGrandTotal - dueAmountValue;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>Record Payment (MBCS)</h2>

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
                  navigate(`/mbcs/payments/invoice/${invoiceNumber}`)
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
        <Card title="Student Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Filter by Class">
                <Select
                  placeholder="All Classes"
                  value={selectedClass}
                  onChange={(value) => {
                    setSelectedClass(value);
                    setSelectedShift(undefined);
                    form.setFieldValue("studentId", undefined);
                  }}
                  allowClear
                >
                  {availableClasses.map((cls) => (
                    <Option key={cls} value={cls}>
                      {MBCS_CLASS_MAP[cls] ?? `Class ${cls}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Filter by Shift">
                <Select
                  placeholder="All Shifts"
                  value={selectedShift}
                  onChange={(value) => {
                    setSelectedShift(value);
                    form.setFieldValue("studentId", undefined);
                  }}
                  allowClear
                  disabled={availableShifts.length === 0}
                >
                  {availableShifts.map((s) => (
                    <Option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <div style={{ fontSize: 12, color: "#888", marginTop: 30 }}>
                {filteredStudents.length} students available
              </div>
            </Col>
          </Row>
          <Form.Item
            label="Select Student"
            name="studentId"
            rules={[{ required: true, message: "Please select a student" }]}
          >
            <Select
              placeholder="Search and select student"
              showSearch
              options={filteredStudents.map((student) => ({
                value: student.id,
                label: `${student.name} - ${MBCS_CLASS_MAP[student.class] ?? `Class ${student.class}`}${student.shift ? ` (${student.shift})` : ""} · ${student.contactNumber}`,
              }))}
              filterOption={(input, option) =>
                ((option?.label as string) || "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onChange={(value) => setSelectedStudentId(value)}
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
                rules={[
                  { required: true, message: "Please select payment method" },
                ]}
              >
                <Select placeholder="Select payment method">
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
                rules={[
                  { required: true, message: "Please select payment date" },
                ]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Line Items */}
        <Card title="Payment Line Items" style={{ marginBottom: 16 }}>
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
                      <Col flex="1">
                        <Form.Item
                          {...restField}
                          name={[name, "paymentType"]}
                          label="Payment Type"
                          rules={[{ required: true, message: "Required" }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="Select type"
                            onChange={(val) =>
                              onLineItemTypeChange(val, index)
                            }
                          >
                            {MBCS_PAYMENT_TYPES.map((pt) => (
                              <Option key={pt.value} value={pt.value}>
                                {pt.label}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, curr) =>
                          prev?.lineItems?.[name]?.paymentType !==
                          curr?.lineItems?.[name]?.paymentType
                        }
                      >
                        {({ getFieldValue }) => {
                          const type = getFieldValue([
                            "lineItems",
                            name,
                            "paymentType",
                          ]);
                          if (type === "tuition") {
                            return (
                              <Col flex="160px">
                                <Form.Item
                                  {...restField}
                                  name={[name, "paymentMonth"]}
                                  label="Month"
                                  rules={[
                                    { required: true, message: "Required" },
                                  ]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <DatePicker
                                    picker="month"
                                    style={{ width: "100%" }}
                                    format="MMM YYYY"
                                  />
                                </Form.Item>
                              </Col>
                            );
                          }
                          if (type === "study_materials" && studyMaterials.length > 0) {
                            return (
                              <Col flex="200px">
                                <Form.Item
                                  label="Select Material"
                                  style={{ marginBottom: 0 }}
                                >
                                  <Select
                                    placeholder="Pick a material"
                                    onChange={(materialName: string) => {
                                      const mat = studyMaterials.find(
                                        (m) => m.name === materialName,
                                      );
                                      if (mat) {
                                        const lineItems: MbcsPaymentFormLineItem[] =
                                          form.getFieldValue("lineItems") || [];
                                        lineItems[index] = {
                                          ...lineItems[index],
                                          amount: mat.price,
                                          notes: mat.name,
                                        };
                                        form.setFieldValue(
                                          "lineItems",
                                          lineItems,
                                        );
                                      }
                                    }}
                                  >
                                    {studyMaterials.map((m) => (
                                      <Option key={m.name} value={m.name}>
                                        {m.name} — ৳{m.price}
                                      </Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </Col>
                            );
                          }
                          return null;
                        }}
                      </Form.Item>

                      <Col flex="120px">
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
                  Add Line Item
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
                  (item: MbcsPaymentFormLineItem, i: number) => {
                    if (!item?.paymentType) return null;
                    const label = item.paymentType
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c: string) => c.toUpperCase());
                    let guardianAmt = item.amount ?? 0;
                    if (invoiceMode !== "unified") {
                      if (item.paymentType === "tuition")
                        guardianAmt =
                          selectedStudent?.monthlyTuitionFee ?? guardianAmt;
                      else if (item.paymentType === "admission")
                        guardianAmt =
                          selectedStudent?.admissionFee ?? guardianAmt;
                      else if (item.paymentType === "readmission")
                        guardianAmt =
                          selectedStudent?.readmissionFee ?? guardianAmt;
                    }
                    return (
                      <Row
                        key={i}
                        justify="space-between"
                        style={{ marginBottom: 4, fontSize: 13 }}
                      >
                        <Col>{label}</Col>
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
                  items={[
                    {
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
                          {(formLineItems || []).map((item: { paymentType?: string; amount?: number }, i: number) => (
                            item?.paymentType ? (
                              <Row key={i} justify="space-between" style={{ marginBottom: 4, fontSize: 13 }}>
                                <Col><Text type="secondary">{item.paymentType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</Text></Col>
                                <Col>৳{(item.amount ?? 0).toFixed(2)}</Col>
                              </Row>
                            ) : null
                          ))}
                          <Row justify="space-between" style={{ marginBottom: 8, marginTop: 4 }}>
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
                          <Row justify="space-between" style={{ marginBottom: 8 }}>
                            <Col><Text type="danger">Due</Text></Col>
                            <Col><Text type="danger">৳{dueAmountValue.toFixed(2)}</Text></Col>
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
                        </>
                      ),
                    },
                  ]}
                />
              </Col>
            )}
          </Row>
        </Card>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending}
              size="large"
            >
              Record Payment
            </Button>
            <Button size="large" onClick={() => navigate("/mbcs/payments")}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}
