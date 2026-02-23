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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { expensesService } from "../../services/expensesService";
import type { CreateExpenseDto, Expense, ExpenseType, Organization, PaymentMethod } from "../../services/expensesService";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect } from "react";

interface FormValues {
  expenseType: ExpenseType;
  amount: number;
  expenseMonth: Dayjs;
  paymentDate: Dayjs;
  paymentMethod: PaymentMethod;
  notes?: string;
}

const { Option } = Select;
const { TextArea } = Input;

interface Props {
  org: Organization;
  basePath: string; // e.g. "/uac/expenses"
  title: string;
}

export default function OrgAddExpense({ org, basePath, title }: Props) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  // Fetch existing expense for edit mode
  const { data: existingData } = useQuery({
    queryKey: ["expenses", org, id],
    queryFn: () => expensesService.getOne(org, id!),
    enabled: isEdit,
  });

  const existingObj: Expense | undefined = existingData?.data;

  useEffect(() => {
    if (isEdit && existingObj) {
      form.setFieldsValue({
        expenseType: existingObj.expenseType,
        amount: existingObj.amount,
        expenseMonth: existingObj.expenseMonth
          ? dayjs(existingObj.expenseMonth)
          : undefined,
        paymentDate: existingObj.paymentDate
          ? dayjs(existingObj.paymentDate)
          : undefined,
        paymentMethod: existingObj.paymentMethod,
        notes: existingObj.notes,
      });
    }
  }, [isEdit, existingObj, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateExpenseDto) => expensesService.create(org, data),
    onSuccess: () => {
      message.success("Expense added successfully");
      queryClient.invalidateQueries({ queryKey: ["expenses", org] });
      navigate(basePath);
    },
    onError: () => {
      message.error("Failed to add expense");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateExpenseDto>) =>
      expensesService.update(org, id!, data),
    onSuccess: () => {
      message.success("Expense updated successfully");
      queryClient.invalidateQueries({ queryKey: ["expenses", org] });
      navigate(basePath);
    },
    onError: () => {
      message.error("Failed to update expense");
    },
  });

  const onFinish = (values: FormValues) => {
    const data: CreateExpenseDto = {
      expenseType: values.expenseType,
      amount: values.amount,
      expenseMonth: values.expenseMonth.format("YYYY-MM-01"),
      paymentDate: values.paymentDate.format("YYYY-MM-DD"),
      paymentMethod: values.paymentMethod,
      notes: values.notes || undefined,
    };
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2>{isEdit ? `Edit Expense — ${title}` : `Add Expense — ${title}`}</h2>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          paymentDate: dayjs(),
          expenseMonth: dayjs(),
        }}
      >
        <Card title="Expense Details">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Expense Type"
                name="expenseType"
                rules={[
                  { required: true, message: "Please select expense type" },
                ]}
              >
                <Select placeholder="Select expense type">
                  <Option value="rent">Rent</Option>
                  <Option value="electricity">Electricity</Option>
                  <Option value="water">Water</Option>
                  <Option value="internet">Internet</Option>
                  <Option value="salary">Salary</Option>
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
                label="Expense Month"
                name="expenseMonth"
                rules={[
                  { required: true, message: "Please select expense month" },
                ]}
              >
                <DatePicker
                  picker="month"
                  style={{ width: "100%" }}
                  format="MMM YYYY"
                />
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
            <Col span={24}>
              <Form.Item label="Notes" name="notes">
                <TextArea rows={3} placeholder="Additional details (optional)" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Form.Item style={{ marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={isPending}
            size="large"
          >
            {isEdit ? "Update Expense" : "Add Expense"}
          </Button>
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => navigate(basePath)}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
