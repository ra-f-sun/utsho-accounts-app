import { useState, useEffect, useRef } from "react";
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
  Descriptions,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { payrollService } from "../../../services/payrollService";
import type { CreatePayrollDto } from "../../../services/payrollService";
import { teachersService } from "../../../services/teachersService";
import type { Teacher } from "../../../services/teachersService";
import { staffService } from "../../../services/staffService";
import type { Staff } from "../../../services/staffService";
import axios from "axios";
import dayjs from "dayjs";

interface MbcsPayrollFormValues {
  payableType: "teacher" | "staff";
  teacherId?: string;
  staffId?: string;
  paymentMonthPicker?: ReturnType<typeof dayjs>;
  amount: number;
  paidAmount?: number;
  totalLectures?: number;
  paymentDate?: ReturnType<typeof dayjs>;
  paymentMethod: string;
  notes?: string;
}

const { Option } = Select;
const { TextArea } = Input;

export default function MbcsCreatePayroll() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [payableType, setPayableType] = useState<"teacher" | "staff">(
    "teacher",
  );
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [calculatedData, setCalculatedData] = useState<{
    paymentType?: string;
    totalLectures?: number;
    amount?: number;
  } | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [createdPayrollId, setCreatedPayrollId] = useState<string>("");

  // Watch amount to auto-set paidAmount
  const watchedAmount = Form.useWatch("amount", form);
  const watchedPaidAmount = Form.useWatch("paidAmount", form);
  const dueAmount = Math.max(0, (watchedAmount || 0) - (watchedPaidAmount ?? watchedAmount ?? 0));

  useEffect(() => {
    if (watchedAmount !== undefined && watchedAmount !== null) {
      form.setFieldValue("paidAmount", watchedAmount);
    }
  }, [watchedAmount, form]);

  const { data: teachersData } = useQuery({
    queryKey: ["mbcs", "teachers"],
    queryFn: () => teachersService.getAll("mbcs", undefined, 1, 1000),
  });

  const { data: staffData } = useQuery({
    queryKey: ["mbcs", "staff"],
    queryFn: () => staffService.getAll("mbcs", undefined, 1, 1000),
  });

  const teachers: Teacher[] = useMemo(() => teachersData?.data?.data || [], [teachersData]);
  const staff: Staff[] = useMemo(() => staffData?.data?.data || [], [staffData]);

  const initialTeacherApplied = useRef(false);

  // Auto-populate from URL params (e.g. navigating from teacher payroll history)
  useEffect(() => {
    if (initialTeacherApplied.current) return;
    const teacherId = searchParams.get("teacherId");
    if (teacherId && teachers.length > 0) {
      const teacher = teachers.find((t: Teacher) => t.id === teacherId);
      if (teacher) {
        initialTeacherApplied.current = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URL param auto-population
        setSelectedTeacher(teacher);
        form.setFieldsValue({ teacherId, payableType: "teacher" });
         
        setPayableType("teacher");
        if (teacher.paymentType === "fixed" && teacher.monthlySalary) {
          form.setFieldValue("amount", teacher.monthlySalary);
        }
      }
    }
  }, [teachers, searchParams, form]);

  // Calculate payroll from attendance
  const calculateMutation = useMutation({
    mutationFn: ({ teacherId, month }: { teacherId: string; month: string }) =>
      payrollService.calculateTeacherPayroll("mbcs", teacherId, month),
    onSuccess: (response) => {
      const calc = response?.data;
      setCalculatedData(calc);
      form.setFieldsValue({
        amount: calc?.amount,
        totalLectures: calc?.totalLectures,
      });
      message.success("Payroll calculated from attendance");
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error)) {
        message.error(error.response?.data?.message || "Failed to calculate payroll");
      } else {
        message.error("Failed to calculate payroll");
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePayrollDto) => payrollService.create("mbcs", data),
    onSuccess: (response) => {
      const created = response?.data;
      const invoice = created?.invoiceNumber;
      setCreatedPayrollId(created?.id || "");
      setInvoiceNumber(invoice);
      message.success(`Payroll created! Invoice: ${invoice}`);
      queryClient.invalidateQueries({ queryKey: ["mbcs", "payroll"] });
      setSelectedTeacher(null);
      form.resetFields();
      setCalculatedData(null);
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error)) {
        message.error(error.response?.data?.message || "Failed to create payroll");
      } else {
        message.error("Failed to create payroll");
      }
    },
  });

  const handleCalculate = () => {
    if (selectedTeacher?.id && selectedMonth) {
      calculateMutation.mutate({
        teacherId: selectedTeacher.id,
        month: selectedMonth,
      });
    }
  };

  const onFinish = (values: MbcsPayrollFormValues) => {
    const data: CreatePayrollDto = {
      payableType: values.payableType,
      payableId:
        values.payableType === "teacher" ? values.teacherId : values.staffId,
      paymentMonth: values.paymentMonthPicker
        ? values.paymentMonthPicker.startOf("month").toISOString()
        : new Date().toISOString(),
      amount: calculatedData?.amount ?? values.amount,
      paidAmount: values.paidAmount ?? (calculatedData?.amount ?? values.amount),
      totalLectures: calculatedData?.totalLectures,
      paymentDate: values.paymentDate
        ? values.paymentDate.toISOString()
        : new Date().toISOString(),
      paymentMethod: values.paymentMethod,
      notes: values.notes,
    };
    createMutation.mutate(data);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>Create Payroll (MBCS)</h2>

      {invoiceNumber && (
        <Alert
          message="Payroll Created Successfully!"
          description={
            <span>
              Invoice Number: <strong>{invoiceNumber}</strong>
              {createdPayrollId && (
                <Button
                  type="link"
                  size="small"
                  style={{ marginLeft: 12 }}
                  onClick={() =>
                    navigate(`/mbcs/payroll/${createdPayrollId}/invoice`)
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
            setCreatedPayrollId("");
          }}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* Payroll Type */}
        <Card title="Payroll Type" style={{ marginBottom: 16 }}>
          <Form.Item
            label="Payable Type"
            name="payableType"
            initialValue="teacher"
            rules={[{ required: true }]}
          >
            <Select
              onChange={(value) => {
                setPayableType(value);
                setCalculatedData(null);
                form.resetFields([
                  "teacherId",
                  "staffId",
                  "amount",
                  "totalLectures",
                ]);
              }}
            >
              <Option value="teacher">Teacher Payroll</Option>
              <Option value="staff">Staff Payroll</Option>
            </Select>
          </Form.Item>
        </Card>

        {/* Person Selection */}
        <Card title="Select Person" style={{ marginBottom: 16 }}>
          {payableType === "teacher" ? (
            <Form.Item
              label="Select Teacher"
              name="teacherId"
              rules={[{ required: true, message: "Please select a teacher" }]}
            >
              <Select
                placeholder="Search and select teacher"
                showSearch
                onChange={(value) => {
                  const teacher = teachers.find((t: Teacher) => t.id === value);
                  setSelectedTeacher(teacher || null);
                  setCalculatedData(null);
                  // Auto-fill salary for fixed-salary teachers
                  if (
                    teacher?.paymentType === "fixed" &&
                    teacher.monthlySalary
                  ) {
                    form.setFieldValue("amount", teacher.monthlySalary);
                  } else {
                    form.setFieldValue("amount", undefined);
                  }
                }}
                options={teachers.map((t: Teacher) => ({
                  value: t.id,
                  label: `${t.name} - ${t.paymentType === "fixed" ? "Fixed Salary" : "Lecture Based"}`,
                }))}
                filterOption={(input, option) =>
                  ((option?.label as string) || "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
          ) : (
            <Form.Item
              label="Select Staff"
              name="staffId"
              rules={[{ required: true, message: "Please select staff" }]}
            >
              <Select
                placeholder="Search and select staff"
                showSearch
                options={staff.map((s: Staff) => ({
                  value: s.id,
                  label: `${s.name}${s.designation ? ` - ${s.designation}` : ""}`,
                }))}
                filterOption={(input, option) =>
                  ((option?.label as string) || "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}
        </Card>

        {/* Period & Amount */}
        <Card title="Period & Payment" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Payment Month"
                name="paymentMonthPicker"
                rules={[
                  { required: true, message: "Please select payment month" },
                ]}
              >
                <DatePicker
                  picker="month"
                  style={{ width: "100%" }}
                  format="MMMM YYYY"
                  onChange={(date) => {
                    setSelectedMonth(date ? date.format("YYYY-MM") : "");
                    setCalculatedData(null);
                  }}
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
                <Select placeholder="Select method">
                  <Option value="cash">Cash</Option>
                  <Option value="bkash">bKash</Option>
                  <Option value="nagad">Nagad</Option>
                  <Option value="bank_transfer">Bank Transfer</Option>
                </Select>
              </Form.Item>
            </Col>
            {payableType === "teacher" &&
              selectedTeacher?.paymentType === "lecture_based" &&
              selectedTeacher?.id &&
              selectedMonth && (
                <Col span={24}>
                  <Button
                    type="dashed"
                    onClick={handleCalculate}
                    loading={calculateMutation.isPending}
                    block
                    style={{ marginBottom: 16 }}
                  >
                    Calculate from Attendance
                  </Button>
                </Col>
              )}
            <Col span={8}>
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
            <Col span={8}>
              <Form.Item
                label="Paid Amount (৳)"
                name="paidAmount"
              >
                <InputNumber
                  min={0}
                  max={watchedAmount || undefined}
                  style={{ width: "100%" }}
                  placeholder="Defaults to full amount"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Due Amount (৳)">
                <InputNumber
                  value={dueAmount}
                  disabled
                  style={{ width: "100%", color: dueAmount > 0 ? "#f5222d" : undefined }}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Notes" name="notes">
                <TextArea rows={2} placeholder="Additional notes (optional)" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Calculated Preview */}
        {calculatedData && (
          <Card
            title="Calculated Payroll"
            style={{ marginBottom: 16, backgroundColor: "#f0f9ff" }}
          >
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Payment Type">
                {calculatedData.paymentType === "fixed"
                  ? "Fixed Salary"
                  : "Lecture Based"}
              </Descriptions.Item>
              {calculatedData.totalLectures && (
                <Descriptions.Item label="Total Lectures">
                  {calculatedData.totalLectures}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Amount">
                <strong style={{ color: "#1565c0", fontSize: 18 }}>
                  ৳{calculatedData.amount?.toLocaleString()}
                </strong>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending}
            size="large"
            disabled={createMutation.isPending}
          >
            Create Payroll
          </Button>
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => navigate("/mbcs/payroll")}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
