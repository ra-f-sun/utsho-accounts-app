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
} from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { expensesService } from "../../services/expensesService";
import type { CreateExpenseDto } from "../../services/expensesService";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

export default function AddExpense() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateExpenseDto) => expensesService.create(data),
    onSuccess: () => {
      message.success("Expense added successfully");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      navigate("/expenses");
    },
    onError: () => {
      message.error("Failed to add expense");
    },
  });

  const onFinish = (values: any) => {
    const data: CreateExpenseDto = {
      ...values,
      date: values.date.format("YYYY-MM-DD"),
    };
    createMutation.mutate(data);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2>Add New Expense</h2>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          date: dayjs(),
        }}
      >
        <Card title="Expense Details">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Expense Type"
                name="expenseType"
                rules={[
                  { required: true, message: "Please enter expense type" },
                ]}
              >
                <Input placeholder="e.g., Utilities, Salaries, Supplies" />
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
                label="Date"
                name="date"
                rules={[{ required: true, message: "Please select date" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Description" name="description">
                <TextArea
                  rows={3}
                  placeholder="Additional details (optional)"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Form.Item style={{ marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending}
            size="large"
          >
            Add Expense
          </Button>
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => navigate("/expenses")}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
