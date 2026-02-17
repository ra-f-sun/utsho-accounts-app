import { useState } from "react";
import {
  Form,
  Select,
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
import { useNavigate } from "react-router-dom";
import { payrollService } from "../../../services/payrollService";
import type { CreatePayrollDto } from "../../../services/payrollService";
import { teachersService } from "../../../services/teachersService";
import { staffService } from "../../../services/staffService";

const { Option } = Select;

export default function CreatePayroll() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentType, setPaymentType] = useState<"teacher" | "staff">(
    "teacher",
  );
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [calculatedData, setCalculatedData] = useState<any>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");

  // Fetch teachers
  const { data: teachersData } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => teachersService.getAll(),
  });

  // Fetch staff
  const { data: staffData } = useQuery({
    queryKey: ["staff"],
    queryFn: () => staffService.getAll(),
  });

  const teachers = teachersData?.data.data || [];
  const staff = staffData?.data.data || [];

  // Calculate payroll mutation
  const calculateMutation = useMutation({
    mutationFn: ({
      teacherId,
      month,
      year,
    }: {
      teacherId: string;
      month: string;
      year: number;
    }) => payrollService.calculateTeacherPayroll(teacherId, month, year),
    onSuccess: (response) => {
      setCalculatedData(response.data.data);
      form.setFieldsValue({
        amount: response.data.data.amount,
        lectureCount: response.data.data.lectureCount,
      });
      message.success("Payroll calculated successfully");
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || "Failed to calculate payroll",
      );
    },
  });

  // Create payroll mutation
  const createMutation = useMutation({
    mutationFn: (data: CreatePayrollDto) => payrollService.create(data),
    onSuccess: (response) => {
      const invoice = response.data.data.invoiceNumber;
      setInvoiceNumber(invoice);
      message.success(`Payroll created! Invoice: ${invoice}`);
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      form.resetFields();
      setCalculatedData(null);
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || "Failed to create payroll",
      );
    },
  });

  const handleCalculate = () => {
    if (
      paymentType === "teacher" &&
      selectedTeacher &&
      selectedMonth &&
      selectedYear
    ) {
      calculateMutation.mutate({
        teacherId: selectedTeacher,
        month: selectedMonth,
        year: selectedYear,
      });
    }
  };

  const onFinish = (values: any) => {
    const data: CreatePayrollDto = {
      ...values,
      amount: calculatedData?.amount || values.amount,
      lectureCount: calculatedData?.lectureCount,
    };
    createMutation.mutate(data);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>Create Payroll</h2>

      {invoiceNumber && (
        <Alert
          message="Payroll Created Successfully!"
          description={`Invoice Number: ${invoiceNumber}`}
          type="success"
          showIcon
          closable
          onClose={() => setInvoiceNumber("")}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* Payment Type Selection */}
        <Card title="Payroll Type" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Payment Type"
                name="paymentType"
                rules={[
                  { required: true, message: "Please select payment type" },
                ]}
              >
                <Select
                  placeholder="Select payment type"
                  onChange={(value) => {
                    setPaymentType(value);
                    setCalculatedData(null);
                    form.resetFields([
                      "teacherId",
                      "staffId",
                      "amount",
                      "lectureCount",
                    ]);
                  }}
                >
                  <Option value="teacher">Teacher Payroll</Option>
                  <Option value="staff">Staff Payroll</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Person Selection */}
        <Card title="Select Person" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            {paymentType === "teacher" ? (
              <Col span={24}>
                <Form.Item
                  label="Select Teacher"
                  name="teacherId"
                  rules={[
                    { required: true, message: "Please select a teacher" },
                  ]}
                >
                  <Select
                    placeholder="Search and select teacher"
                    showSearch
                    onChange={(value) => {
                      setSelectedTeacher(value);
                      setCalculatedData(null);
                    }}
                    options={teachers.map((teacher) => ({
                      value: teacher.id,
                      label: `${teacher.name} - ${teacher.paymentType === "fixed" ? "Fixed Salary" : "Lecture Based"}`,
                    }))}
                    filterOption={(input, option) =>
                      ((option?.label as string) || "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Col>
            ) : (
              <Col span={24}>
                <Form.Item
                  label="Select Staff"
                  name="staffId"
                  rules={[{ required: true, message: "Please select staff" }]}
                >
                  <Select
                    placeholder="Search and select staff"
                    showSearch
                    options={staff.map((s) => ({
                      value: s.id,
                      label: `${s.name} - ${s.designation}`,
                    }))}
                    filterOption={(input, option) =>
                      ((option?.label as string) || "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Card>

        {/* Month/Year Selection */}
        <Card title="Period" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Month"
                name="month"
                rules={[{ required: true, message: "Please select month" }]}
              >
                <DatePicker
                  picker="month"
                  style={{ width: "100%" }}
                  format="MMMM YYYY"
                  onChange={(date) => {
                    if (date) {
                      setSelectedMonth(date.format("MMMM"));
                      setSelectedYear(date.year());
                      form.setFieldsValue({
                        year: date.year(),
                      });
                      setCalculatedData(null);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Year" name="year">
                <Select disabled placeholder="Auto-filled">
                  <Option value={selectedYear}>{selectedYear}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {paymentType === "teacher" && selectedTeacher && selectedMonth && (
            <Button
              type="dashed"
              onClick={handleCalculate}
              loading={calculateMutation.isPending}
              block
            >
              Calculate Payroll from Attendance
            </Button>
          )}
        </Card>

        {/* Calculated Data Display */}
        {calculatedData && (
          <Card
            title="Calculated Payroll"
            style={{ marginBottom: 16, backgroundColor: "#f0f9ff" }}
          >
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Teacher">
                {calculatedData.teacher.name}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Type">
                {calculatedData.teacher.paymentType === "fixed"
                  ? "Fixed Salary"
                  : "Lecture Based"}
              </Descriptions.Item>
              {calculatedData.lectureCount && (
                <Descriptions.Item label="Total Lectures">
                  {calculatedData.lectureCount}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Amount">
                <strong style={{ color: "#1565c0", fontSize: 18 }}>
                  ৳{calculatedData.amount.toLocaleString()}
                </strong>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* Action Buttons */}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMutation.isPending}
            size="large"
            disabled={!calculatedData && paymentType === "teacher"}
          >
            Create Payroll
          </Button>
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => navigate("/uac/payroll")}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
