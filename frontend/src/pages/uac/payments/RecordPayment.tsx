import { useState } from "react";
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
import { useNavigate } from "react-router-dom";
import { paymentsService } from "../../../services/paymentsService";
import type { CreatePaymentDto } from "../../../services/paymentsService";
import { studentsService } from "../../../services/studentsService";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

interface RecordPaymentFormValues {
  studentId: string;
  paymentType: string;
  amount: number;
  paymentMethod: string;
  paymentMonth?: ReturnType<typeof dayjs>;
  paymentDate: ReturnType<typeof dayjs>;
  notes?: string;
}

export default function RecordPayment() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");

  // Fetch all students for selector
  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsService.getAll(),
  });

  const students = studentsData?.data.data || [];

  const createMutation = useMutation({
    mutationFn: (data: CreatePaymentDto) => paymentsService.create(data),
    onSuccess: (response) => {
      const invoice = response.data.data.invoiceNumber;
      setInvoiceNumber(invoice);
      message.success(`Payment recorded! Invoice: ${invoice}`);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      form.resetFields();
    },
    onError: () => {
      message.error("Failed to record payment");
    },
  });

  const onFinish = (values: RecordPaymentFormValues) => {
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
          description={`Invoice Number: ${invoiceNumber}`}
          type="success"
          showIcon
          closable
          onClose={() => setInvoiceNumber("")}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* Student Selection */}
        <Card title="Student Information" style={{ marginBottom: 16 }}>
          <Form.Item
            label="Select Student"
            name="studentId"
            rules={[{ required: true, message: "Please select a student" }]}
          >
            <Select
              placeholder="Search and select student"
              showSearch
              options={students.map((student) => ({
                value: student.id,
                label: `${student.name} - Class ${student.class} (${student.contactNumber})`,
              }))}
              filterOption={(input, option) =>
                ((option?.label as string) || "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
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
                <Select placeholder="Select payment type">
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
