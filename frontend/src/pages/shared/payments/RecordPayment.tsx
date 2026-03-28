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
  MBCS_PAYMENT_TYPES,
} from "../../../services/paymentsService";
import type { CreateMultiPaymentDto } from "../../../services/paymentsService";
import { studentsService } from "../../../services/studentsService";
import type { Student } from "../../../services/studentsService";
import settingsService from "../../../services/settingsService";
import { ALL_PAYMENT_METHODS } from "../../../constants/paymentMethods";
import axios from "axios";
import dayjs from "dayjs";
import { MBCS_CLASS_MAP } from "../../../constants/mbcsClasses";

const { Option } = Select;
const { Text } = Typography;

type OrgType = "uac" | "mbcs" | "mec";

interface OrgConfig {
  secondaryFilter: "group" | "shift" | null;
  secondaryFilterLabel: string;
  classLabel: (c: number) => string;
  studentLabel: (s: Student) => string;
  paymentTypes: { value: string; label: string }[];
  hasPaymentTypes: boolean;
  hasLateFeeAutoFill: boolean;
  title: string;
  lineItemCardTitle: string;
  addLineLabel: string;
  backPath: string;
}

const ORG_CONFIG: Record<OrgType, OrgConfig> = {
  uac: {
    secondaryFilter: "group",
    secondaryFilterLabel: "Group",
    classLabel: (c) => `Class ${c}`,
    studentLabel: (s) =>
      `${s.name} - Class ${s.class}${s.group ? ` (${s.group})` : ""} · ${s.contactNumber}`,
    paymentTypes: UAC_PAYMENT_TYPES,
    hasPaymentTypes: true,
    hasLateFeeAutoFill: false,
    title: "Record Payment",
    lineItemCardTitle: "Payment Line Items",
    addLineLabel: "Add Line Item",
    backPath: "payments",
  },
  mbcs: {
    secondaryFilter: "shift",
    secondaryFilterLabel: "Shift",
    classLabel: (c) => MBCS_CLASS_MAP[c] ?? `Class ${c}`,
    studentLabel: (s) =>
      `${s.name} - ${MBCS_CLASS_MAP[s.class!] ?? `Class ${s.class}`}${s.shift ? ` (${s.shift})` : ""} · ${s.contactNumber}`,
    paymentTypes: MBCS_PAYMENT_TYPES,
    hasPaymentTypes: true,
    hasLateFeeAutoFill: true,
    title: "Record Payment (MBCS)",
    lineItemCardTitle: "Payment Line Items",
    addLineLabel: "Add Line Item",
    backPath: "payments",
  },
  mec: {
    secondaryFilter: null,
    secondaryFilterLabel: "",
    classLabel: (c) => `Class ${c}`,
    studentLabel: (s) =>
      `${s.name}${s.class ? ` — Class ${s.class}` : ""}`,
    paymentTypes: [],
    hasPaymentTypes: false,
    hasLateFeeAutoFill: false,
    title: "Record Payment — MEC",
    lineItemCardTitle: "Tuition Line Items",
    addLineLabel: "Add Month",
    backPath: "payment-history",
  },
};

interface PaymentFormLineItem {
  paymentType?: string;
  amount?: number;
  paymentMonth?: ReturnType<typeof dayjs>;
  notes?: string;
}

interface PaymentFormValues {
  studentId: string;
  paymentDate?: ReturnType<typeof dayjs>;
  paymentMethod: string;
  lineItems: PaymentFormLineItem[];
  additionalDiscount?: number;
  dueAmount?: number;
}

