import { useEffect, useState } from "react";
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
  Tooltip,
  Typography,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { mecStudentsService } from "../../../services/mecStudentsService";
import type { CreateMecStudentDto } from "../../../services/mecStudentsService";
import settingsService, {
  type OrgSetting,
} from "../../../services/settingsService";
import dayjs from "dayjs";
import {
  PERSON_NAME_MESSAGE,
  PERSON_NAME_REGEX,
  disableFutureDate,
} from "../../../utils/validators";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

export default function AddMecStudent() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const selectedClass = Form.useWatch("class", form);
  const isGroupDisabled = typeof selectedClass !== "number" || selectedClass < 9;

  useEffect(() => {
    if (typeof selectedClass === "number" && selectedClass < 9) {
      form.setFieldValue("group", undefined);
    }
  }, [selectedClass, form]);

  // Settings state
  const [tuitionDiscounts, setTuitionDiscounts] = useState<number[]>([]);

  useEffect(() => {
    void settingsService.getAllSettings("mec").then((rows: OrgSetting[]) => {
      rows.forEach((r) => {
        const vals =
          (r.settingValue as { values: number[] } | null)?.values ?? [];
        if (r.settingKey === "discount_tuition_options")
          setTuitionDiscounts(vals);
        // Auto-fill default fee for new students
        if (r.settingKey === "tuition_default" && !isEditMode) {
          const def = (r.settingValue as { value: number } | null)?.value;
          if (def) form.setFieldValue("monthlyTuitionFee", def);
        }
      });
    });
  }, [form, isEditMode]);

  const { data: existingData } = useQuery({
    queryKey: ["mec-student", id],
    queryFn: () => mecStudentsService.getOne(id!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingData) {
      const student = existingData?.data;
      form.setFieldsValue({
        ...student,
        dateOfBirth: student.dateOfBirth
          ? dayjs(student.dateOfBirth)
          : undefined,
        admissionDate: student.admissionDate
          ? dayjs(student.admissionDate)
          : undefined,
        discountTuition: student.discountTuition ?? 0,
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

  const onFinish = (values: Omit<CreateMecStudentDto, 'dateOfBirth' | 'admissionDate'> & {
    dateOfBirth?: ReturnType<typeof dayjs>;
    admissionDate?: ReturnType<typeof dayjs>;
  }) => {
    const raw = {
      ...values,
      ...(typeof values.class === "number" && values.class < 9 ? { group: undefined } : {}),
      dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
      admissionDate: values.admissionDate?.format("YYYY-MM-DD") ?? undefined,
      discountTuition: values.discountTuition ?? 0,
    };
    // Strip empty strings to undefined so optional backend validators don't reject ""
    const data = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === "" ? undefined : v]),
    );
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data as unknown as CreateMecStudentDto);
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
                rules={[
                  { required: true, message: "Name is required" },
                  { pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE },
                ]}
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
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  disabledDate={disableFutureDate}
                />
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
                <Input
                  placeholder={
                    isGroupDisabled
                      ? "Available for class 9 and above"
                      : "e.g. Science, Arts..."
                  }
                  disabled={isGroupDisabled}
                />
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
                rules={[
                  { required: true },
                  { pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE },
                ]}
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
                label={
                  <span>
                    Monthly Tuition Fee (৳)&nbsp;
                    <Tooltip title="Auto-filled from Settings → Configure MEC. You can change it here if needed.">
                      <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
                    </Tooltip>
                  </span>
                }
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
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Discount on Tuition Fee"
                name="discountTuition"
              >
                <Select allowClear placeholder="No Discount">
                  <Option value={0}>No Discount</Option>
                  {tuitionDiscounts.map((v) => (
                    <Option key={v} value={v}>
                      ৳{v} off
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const tuition = getFieldValue("monthlyTuitionFee") ?? 0;
              const dTuition = getFieldValue("discountTuition") ?? 0;
              if (!tuition || !dTuition) return null;
              return (
                <div
                  style={{
                    background: "#f6ffed",
                    border: "1px solid #b7eb8f",
                    borderRadius: 8,
                    padding: "12px 16px",
                    marginTop: 4,
                  }}
                >
                  <Text strong>Effective Tuition: </Text>
                  <Text strong>৳{tuition - dTuition}</Text>
                  <Text type="secondary">
                    {" "}(৳{tuition} − ৳{dTuition})
                  </Text>
                </div>
              );
            }}
          </Form.Item>
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
              <Form.Item
                label="Father Name"
                name="fatherName"
                rules={[{ pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE }]}
              >
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
              <Form.Item
                label="Mother Name"
                name="motherName"
                rules={[{ pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE }]}
              >
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
