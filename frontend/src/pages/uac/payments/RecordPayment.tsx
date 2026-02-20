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
  message,
  DatePicker,
  Alert,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EyeOutlined } from "@ant-design/icons";
import { paymentsService } from "../../../services/paymentsService";
import type { CreatePaymentDto } from "../../../services/paymentsService";
import { studentsService } from "../../../services/studentsService";
import type { Student } from "../../../services/studentsService";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

export default function RecordPayment() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [lastPaymentId, setLastPaymentId] = useState<string>("");

  // Cascading filter state
  const [selectedClass, setSelectedClass] = useState<number | undefined>();
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const [selectedStudentId, setSelectedStudentId] = useState<
    string | undefined
  >();

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsService.getAll(),
  });

  const allStudents: Student[] = (studentsData as any)?.data || [];

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

  // When payment type changes, auto-fill tuition amount
  const onPaymentTypeChange = (type: string) => {
    if (type === "tuition" && selectedStudent?.monthlyTuitionFee) {
      form.setFieldValue("amount", selectedStudent.monthlyTuitionFee);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: CreatePaymentDto) => paymentsService.create(data),
    onSuccess: (response) => {
      const invoice = (response as any)?.data?.invoiceNumber;
      const paymentId = (response as any)?.data?.id;
      setInvoiceNumber(invoice || "");
      setLastPaymentId(paymentId || "");
      message.success(`Payment recorded! Invoice: ${invoice}`);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["uac-payment-history"] });
      form.resetFields();
    },
    onError: () => {
      message.error("Failed to record payment");
    },
  });

  const onFinish = (values: any) => {
    const data: CreatePaymentDto = {
      studentId: values.studentId,
      paymentType: values.paymentType,
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      paymentMonth: values.paymentMonth
        ? values.paymentMonth.startOf("month").toISOString()
        : new Date().toISOString(),
      paymentDate: values.paymentDate
        ? values.paymentDate.toISOString()
        : new Date().toISOString(),
      notes: values.notes,
    };
    createMutation.mutate(data);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2>Record Payment</h2>

      {invoiceNumber && (
        <Alert
          message="Payment Recorded Successfully!"
          description={
            <div>
              <div>
                Invoice Number: <strong>{invoiceNumber}</strong>
              </div>
              {lastPaymentId && (
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() =>
                    navigate(`/uac/payments/${lastPaymentId}/invoice`)
                  }
                  style={{ padding: 0, marginTop: 4 }}
                >
                  View / Print Invoice
                </Button>
              )}
            </div>
          }
          type="success"
          showIcon
          closable
          onClose={() => {
            setInvoiceNumber("");
            setLastPaymentId("");
          }}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={onFinish}>
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
              onChange={(value) => {
                setSelectedStudentId(value);
                // If tuition is already selected, auto-fill the fee for new student
                const type = form.getFieldValue("paymentType");
                if (type === "tuition") {
                  const student = allStudents.find((s) => s.id === value);
                  if (student?.monthlyTuitionFee) {
                    form.setFieldValue("amount", student.monthlyTuitionFee);
                  }
                }
              }}
            />
          </Form.Item>
        </Card>

        {/* Payment Details */}
        <Card title="Payment Details" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Payment Type"
                name="paymentType"
                rules={[
                  { required: true, message: "Please select payment type" },
                ]}
              >
                <Select
                  placeholder="Select payment type"
                  onChange={onPaymentTypeChange}
                >
                  <Option value="tuition">Tuition Fee</Option>
                  <Option value="admission">Admission Fee</Option>
                  <Option value="readmission">Re-admission Fee</Option>
                  <Option value="exam">Exam Fee</Option>
                  <Option value="sheet">Sheet Fee</Option>
                  <Option value="session_charge">Session Charge</Option>
                  <Option value="study_materials">Study Materials</Option>
                  <Option value="study_tour">Study Tour</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Amount (৳)"
                name="amount"
                rules={[{ required: true, message: "Please enter amount" }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="Enter amount"
                />
              </Form.Item>
            </Col>
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
                label="Payment Month"
                name="paymentMonth"
                rules={[
                  { required: true, message: "Please select payment month" },
                ]}
              >
                <DatePicker
                  picker="month"
                  style={{ width: "100%" }}
                  format="MMMM YYYY"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Payment Date"
                name="paymentDate"
                initialValue={dayjs()}
                rules={[
                  { required: true, message: "Please select payment date" },
                ]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Notes" name="notes">
                <TextArea rows={3} placeholder="Additional notes (optional)" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending}
            size="large"
          >
            Record Payment
          </Button>
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => navigate("/uac/payments")}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
