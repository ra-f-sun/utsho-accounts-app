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
import {
  mbcsPaymentsService,
  MBCS_PAYMENT_TYPES,
} from "../../../services/mbcsPaymentsService";
import type { CreateMbcsPaymentDto } from "../../../services/mbcsPaymentsService";
import { mbcsStudentsService } from "../../../services/mbcsStudentsService";
import type { MbcsStudent } from "../../../services/mbcsStudentsService";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

export default function MbcsRecordPayment() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [lastPaymentId, setLastPaymentId] = useState<string>("");

  // Cascading filter state
  const [selectedClass, setSelectedClass] = useState<number | undefined>();
  const [selectedShift, setSelectedShift] = useState<string | undefined>();
  const [selectedStudentId, setSelectedStudentId] = useState<
    string | undefined
  >();

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ["mbcs-students"],
    queryFn: () => mbcsStudentsService.getAll(),
  });

  const allStudents: MbcsStudent[] = (studentsData as any)?.data || [];

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
    const studentId = searchParams.get("studentId");
    if (studentId && allStudents.length > 0) {
      const student = allStudents.find((s) => s.id === studentId);
      if (student) {
        setSelectedClass(student.class);
        setSelectedShift(student.shift);
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
    mutationFn: (data: CreateMbcsPaymentDto) =>
      mbcsPaymentsService.create(data),
    onSuccess: (response) => {
      const invoice = (response as any)?.data?.invoiceNumber;
      const paymentId = (response as any)?.data?.id;
      setInvoiceNumber(invoice || "");
      setLastPaymentId(paymentId || "");
      message.success(`Payment recorded! Invoice: ${invoice}`);
      queryClient.invalidateQueries({ queryKey: ["mbcs-payments"] });
      queryClient.invalidateQueries({ queryKey: ["mbcs-payment-history"] });
      form.resetFields();
    },
    onError: () => message.error("Failed to record payment"),
  });

  const onFinish = (values: any) => {
    const data: CreateMbcsPaymentDto = {
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
      <h2>Record Payment (MBCS)</h2>

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
                    navigate(`/mbcs/payments/${lastPaymentId}/invoice`)
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
                      Class {cls}
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
                label: `${student.name} - Class ${student.class}${student.shift ? ` (${student.shift})` : ""} · ${student.contactNumber}`,
              }))}
              filterOption={(input, option) =>
                ((option?.label as string) || "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onChange={(value) => {
                setSelectedStudentId(value);
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
                  {MBCS_PAYMENT_TYPES.map((pt) => (
                    <Option key={pt.value} value={pt.value}>
                      {pt.label}
                    </Option>
                  ))}
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
            onClick={() => navigate("/mbcs/payments")}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
