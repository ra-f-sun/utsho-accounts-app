import { useState, useEffect } from "react";
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
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { mbcsTeachersService } from "../../../services/mbcsTeachersService";
import type { CreateMbcsTeacherDto } from "../../../services/mbcsTeachersService";

const { Option } = Select;

export default function AddMbcsTeacher() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const [paymentType, setPaymentType] = useState<"fixed" | "lecture_based">(
    "fixed",
  );

  // Fetch existing teacher for edit
  const { data: existingData } = useQuery({
    queryKey: ["mbcs-teacher", id],
    queryFn: () => mbcsTeachersService.getOne(id!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingData) {
      const teacher = existingData?.data;
      if (teacher) {
        form.setFieldsValue(teacher);
        setPaymentType(teacher.paymentType || "fixed");
      }
    }
  }, [existingData, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateMbcsTeacherDto) =>
      mbcsTeachersService.create(data),
    onSuccess: () => {
      message.success("Teacher added successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-teachers"] });
      navigate("/mbcs/teachers");
    },
    onError: () => message.error("Failed to add teacher"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateMbcsTeacherDto>) =>
      mbcsTeachersService.update(id!, data),
    onSuccess: () => {
      message.success("Teacher updated successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-teachers"] });
      navigate("/mbcs/teachers");
    },
    onError: () => message.error("Failed to update teacher"),
  });

  const onFinish = (values: CreateMbcsTeacherDto) => {
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2>{isEditMode ? "Edit Teacher" : "Add New Teacher"} (MBCS)</h2>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Card title="Basic Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Full Name"
                name="name"
                rules={[
                  { required: true, message: "Please enter teacher name" },
                ]}
              >
                <Input placeholder="Enter full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Contact Number"
                name="contactNumber"
                rules={[
                  { required: true, message: "Please enter contact number" },
                  {
                    pattern: /^(\+880)?1[3-9]\d{8}$/,
                    message: "Invalid Bangladesh mobile number",
                  },
                ]}
              >
                <Input placeholder="+8801XXXXXXXXX" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Payment Information" style={{ marginBottom: 16 }}>
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
                  onChange={(value) => setPaymentType(value)}
                >
                  <Option value="fixed">Fixed Monthly Salary</Option>
                  <Option value="lecture_based">Lecture Based</Option>
                </Select>
              </Form.Item>
            </Col>

            {paymentType === "fixed" && (
              <Col span={24}>
                <Form.Item
                  label="Monthly Salary (৳)"
                  name="monthlySalary"
                  rules={[
                    { required: true, message: "Please enter monthly salary" },
                  ]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    placeholder="Enter monthly salary"
                  />
                </Form.Item>
              </Col>
            )}

            {paymentType === "lecture_based" && (
              <Col span={24}>
                <Form.Item
                  label="Per Lecture Rate (৳)"
                  name="perLectureRate"
                  rules={[
                    {
                      required: true,
                      message: "Please enter per lecture rate",
                    },
                  ]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    placeholder="Enter per lecture rate"
                  />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Card>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={isPending}
            size="large"
          >
            {isEditMode ? "Update Teacher" : "Add Teacher"}
          </Button>
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => navigate("/mbcs/teachers")}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
