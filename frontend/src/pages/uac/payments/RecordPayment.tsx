import { useState, useEffect, useMemo } from "react";
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
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

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

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsService.getAll(undefined, 1, 1000),
  });

  const allStudents: Student[] = studentsData?.data?.data || [];

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
    const studentId = searchParams.get("studentId");
    if (studentId && allStudents.length > 0) {
      const student = allStudents.find((s) => s.id === studentId);
      if (student) {
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

  // Auto-fill amount on type change — discount-aware
  const onLineItemTypeChange = (type: string, fieldIndex: number) => {
    if (!selectedStudent) return;
    const lineItems: any[] = form.getFieldValue("lineItems") || [];
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
      setSelectedStudentId(undefined);
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
        initialValues={{ lineItems: [{}], paymentDate: dayjs() }}
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
                                        const lineItems: any[] =
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
