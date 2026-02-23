import { useEffect } from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { studentsService } from "../../../services/studentsService";
import type { CreateStudentDto } from "../../../services/studentsService";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

export default function AddStudent() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  // Fetch existing student for edit
  const { data: existingData } = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentsService.getOne(id!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingData) {
      const student = existingData?.data;
      if (student) {
        form.setFieldsValue({
          ...student,
          dateOfBirth: student.dateOfBirth
            ? dayjs(student.dateOfBirth)
            : undefined,
          admissionDate: student.admissionDate
            ? dayjs(student.admissionDate)
            : undefined,
        });
      }
    }
  }, [existingData, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateStudentDto) => studentsService.create(data),
    onSuccess: () => {
      message.success("Student added successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      navigate("/uac/students");
    },
    onError: () => {
      message.error("Failed to add student");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateStudentDto>) =>
      studentsService.update(id!, data),
    onSuccess: () => {
      message.success("Student updated successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      navigate("/uac/students");
    },
    onError: () => {
      message.error("Failed to update student");
    },
  });

  const onFinish = (values: any) => {
    const data = {
      ...values,
      dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
      admissionDate: values.admissionDate?.format("YYYY-MM-DD"),
    };
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data as CreateStudentDto);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h2>{isEditMode ? "Edit Student" : "Add New Student"}</h2>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          nationality: "Bangladeshi",
          admissionDate: dayjs(),
        }}
      >
        {/* Basic Information */}
        <Card title="Basic Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Full Name"
                name="name"
                rules={[
                  { required: true, message: "Please enter student name" },
                ]}
              >
                <Input placeholder="Enter full name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Gender"
                name="gender"
                rules={[{ required: true, message: "Please select gender" }]}
              >
                <Select placeholder="Select gender">
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Date of Birth"
                name="dateOfBirth"
                rules={[
                  { required: true, message: "Please select date of birth" },
                ]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Academic Information */}
        <Card title="Academic Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                label="Class"
                name="class"
                rules={[{ required: true, message: "Please select class" }]}
              >
                <Select placeholder="Select class">
                  {[8, 9, 10, 11, 12].map((cls) => (
                    <Option key={cls} value={cls}>
                      Class {cls}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Group" name="group">
                <Select placeholder="Select group" allowClear>
                  <Option value="science">Science</Option>
                  <Option value="business">Business</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Section" name="section">
                <Input placeholder="e.g., A, B" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Serial No" name="serialNo">
                <Input placeholder="Institution roll" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="School" name="school">
                <Input placeholder="Which school attending" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Personal Details */}
        <Card title="Personal Details" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Nationality" name="nationality">
                <Input placeholder="Nationality" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Religion" name="religion">
                <Input placeholder="Religion" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Blood Group" name="bloodGroup">
                <Select placeholder="Select blood group" allowClear>
                  <Option value="A+">A+</Option>
                  <Option value="A-">A-</Option>
                  <Option value="B+">B+</Option>
                  <Option value="B-">B-</Option>
                  <Option value="O+">O+</Option>
                  <Option value="O-">O-</Option>
                  <Option value="AB+">AB+</Option>
                  <Option value="AB-">AB-</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Health Condition" name="healthCondition">
                <TextArea rows={2} placeholder="Any health notes" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Present Address" name="presentAddress">
                <TextArea rows={2} placeholder="Current address" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Father Information */}
        <Card title="Father Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Father's Name" name="fatherName">
                <Input placeholder="Father's full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Father's Mobile" name="fatherMobile">
                <Input placeholder="+8801XXXXXXXXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Father's Occupation" name="fatherOccupation">
                <Input placeholder="Occupation" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Father's Email"
                name="fatherEmail"
                rules={[{ type: "email" }]}
              >
                <Input placeholder="Email address" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Mother Information */}
        <Card title="Mother Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Mother's Name" name="motherName">
                <Input placeholder="Mother's full name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Mother's Mobile" name="motherMobile">
                <Input placeholder="+8801XXXXXXXXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Mother's Occupation" name="motherOccupation">
                <Input placeholder="Occupation" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Mother's Email"
                name="motherEmail"
                rules={[{ type: "email" }]}
              >
                <Input placeholder="Email address" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Contact & Fee Information */}
        <Card title="Contact & Fee Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Guardian Name"
                name="guardianName"
                rules={[
                  { required: true, message: "Please enter guardian name" },
                ]}
              >
                <Input placeholder="Primary contact person" />
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
            <Col span={8}>
              <Form.Item
                label="Monthly Tuition Fee (৳)"
                name="monthlyTuitionFee"
                rules={[
                  { required: true, message: "Please enter monthly fee" },
                ]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="Enter amount"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Admission Fee (৳)" name="admissionFee">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="Enter amount"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Admission Date"
                name="admissionDate"
                rules={[{ required: true, message: "Please select admission date" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={isPending}
            size="large"
          >
            {isEditMode ? "Update Student" : "Add Student"}
          </Button>
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => navigate("/uac/students")}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
