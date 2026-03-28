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
  paymentsService,
  UAC_PAYMENT_TYPES,
} from "../../../services/paymentsService";
import type { CreateMultiPaymentDto } from "../../../services/paymentsService";
import { studentsService } from "../../../services/studentsService";
import type { Student } from "../../../services/studentsService";
import settingsService from "../../../services/settingsService";
import axios from "axios";
import dayjs from "dayjs";

const { Option } = Select;
const { Text } = Typography;

interface UacPaymentFormLineItem {
  paymentType?: string;
  amount?: number;
  paymentMonth?: ReturnType<typeof dayjs>;
  notes?: string;
}

interface UacPaymentFormValues {
  studentId: string;
  paymentDate?: ReturnType<typeof dayjs>;
  paymentMethod: string;
  lineItems: UacPaymentFormLineItem[];
  additionalDiscount?: number;
  dueAmount?: number;
}

export default function RecordPayment() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");

  // Cascading filter state
  const [selectedClass, setSelectedClass] = useState<number | undefined>();
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const [selectedStudentId, setSelectedStudentId] = useState<
    string | undefined
  >();
  const initialStudentApplied = useRef(false);

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsService.getAll(undefined, 1, 1000),
  });

  const allStudents: Student[] = useMemo(() => studentsData?.data?.data || [], [studentsData]);

  // Derive unique classes and groups from students
  const availableClasses = useMemo(
    () => [...new Set(allStudents.map((s) => s.class))].sort((a, b) => a - b),
    [allStudents],
  );

  const availableGroups = useMemo(() => {
    const students = selectedClass
      ? allStudents.filter((s) => s.class === selectedClass)
      : allStudents;
    return [
      ...new Set(students.map((s) => s.group).filter(Boolean) as string[]),
    ];
  }, [allStudents, selectedClass]);

  // Filter students for the dropdown
  const filteredStudents = useMemo(() => {
    let result = allStudents;
    if (selectedClass) result = result.filter((s) => s.class === selectedClass);
    if (selectedGroup) result = result.filter((s) => s.group === selectedGroup);
    return result;
  }, [allStudents, selectedClass, selectedGroup]);

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
         
        setSelectedGroup(student.group);
         
        setSelectedStudentId(studentId);
        form.setFieldsValue({ studentId });
      }
    }
  }, [searchParams, allStudents, form]);

  // Get currently selected student object
  const selectedStudent = allStudents.find((s) => s.id === selectedStudentId);

  // Fetch study materials setting
  const { data: studyMaterialsData } = useQuery({
    queryKey: ["uac-settings", "study_materials"],
    queryFn: () => settingsService.getSetting("uac", "study_materials"),
  });
  const studyMaterials: Array<{ name: string; price: number }> =
    (studyMaterialsData as { settingValue?: { items: Array<{ name: string; price: number }> } } | null)
      ?.settingValue?.items ?? [];

  // Fetch invoice mode setting
  const { data: invoiceModeData } = useQuery({
    queryKey: ["uac-settings", "invoice_mode"],
    queryFn: () => settingsService.getSetting("uac", "invoice_mode"),
  });
  const invoiceMode = (invoiceModeData as { settingValue?: string } | null)?.settingValue ?? "dual";

  // Watch form values for live totals
  const formLineItems = Form.useWatch("lineItems", form);
  const additionalDiscountValue = Form.useWatch("additionalDiscount", form) ?? 0;
  const dueAmountValue = Form.useWatch("dueAmount", form) ?? 0;

  // Guardian sub total: full (pre-discount) amounts from student profile
  const guardianSubTotal = useMemo(() => {
    if (!formLineItems || formLineItems.length === 0) return 0;
    return (formLineItems as UacPaymentFormLineItem[]).reduce((sum: number, item: UacPaymentFormLineItem) => {
      const type = item?.paymentType;
      if (type === "tuition") return sum + (selectedStudent?.monthlyTuitionFee ?? item?.amount ?? 0);
      if (type === "admission") return sum + (selectedStudent?.admissionFee ?? item?.amount ?? 0);
      if (type === "readmission") return sum + (selectedStudent?.readmissionFee ?? item?.amount ?? 0);
      return sum + (item?.amount ?? 0);
    }, 0);
  }, [formLineItems, selectedStudent]);

  // Office sub total: actual (post-discount) amounts from form inputs
  const officeSubTotal = useMemo(() => {
    if (!formLineItems || formLineItems.length === 0) return 0;
    return (formLineItems as UacPaymentFormLineItem[]).reduce((sum: number, item: UacPaymentFormLineItem) => sum + (item?.amount ?? 0), 0);
  }, [formLineItems]);

  const guardianGrandTotal = guardianSubTotal - additionalDiscountValue;
  const officeGrandTotal = officeSubTotal - additionalDiscountValue;
  const guardianPaid = guardianGrandTotal - dueAmountValue;
  const officePaid = officeGrandTotal - dueAmountValue;

  // Auto-fill amount on type change — discount-aware
  const onLineItemTypeChange = (type: string, fieldIndex: number) => {
    if (!selectedStudent) return;
    const lineItems: UacPaymentFormLineItem[] = form.getFieldValue("lineItems") || [];
    let amount: number | undefined;
    if (type === "tuition") {
      amount =
        (selectedStudent.monthlyTuitionFee ?? 0) -
        (selectedStudent.discountTuition ?? 0);
    } else if (type === "admission") {
      const base = selectedStudent.admissionFee ?? 0;
      if (base > 0) amount = base - (selectedStudent.discountAdmission ?? 0);
    } else if (type === "readmission") {
      const base = selectedStudent.readmissionFee ?? 0;
      if (base > 0)
        amount = base - (selectedStudent.discountReadmission ?? 0);
    }
    if (amount !== undefined) {
      lineItems[fieldIndex] = { ...lineItems[fieldIndex], amount };
      form.setFieldValue("lineItems", lineItems);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateMultiPaymentDto) =>
      paymentsService.createMulti(data),
    onSuccess: (response) => {
      const invoice = response?.data?.invoiceNumber;
      setInvoiceNumber(invoice || "");
      message.success(`Payment recorded! Invoice: ${invoice}`);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["uac-payment-history"] });
      form.resetFields();
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

  const onFinish = (values: UacPaymentFormValues) => {
    const paymentDate = values.paymentDate
      ? values.paymentDate.toISOString()
      : new Date().toISOString();

    const allItems = values.lineItems || [];
    const validItems = allItems.filter(
      (
        item,
      ): item is UacPaymentFormLineItem & { paymentType: string; amount: number } =>
        Boolean(item?.paymentType) && typeof item?.amount === "number",
    );
    const removedCount = allItems.length - validItems.length;
    if (removedCount > 0) {
      message.warning(`${removedCount} empty line item${removedCount > 1 ? "s" : ""} removed before submission.`);
    }
    if (validItems.length === 0) {
      message.error("Please fill in at least one payment line item.");
      return;
    }

    const lineItems: CreateMultiPaymentDto["lineItems"] = validItems.map((item) => ({
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

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>Record Payment</h2>

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
                  navigate(`/uac/payments/invoice/${invoiceNumber}`)
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
        {/* Student Selection with Cascading Filters */}
        <Card title="Student Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Filter by Class">
                <Select
                  placeholder="All Classes"
                  value={selectedClass}
                  onChange={(value) => {
                    setSelectedClass(value);
                    setSelectedGroup(undefined);
                    form.setFieldValue("studentId", undefined);
                  }}
                  allowClear
                >
                  {availableClasses.map((cls) => (
                    <Option key={cls} value={cls}>
                      Class {cls}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Filter by Group">
                <Select
                  placeholder="All Groups"
                  value={selectedGroup}
                  onChange={(value) => {
                    setSelectedGroup(value);
                    form.setFieldValue("studentId", undefined);
                  }}
                  allowClear
                  disabled={availableGroups.length === 0}
                >
                  {availableGroups.map((g) => (
                    <Option key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
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
                label: `${student.name} - Class ${student.class}${student.group ? ` (${student.group})` : ""} · ${student.contactNumber}`,
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
                            onChange={(val) => onLineItemTypeChange(val, index)}
                          >
                            {UAC_PAYMENT_TYPES.map((pt) => (
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
                                        const lineItems: UacPaymentFormLineItem[] =
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
                (formLineItems as UacPaymentFormLineItem[]).map(
                  (item: UacPaymentFormLineItem, i: number) => {
                    if (!item?.paymentType) return null;
                    const label = item.paymentType
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c: string) => c.toUpperCase());
                    let guardianAmt = item.amount ?? 0;
                    if (item.paymentType === "tuition")
                      guardianAmt =
                        selectedStudent?.monthlyTuitionFee ?? guardianAmt;
                    else if (item.paymentType === "admission")
                      guardianAmt =
                        selectedStudent?.admissionFee ?? guardianAmt;
                    else if (item.paymentType === "readmission")
                      guardianAmt =
                        selectedStudent?.readmissionFee ?? guardianAmt;
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
            <Button size="large" onClick={() => navigate("/uac/payments")}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}
