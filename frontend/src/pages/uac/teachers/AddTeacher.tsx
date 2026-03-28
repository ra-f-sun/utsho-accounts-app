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
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { teachersService } from "../../../services/teachersService";
import type { CreateTeacherDto } from "../../../services/teachersService";
import { PERSON_NAME_MESSAGE, PERSON_NAME_REGEX } from "../../../utils/validators";

const { Option } = Select;
const { TextArea } = Input;

export default function AddTeacher() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const [paymentType, setPaymentType] = useState<"fixed" | "lecture_based">(
    "fixed",
  );
  const existingDataApplied = useRef(false);

  // Fetch existing teacher for edit
  const { data: existingData } = useQuery({
    queryKey: ["uac", "teacher", id],
    queryFn: () => teachersService.getOne("uac", id!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingDataApplied.current) return;
    if (existingData) {
      const teacher = existingData?.data;
      if (teacher) {
        existingDataApplied.current = true;
        form.setFieldsValue(teacher);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- edit form hydration
        setPaymentType(teacher.paymentType || "fixed");
      }
    }
  }, [existingData, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateTeacherDto) => teachersService.create("uac", data),
    onSuccess: () => {
      message.success("Teacher added successfully");
      queryClient.invalidateQueries({ queryKey: ["uac", "teachers"] });
      navigate("/uac/teachers");
    },
    onError: () => {
      message.error("Failed to add teacher");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateTeacherDto>) =>
      teachersService.update("uac", id!, data),
    onSuccess: () => {
      message.success("Teacher updated successfully");
      queryClient.invalidateQueries({ queryKey: ["uac", "teachers"] });
      navigate("/uac/teachers");
    },
    onError: () => {
      message.error("Failed to update teacher");
    },
  });

  const onFinish = (values: CreateTeacherDto) => {
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2>{isEditMode ? "Edit Teacher" : "Add New Teacher"}</h2>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* Basic Information */}
        <Card title="Basic Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Full Name"
                name="name"
                rules={[
                  { required: true, message: "Please enter teacher name" },
                  { pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE },
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
            <Col span={24}>
              <Form.Item label="Subjects" name="subjects">
                <TextArea
                  rows={2}
                  placeholder="e.g., Math, Physics, Chemistry (comma-separated)"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Payment Information */}
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
                    {
                      required: true,
                      message: "Please enter monthly salary",
                    },
                    {
                      type: "number",
                      min: 0,
                      message: "Monthly salary must be a valid number",
                    },
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
                    {
                      type: "number",
                      min: 0,
                      message: "Per lecture rate must be a valid number",
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
            onClick={() => navigate("/uac/teachers")}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