export default function RecordPayment({ org }: { org: OrgType }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const config = ORG_CONFIG[org];

  const [selectedClass, setSelectedClass] = useState<number | undefined>();
  const [selectedSecondary, setSelectedSecondary] = useState<string | undefined>();
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();
  const initialStudentApplied = useRef(false);

  const { data: studentsData } = useQuery({
    queryKey: [org, "students"],
    queryFn: () => studentsService.getAll(org, undefined, 1, 1000),
  });
  const allStudents: Student[] = useMemo(
    () => studentsData?.data?.data || [],
    [studentsData],
  );

  const availableClasses = useMemo(
    () => [...new Set(allStudents.map((s) => s.class))].filter((c): c is number => c != null).sort((a, b) => a - b),
    [allStudents],
  );

  const availableSecondary = useMemo<string[]>(() => {
    if (!config.secondaryFilter) return [];
    const src = selectedClass
      ? allStudents.filter((s) => s.class === selectedClass)
      : allStudents;
    const key = config.secondaryFilter;
    return [
      ...new Set(
        src.map((s) => s[key] as string | undefined).filter(Boolean) as string[],
      ),
    ];
  }, [allStudents, selectedClass, config.secondaryFilter]);

  const filteredStudents = useMemo(() => {
    let result = allStudents;
    if (config.secondaryFilter !== null) {
      if (selectedClass) result = result.filter((s) => s.class === selectedClass);
      if (selectedSecondary) {
        const key = config.secondaryFilter;
        result = result.filter((s) => s[key] === selectedSecondary);
      }
    }
    return result;
  }, [allStudents, selectedClass, selectedSecondary, config.secondaryFilter]);

  // Auto-populate from URL ?studentId=
  useEffect(() => {
    if (initialStudentApplied.current) return;
    const studentId = searchParams.get("studentId");
    if (studentId && allStudents.length > 0) {
      const student = allStudents.find((s) => s.id === studentId);
      if (student) {
        initialStudentApplied.current = true;
        if (config.secondaryFilter !== null) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- URL param auto-population
          setSelectedClass(student.class);
          setSelectedSecondary(
            config.secondaryFilter === "shift" ? student.shift : student.group,
          );
        } else {
          // MEC: pre-fill amount
          const lineItems = form.getFieldValue("lineItems") || [{}];
          if (lineItems.length > 0) {
            lineItems[0] = {
              ...lineItems[0],
              amount:
                (student.monthlyTuitionFee ?? 0) - (student.discountTuition ?? 0),
            };
            form.setFieldValue("lineItems", lineItems);
          }
        }
        setSelectedStudentId(studentId);
        form.setFieldsValue({ studentId });
      }
    }
  }, [searchParams, allStudents, form, config.secondaryFilter]);

  const selectedStudent = allStudents.find((s) => s.id === selectedStudentId);

  // Fetch invoice mode
  const { data: invoiceModeData } = useQuery({
    queryKey: [`${org}-settings`, "invoice_mode"],
    queryFn: () => settingsService.getSetting(org, "invoice_mode"),
  });
  const invoiceMode =
    (invoiceModeData as { settingValue?: string } | null)?.settingValue ?? "dual";

  // Fetch study materials (UAC + MBCS only)
  const { data: studyMaterialsData } = useQuery({
    queryKey: [`${org}-settings`, "study_materials"],
    queryFn: () => settingsService.getSetting(org, "study_materials"),
    enabled: config.hasPaymentTypes,
  });
  const studyMaterials: Array<{ name: string; price: number }> =
    (
      studyMaterialsData as {
        settingValue?: { items: Array<{ name: string; price: number }> };
      } | null
    )?.settingValue?.items ?? [];

  // Fetch late fee (MBCS only)
  const { data: lateFeeData } = useQuery({
    queryKey: [`${org}-settings`, "late_fee_amount"],
    queryFn: () => settingsService.getSetting(org, "late_fee_amount"),
    enabled: config.hasLateFeeAutoFill,
  });
  const lateFeeAmount: number =
    (lateFeeData as { settingValue?: { value?: number } } | null)?.settingValue
      ?.value ?? 0;

  // Fetch enabled payment methods
  const { data: pmSetting } = useQuery({
    queryKey: [`${org}-settings`, "payment_methods"],
    queryFn: () => settingsService.getSetting(org, "payment_methods"),
  });
  const enabledPaymentMethods = (() => {
    const vals = (pmSetting?.settingValue as { values?: string[] } | null)?.values;
    return Array.isArray(vals) && vals.length > 0
      ? ALL_PAYMENT_METHODS.filter((m) => vals.includes(m.value))
      : ALL_PAYMENT_METHODS;
  })();

  // Live form watchers
  const formLineItems = Form.useWatch("lineItems", form);
  const additionalDiscountValue = (Form.useWatch("additionalDiscount", form) as number | undefined) ?? 0;
  const dueAmountValue = Form.useWatch("dueAmount", form) ?? 0;

  // Guardian subtotal: uses student profile fees for typed orgs, monthlyTuitionFee for MEC
  const guardianSubTotal = useMemo(() => {
    if (!Array.isArray(formLineItems)) return 0;
    return (formLineItems as PaymentFormLineItem[]).reduce(
      (sum: number, item: PaymentFormLineItem | undefined) => {
        if (!item) return sum;
        if (!config.hasPaymentTypes) {
          // MEC: all items are tuition
          if (invoiceMode === "unified")
            return sum + (item.amount ?? 0);
          return sum + (selectedStudent?.monthlyTuitionFee ?? item.amount ?? 0);
        }
        // UAC/MBCS
        if (invoiceMode === "unified" && org !== "uac")
          return sum + (item.amount ?? 0);
        if (item.paymentType === "tuition")
          return sum + (selectedStudent?.monthlyTuitionFee ?? item.amount ?? 0);
        if (item.paymentType === "admission")
          return sum + (selectedStudent?.admissionFee ?? item.amount ?? 0);
        if (item.paymentType === "readmission")
          return sum + (selectedStudent?.readmissionFee ?? item.amount ?? 0);
        return sum + (item.amount ?? 0);
      },
      0,
    );
  }, [formLineItems, selectedStudent, invoiceMode, config.hasPaymentTypes, org]);

  const officeSubTotal = useMemo(() => {
    if (!Array.isArray(formLineItems)) return 0;
    return (formLineItems as PaymentFormLineItem[]).reduce(
      (sum: number, item: PaymentFormLineItem | undefined) =>
        sum + (item?.amount ?? 0),
      0,
    );
  }, [formLineItems]);

  const guardianGrandTotal = guardianSubTotal - additionalDiscountValue;
  const officeGrandTotal = officeSubTotal - additionalDiscountValue;
  const guardianPaid = guardianGrandTotal - dueAmountValue;
  const officePaid = officeGrandTotal - dueAmountValue;

  // Auto-fill amount on payment type change
  const onLineItemTypeChange = (type: string, fieldIndex: number) => {
    if (!selectedStudent) return;
    const lineItems: PaymentFormLineItem[] =
      form.getFieldValue("lineItems") || [];
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
    } else if (type === "late_fee" && config.hasLateFeeAutoFill && lateFeeAmount > 0) {
      amount = lateFeeAmount;
    }
    if (amount !== undefined) {
      lineItems[fieldIndex] = { ...lineItems[fieldIndex], amount };
      form.setFieldValue("lineItems", lineItems);
    }
  };

  // MEC: auto-fill first line item on student select
  const handleMecStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
    const student = allStudents.find((s) => s.id === studentId);
    if (student) {
      const lineItems = form.getFieldValue("lineItems") || [{}];
      if (lineItems.length > 0) {
        lineItems[0] = {
          ...lineItems[0],
          amount:
            (student.monthlyTuitionFee ?? 0) - (student.discountTuition ?? 0),
        };
        form.setFieldValue("lineItems", lineItems);
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateMultiPaymentDto) =>
      paymentsService.createMulti(org, data),
    onSuccess: (response) => {
      const invoice = response?.data?.invoiceNumber;
      setInvoiceNumber(invoice || "");
      message.success(`Payment recorded! Invoice: ${invoice}`);
      queryClient.invalidateQueries({ queryKey: [org, "payments"] });
      queryClient.invalidateQueries({ queryKey: [org, "payment-history"] });
      if (org === "mec") {
        queryClient.invalidateQueries({ queryKey: [org, "students"] });
      }
      form.resetFields();
      form.setFieldsValue({
        lineItems: [{}],
        paymentDate: dayjs(),
        additionalDiscount: 0,
        dueAmount: 0,
      });
      setSelectedStudentId(undefined);
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        message.error(
          err.response.data?.message || "Duplicate payment detected",
        );
      } else {
        message.error("Failed to record payment");
      }
    },
  });

  const onFinish = (values: PaymentFormValues) => {
    const paymentDate = values.paymentDate
      ? values.paymentDate.toISOString()
      : new Date().toISOString();

    const allItems = values.lineItems || [];

    let validItems: (PaymentFormLineItem & { amount: number })[];
    if (config.hasPaymentTypes) {
      validItems = allItems.filter(
        (
          item,
        ): item is PaymentFormLineItem & {
          paymentType: string;
          amount: number;
        } =>
          Boolean(item?.paymentType) && typeof item?.amount === "number",
      );
    } else {
      validItems = allItems.filter(
        (item): item is PaymentFormLineItem & { amount: number } =>
          typeof item?.amount === "number",
      );
    }

    const removedCount = allItems.length - validItems.length;
    if (removedCount > 0) {
      message.warning(
        `${removedCount} empty line item${removedCount > 1 ? "s" : ""} removed before submission.`,
      );
    }
    if (validItems.length === 0) {
      message.error("Please fill in at least one payment line item.");
      return;
    }

    const lineItems: CreateMultiPaymentDto["lineItems"] = validItems.map(
      (item) => ({
        paymentType: item.paymentType,
        amount: item.amount,
        paymentMonth:
          config.hasPaymentTypes && item.paymentType === "tuition" && item.paymentMonth
            ? item.paymentMonth.startOf("month").toISOString()
            : item.paymentMonth
              ? item.paymentMonth.startOf("month").toISOString()
              : values.paymentDate
                ? values.paymentDate.startOf("month").toISOString()
                : new Date(
                    new Date().getFullYear(),
                    new Date().getMonth(),
                    1,
                  ).toISOString(),
        notes: item.notes,
      }),
    );

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

  const guardianSummaryItems = Array.isArray(formLineItems)
    ? (formLineItems as PaymentFormLineItem[]).filter((item) =>
        config.hasPaymentTypes ? Boolean(item?.paymentType) : Boolean(item),
      )
    : [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>{config.title}</h2>

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
                  navigate(`/${org}/payments/invoice/${invoiceNumber}`)
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
        initialValues={{
          lineItems: [{}],
          paymentDate: dayjs(),
          additionalDiscount: 0,
          dueAmount: 0,
        }}
      >
        {/* Student Selection */}
        <Card
          title={config.secondaryFilter !== null ? "Student Information" : "Student Selection"}
          style={{ marginBottom: 16 }}
        >
          {config.secondaryFilter !== null ? (
            <>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Filter by Class">
                    <Select
                      placeholder="All Classes"
                      value={selectedClass}
                      onChange={(value) => {
                        setSelectedClass(value);
                        setSelectedSecondary(undefined);
                        form.setFieldValue("studentId", undefined);
                      }}
                      allowClear
                    >
                      {availableClasses.map((cls) => (
                        <Option key={cls} value={cls}>
                          {config.classLabel(cls)}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={`Filter by ${config.secondaryFilterLabel}`}>
                    <Select
                      placeholder={`All ${config.secondaryFilterLabel}s`}
                      value={selectedSecondary}
                      onChange={(value) => {
                        setSelectedSecondary(value);
                        form.setFieldValue("studentId", undefined);
                      }}
                      allowClear
                      disabled={availableSecondary.length === 0}
                    >
                      {availableSecondary.map((v) => (
                        <Option key={v} value={v}>
                          {v.charAt(0).toUpperCase() + v.slice(1)}
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
                    label: config.studentLabel(student),
                  }))}
                  filterOption={(input, option) =>
                    ((option?.label as string) || "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  onChange={(value) => setSelectedStudentId(value)}
                />
              </Form.Item>
            </>
          ) : (
            // MEC: simple student search
            <Form.Item
              label="Select Student"
              name="studentId"
              rules={[{ required: true, message: "Please select a student" }]}
            >
              <Select
                showSearch
                placeholder="Search by name..."
                optionFilterProp="label"
                onChange={handleMecStudentChange}
                style={{ width: "100%" }}
                options={allStudents.map((s) => ({
                  value: s.id,
                  label: config.studentLabel(s),
                }))}
              />
            </Form.Item>
          )}
          {selectedStudent && (
            <Text type="secondary">
              Monthly Tuition:{" "}
              <strong>৳{selectedStudent.monthlyTuitionFee}</strong>
            </Text>
          )}
        </Card>

        {/* Payment Settings */}
        <Card title="Payment Settings" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Payment Method"
                name="paymentMethod"
                rules={[{ required: true, message: "Please select payment method" }]}
              >
                <Select placeholder="Select payment method">
                  {enabledPaymentMethods.map((m) => (
                    <Option key={m.value} value={m.value}>
                      {m.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Payment Date"
                name="paymentDate"
                rules={[{ required: true, message: "Please select payment date" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Line Items */}
        <Card title={config.lineItemCardTitle} style={{ marginBottom: 16 }}>
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

                      {config.hasPaymentTypes ? (
                        <>
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
                                {config.paymentTypes.map((pt) => (
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
                              if (
                                type === "study_materials" &&
                                studyMaterials.length > 0
                              ) {
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
                                            const items: PaymentFormLineItem[] =
                                              form.getFieldValue("lineItems") ||
                                              [];
                                            items[index] = {
                                              ...items[index],
                                              amount: mat.price,
                                              notes: mat.name,
                                            };
                                            form.setFieldValue(
                                              "lineItems",
                                              items,
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
                        </>
                      ) : (
                        // MEC: always show month picker
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
                      )}

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
                  {config.addLineLabel}
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
              {guardianSummaryItems.map((item: PaymentFormLineItem, i: number) => {
                if (!item) return null;
                let label: string;
                let guardianAmt: number;
                if (config.hasPaymentTypes) {
                  if (!item.paymentType) return null;
                  label = item.paymentType
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c: string) => c.toUpperCase());
                  guardianAmt = item.amount ?? 0;
                  if (invoiceMode !== "unified" || org === "uac") {
                    if (item.paymentType === "tuition")
                      guardianAmt = selectedStudent?.monthlyTuitionFee ?? guardianAmt;
                    else if (item.paymentType === "admission")
                      guardianAmt = selectedStudent?.admissionFee ?? guardianAmt;
                    else if (item.paymentType === "readmission")
                      guardianAmt = selectedStudent?.readmissionFee ?? guardianAmt;
                  }
                } else {
                  label = `Month ${i + 1}`;
                  guardianAmt =
                    invoiceMode !== "unified"
                      ? (selectedStudent?.monthlyTuitionFee ?? item.amount ?? 0)
                      : (item.amount ?? 0);
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
              })}
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
                          {guardianSummaryItems.map(
                            (item: PaymentFormLineItem, i: number) => {
                              if (!item) return null;
                              const label = config.hasPaymentTypes
                                ? (item.paymentType ?? "")
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (c: string) =>
                                      c.toUpperCase(),
                                    )
                                : `Month ${i + 1}`;
                              return (
                                <Row
                                  key={i}
                                  justify="space-between"
                                  style={{ marginBottom: 4, fontSize: 13 }}
                                >
                                  <Col>
                                    <Text type="secondary">{label}</Text>
                                  </Col>
                                  <Col>৳{(item.amount ?? 0).toFixed(2)}</Col>
                                </Row>
                              );
                            },
                          )}
                          {additionalDiscountValue > 0 && (
                            <Row
                              justify="space-between"
                              style={{ marginBottom: 4 }}
                            >
                              <Col>Additional Discount</Col>
                              <Col style={{ color: "#ff4d4f" }}>
                                -৳{additionalDiscountValue.toFixed(2)}
                              </Col>
                            </Row>
                          )}
                          <Row
                            justify="space-between"
                            style={{ marginBottom: 8, marginTop: 4 }}
                          >
                            <Col>Sub Total</Col>
                            <Col>৳{officeSubTotal.toFixed(2)}</Col>
                          </Row>
                          <Row
                            justify="space-between"
                            style={{ marginBottom: 8 }}
                          >
                            <Col>
                              <strong>Grand Total</strong>
                            </Col>
                            <Col>
                              <strong>৳{officeGrandTotal.toFixed(2)}</strong>
                            </Col>
                          </Row>
                          <Row
                            justify="space-between"
                            style={{ marginBottom: 8 }}
                          >
                            <Col>
                              <Text type="danger">Due</Text>
                            </Col>
                            <Col>
                              <Text type="danger">
                                ৳{dueAmountValue.toFixed(2)}
                              </Text>
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
                        </>
                      ),
                    },
                  ]}
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
            disabled={!config.hasPaymentTypes && !selectedStudentId}
          >
            Record Payment
          </Button>
          <Button
            size="large"
            onClick={() => navigate(`/${org}/${config.backPath}`)}
          >
            Cancel
          </Button>
        </Space>
      </Form>
    </div>
  );
}
