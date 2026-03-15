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
import { studentsService } from "../../../services/studentsService";
import type { CreateStudentDto } from "../../../services/studentsService";
import settingsService, {
  type OrgSetting,
} from "../../../services/settingsService";
import { UAC_CLASSES } from "../../../constants/uacClasses";
import dayjs from "dayjs";
import {
  PERSON_NAME_MESSAGE,
  PERSON_NAME_REGEX,
  disableFutureDate,
} from "../../../utils/validators";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

export default function AddStudent() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  // Settings state
  const [settingsRows, setSettingsRows] = useState<OrgSetting[]>([]);
  const [tuitionDiscounts, setTuitionDiscounts] = useState<number[]>([]);
  const [admissionDiscounts, setAdmissionDiscounts] = useState<number[]>([]);
  const [readmissionDiscounts, setReadmissionDiscounts] = useState<number[]>([]);
  const selectedClass = Form.useWatch("class", form);
  const isGroupDisabled = typeof selectedClass !== "number" || selectedClass < 9;

  useEffect(() => {
    if (typeof selectedClass === "number" && selectedClass < 9) {
      form.setFieldValue("group", undefined);
    }
  }, [selectedClass, form]);

  useEffect(() => {
    void settingsService.getAllSettings("uac").then((rows) => {
      setSettingsRows(rows);
      rows.forEach((r) => {
        const vals =
          (r.settingValue as { values: number[] } | null)?.values ?? [];
        if (r.settingKey === "discount_tuition_options")
          setTuitionDiscounts(vals);
        if (r.settingKey === "discount_admission_options")
          setAdmissionDiscounts(vals);
        if (r.settingKey === "discount_readmission_options")
          setReadmissionDiscounts(vals);
      });
    });
  }, []);

  function resolveFee(prefix: string, cls: number): number | null {
    const overrideKey = `${prefix}_override_${cls}`;
    const defaultKey = `${prefix}_default`;
    const overrideRow = settingsRows.find((r) => r.settingKey === overrideKey);
    const defaultRow = settingsRows.find((r) => r.settingKey === defaultKey);
    const override = (overrideRow?.settingValue as { value: number } | null)
      ?.value;
    const def = (defaultRow?.settingValue as { value: number } | null)?.value;
    return override ?? def ?? null;
  }

  function onClassChange(cls: number) {
    const tuition = resolveFee("tuition", cls);
    const admission = resolveFee("admission", cls);
    const readmission = resolveFee("readmission", cls);
    form.setFieldsValue({
      monthlyTuitionFee: tuition,
      admissionFee: admission,
      readmissionFee: readmission,
    });
  }

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
          discountTuition: student.discountTuition ?? 0,
          discountAdmission: student.discountAdmission ?? 0,
          discountReadmission: student.discountReadmission ?? 0,
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

  const onFinish = (values: Omit<CreateStudentDto, 'dateOfBirth' | 'admissionDate'> & {
    dateOfBirth?: ReturnType<typeof dayjs>;
    admissionDate?: ReturnType<typeof dayjs>;
  }) => {
    const raw = {
      ...values,
      ...(typeof values.class === "number" && values.class < 9 ? { group: undefined } : {}),
      dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
      admissionDate: values.admissionDate?.format("YYYY-MM-DD"),
      discountTuition: values.discountTuition ?? 0,
      discountAdmission: values.discountAdmission ?? 0,
      discountReadmission: values.discountReadmission ?? 0,
    };
    // Strip empty strings to undefined so optional backend validators don't reject ""
    const data = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === "" ? undefined : v]),
    );
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data as unknown as CreateStudentDto);
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
                  { pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE },
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
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  disabledDate={disableFutureDate}
                />
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
                <Select
                  placeholder="Select class"
                  onChange={(cls: number) => onClassChange(cls)}
                >
                  {UAC_CLASSES.map(({ value: cls, label }) => (
                    <Option key={cls} value={cls}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Group" name="group">
                <Select
                  placeholder={
                    isGroupDisabled
                      ? "Available for class 9 and above"
                      : "Select group"
                  }
                  allowClear
                  disabled={isGroupDisabled}
                >
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
              <Form.Item
                label="Father's Name"
                name="fatherName"
                rules={[{ pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE }]}
              >
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
              <Form.Item
                label="Mother's Name"
                name="motherName"
                rules={[{ pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE }]}
              >
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
                  { pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE },
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
                label={
                  <span>
                    Monthly Tuition Fee (৳)&nbsp;
                    <Tooltip title="Auto-filled from Settings → Configure UAC. Select a class to apply the fee.">
                      <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
                    </Tooltip>
                  </span>
                }
                name="monthlyTuitionFee"
                rules={[
                  { required: true, message: "Please enter monthly fee" },
                ]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="Select class to auto-fill"
                  disabled
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={
                  <span>
                    Admission Fee (৳)&nbsp;
                    <Tooltip title="Auto-filled from Settings → Configure UAC">
                      <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
                    </Tooltip>
                  </span>
                }
                name="admissionFee"
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="Select class to auto-fill"
                  disabled
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={
                  <span>
                    Re-Admission Fee (৳)&nbsp;
                    <Tooltip title="Auto-filled from Settings → Configure UAC">
                      <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
                    </Tooltip>
                  </span>
                }
                name="readmissionFee"
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="Select class to auto-fill"
                  disabled
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Discounts */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Discount on Tuition Fee" name="discountTuition">
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
            <Col span={8}>
              <Form.Item
                label="Discount on Admission Fee"
                name="discountAdmission"
              >
                <Select allowClear placeholder="No Discount">
                  <Option value={0}>No Discount</Option>
                  {admissionDiscounts.map((v) => (
                    <Option key={v} value={v}>
                      ৳{v} off
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Discount on Re-Admission Fee"
                name="discountReadmission"
              >
                <Select allowClear placeholder="No Discount">
                  <Option value={0}>No Discount</Option>
                  {readmissionDiscounts.map((v) => (
                    <Option key={v} value={v}>
                      ৳{v} off
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Effective fee summary */}
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const tuition = getFieldValue("monthlyTuitionFee") ?? 0;
              const admission = getFieldValue("admissionFee") ?? 0;
              const readmission = getFieldValue("readmissionFee") ?? 0;
              const dTuition = getFieldValue("discountTuition") ?? 0;
              const dAdmission = getFieldValue("discountAdmission") ?? 0;
              const dReadmission = getFieldValue("discountReadmission") ?? 0;
              if (!tuition && !admission && !readmission) return null;
              return (
                <div
                  style={{
                    background: "#f6ffed",
                    border: "1px solid #b7eb8f",
                    borderRadius: 8,
                    padding: "12px 16px",
                    marginTop: 8,
                  }}
                >
                  <Text strong style={{ display: "block", marginBottom: 4 }}>
                    Effective Fees
                  </Text>
                  <Row gutter={16}>
                    {tuition > 0 && (
                      <Col>
                        <Text>Tuition: </Text>
                        <Text strong>৳{tuition - dTuition}</Text>
                        {dTuition > 0 && (
                          <Text type="secondary">
                            {" "}(৳{tuition} − ৳{dTuition})
                          </Text>
                        )}
                      </Col>
                    )}
                    {admission > 0 && (
                      <Col>
                        <Text>Admission: </Text>
                        <Text strong>৳{admission - dAdmission}</Text>
                        {dAdmission > 0 && (
                          <Text type="secondary">
                            {" "}(৳{admission} − ৳{dAdmission})
                          </Text>
                        )}
                      </Col>
                    )}
                    {readmission > 0 && (
                      <Col>
                        <Text>Re-Admission: </Text>
                        <Text strong>৳{readmission - dReadmission}</Text>
                        {dReadmission > 0 && (
                          <Text type="secondary">
                            {" "}(৳{readmission} − ৳{dReadmission})
                          </Text>
                        )}
                      </Col>
                    )}
                  </Row>
                </div>
              );
            }}
          </Form.Item>

          <Row gutter={16} style={{ marginTop: 16 }}>
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
