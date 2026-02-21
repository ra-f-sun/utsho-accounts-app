import { useState, useEffect } from "react";
import {
  Form,
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
import { mecPaymentsService } from "../../../services/mecPaymentsService";
import type { CreateMecPaymentDto } from "../../../services/mecPaymentsService";
import { mecStudentsService } from "../../../services/mecStudentsService";
import type { MecStudent } from "../../../services/mecStudentsService";
import dayjs from "dayjs";
import { Space, Input } from "antd";

const { Option } = Select;
const { TextArea } = Input;

export default function MecRecordPayment() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [lastPaymentId, setLastPaymentId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<
    string | undefined
  >();

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ["mec-students"],
    queryFn: () => mecStudentsService.getAll(),
  });

  const allStudents: MecStudent[] = (studentsData as any)?.data || [];

  // Auto-populate from URL ?studentId=
  useEffect(() => {
    const studentId = searchParams.get("studentId");
    if (studentId && allStudents.length > 0) {
      const student = allStudents.find((s) => s.id === studentId);
      if (student) {
        setSelectedStudentId(studentId);
        form.setFieldsValue({
          studentId,
          amount: student.monthlyTuitionFee,
        });
      }
    }
  }, [searchParams, allStudents, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateMecPaymentDto) => mecPaymentsService.create(data),
    onSuccess: (response) => {
      const created = (response as any)?.data;
      const invoice = created?.invoiceNumber;
      setLastPaymentId(created?.id || "");
      setInvoiceNumber(invoice);
      message.success(`Payment recorded! Invoice: ${invoice}`);
      queryClient.invalidateQueries({ queryKey: ["mec-payment-history"] });
      queryClient.invalidateQueries({ queryKey: ["mec-payments"] });
      queryClient.invalidateQueries({ queryKey: ["mec-students"] });
      setSelectedStudentId(undefined);
      form.resetFields();
    },
    onError: () => message.error("Failed to record payment"),
  });

  const onFinish = (values: any) => {
    createMutation.mutate({
      ...values,
      paymentMonth: values.paymentMonth
        ? values.paymentMonth.startOf("month").toISOString()
        : new Date().toISOString(),
      paymentDate: values.paymentDate
        ? values.paymentDate.toISOString()
        : new Date().toISOString(),
    });
  };

  const handleStudentChange = (studentId: string) => {
    setSelectedStudentId(studentId);
    const student = allStudents.find((s) => s.id === studentId);
    if (student) {
      form.setFieldsValue({ amount: student.monthlyTuitionFee });
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2>Record Payment — MEC</h2>

      {invoiceNumber && (
        <Alert
          message="Payment Recorded Successfully!"
          description={
            <span>
              Invoice Number: <strong>{invoiceNumber}</strong>
              {lastPaymentId && (
                <Button
                  type="link"
                  size="small"
                  style={{ marginLeft: 12 }}
                  icon={<EyeOutlined />}
                  onClick={() =>
                    navigate(`/mec/payments/${lastPaymentId}/invoice`)
                  }
                >
                  View Invoice
                </Button>
              )}
            </span>
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
        </Card>

        <Card title="Payment Details" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Payment Month"
                name="paymentMonth"
                rules={[{ required: true }]}
              >
                <DatePicker
                  picker="month"
                  style={{ width: "100%" }}
                  format="MMMM YYYY"
                  disabledDate={(d) => d.isAfter(dayjs(), "month")}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Payment Date"
                name="paymentDate"
                initialValue={dayjs()}
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Amount (৳)"
                name="amount"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Payment Method"
                name="paymentMethod"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="cash">Cash</Option>
                  <Option value="bkash">bKash</Option>
                  <Option value="nagad">Nagad</Option>
                  <Option value="bank_transfer">Bank Transfer</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Notes (Optional)" name="notes">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
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
