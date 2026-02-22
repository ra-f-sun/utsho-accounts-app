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
import { mecStudentsService } from "../../../services/mecStudentsService";
import type { CreateMecStudentDto } from "../../../services/mecStudentsService";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

export default function AddMecStudent() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const { data: existingData } = useQuery({
    queryKey: ["mec-student", id],
    queryFn: () => mecStudentsService.getOne(id!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingData) {
      const student = (existingData as any).data;
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
  }, [existingData, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateMecStudentDto) => mecStudentsService.create(data),
    onSuccess: () => {
      message.success("Student added successfully");
      queryClient.invalidateQueries({ queryKey: ["mec-students"] });
      navigate("/mec/students");
    },
    onError: () => message.error("Failed to add student"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateMecStudentDto>) =>
      mecStudentsService.update(id!, data),
    onSuccess: () => {
      message.success("Student updated successfully");
      queryClient.invalidateQueries({ queryKey: ["mec-students"] });
      navigate("/mec/students");
    },
    onError: () => message.error("Failed to update student"),
  });

  const onFinish = (values: any) => {
    const data = {
      ...values,
      dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
      admissionDate: values.admissionDate?.format("YYYY-MM-DD") ?? undefined,
    };
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>{isEditMode ? "Edit Student" : "Add MEC Student"}</h2>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ admissionDate: dayjs() }}
      >
        {/* Basic Info */}
        <Card title="Basic Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Full Name"
                name="name"
                rules={[{ required: true, message: "Name is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Gender"
                name="gender"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Date of Birth"
                name="dateOfBirth"
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Class" name="class">
                <InputNumber min={1} max={12} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Section" name="section">
                <Input placeholder="A, B, C..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Group" name="group">
                <Input placeholder="e.g. Science, Arts..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Serial No" name="serialNo">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Contact Info */}
        <Card title="Guardian & Contact" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Guardian Name"
                name="guardianName"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Contact Number"
                name="contactNumber"
                rules={[{ required: true }]}
              >
                <Input placeholder="01XXXXXXXXX" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Fee Info */}
        <Card title="Fee Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Monthly Tuition Fee (৳)"
                name="monthlyTuitionFee"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Admission Fee (৳)" name="admissionFee">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Admission Date" name="admissionDate">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Optional Personal Details */}
        <Card title="Personal Details (Optional)" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Nationality" name="nationality">
                <Input defaultValue="Bangladeshi" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Religion" name="religion">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Blood Group" name="bloodGroup">
                <Select allowClear>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(
                    (bg) => (
                      <Option key={bg} value={bg}>
                        {bg}
                      </Option>
                    ),
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Present Address" name="presentAddress">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Health Condition" name="healthCondition">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Father Info */}
        <Card
          title="Father Information (Optional)"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Father Name" name="fatherName">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Father Mobile" name="fatherMobile">
                <Input placeholder="01XXXXXXXXX" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Father Occupation" name="fatherOccupation">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Mother Info */}
        <Card
          title="Mother Information (Optional)"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Mother Name" name="motherName">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Mother Mobile" name="motherMobile">
                <Input placeholder="01XXXXXXXXX" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Mother Occupation" name="motherOccupation">
                <Input />
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
            onClick={() => navigate("/mec/students")}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
