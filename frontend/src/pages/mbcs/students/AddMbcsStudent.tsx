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
  Typography,
  Tooltip,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { mbcsStudentsService } from "../../../services/mbcsStudentsService";
import type { CreateMbcsStudentDto } from "../../../services/mbcsStudentsService";
import settingsService, { type OrgSetting } from "../../../services/settingsService";
import { MBCS_CLASSES } from "../../../constants/mbcsClasses";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

/** Helper — resolve fee from settings rows (override-first, then default) */
function resolveFee(
  rows: OrgSetting[],
  prefix: string,
  cls: number,
): number | null {
  const override = rows.find((r) => r.settingKey === `${prefix}_override_${cls}`);
  if (override) return (override.settingValue as { value: number }).value;
  const def = rows.find((r) => r.settingKey === `${prefix}_default`);
  if (def) return (def.settingValue as { value: number }).value;
  return null;
}

export default function AddMbcsStudent() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  // Settings rows fetched once (used to resolve fees + discount options)
  const [settingsRows, setSettingsRows] = useState<OrgSetting[]>([]);
  const [tuitionDiscounts, setTuitionDiscounts] = useState<number[]>([]);
  const [admissionDiscounts, setAdmissionDiscounts] = useState<number[]>([]);
  const [readmissionDiscounts, setReadmissionDiscounts] = useState<number[]>([]);

  useEffect(() => {
    void settingsService.getAllSettings("mbcs").then((rows) => {
      setSettingsRows(rows);
      setTuitionDiscounts(
        (rows.find((r) => r.settingKey === "discount_tuition_options")
          ?.settingValue as { values: number[] } | undefined)?.values ?? [],
      );
      setAdmissionDiscounts(
        (rows.find((r) => r.settingKey === "discount_admission_options")
          ?.settingValue as { values: number[] } | undefined)?.values ?? [],
      );
      setReadmissionDiscounts(
        (rows.find((r) => r.settingKey === "discount_readmission_options")
          ?.settingValue as { values: number[] } | undefined)?.values ?? [],
      );
    });
  }, []);

  /** Called when the class selector changes — auto-fills fees from settings */
  function onClassChange(cls: number) {
    const tuition = resolveFee(settingsRows, "tuition", cls);
    const admission = resolveFee(settingsRows, "admission", cls);
    const readmission = resolveFee(settingsRows, "readmission", cls);
    form.setFieldsValue({
      ...(tuition !== null ? { monthlyTuitionFee: tuition } : {}),
      ...(admission !== null ? { admissionFee: admission } : {}),
      ...(readmission !== null ? { readmissionFee: readmission } : {}),
    });
  }

  // Fetch existing student for edit
  const { data: existingData } = useQuery({
    queryKey: ["mbcs-student", id],
    queryFn: () => mbcsStudentsService.getOne(id!),
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
        discountAdmission: student.discountAdmission ?? 0,
        discountReadmission: student.discountReadmission ?? 0,
      });
    }
  }, [existingData, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateMbcsStudentDto) =>
      mbcsStudentsService.create(data),
    onSuccess: () => {
      message.success("Student added successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-students"] });
      navigate("/mbcs/students");
    },
    onError: () => message.error("Failed to add student"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateMbcsStudentDto>) =>
      mbcsStudentsService.update(id!, data),
    onSuccess: () => {
      message.success("Student updated successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-students"] });
      navigate("/mbcs/students");
    },
    onError: () => message.error("Failed to update student"),
  });

  const onFinish = (values: Omit<CreateMbcsStudentDto, 'dateOfBirth' | 'admissionDate'> & {
    dateOfBirth?: ReturnType<typeof dayjs>;
    admissionDate?: ReturnType<typeof dayjs>;
  }) => {
    const raw = {
      ...values,
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
      createMutation.mutate(data as CreateMbcsStudentDto);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h2>{isEditMode ? "Edit Student" : "Add New Student"} (MBCS)</h2>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ nationality: "Bangladeshi", admissionDate: dayjs() }}
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

        {/* Academic Information — MBCS specific: shift instead of group, branch instead of school */}
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
                  onChange={(val: number) => onClassChange(val)}
                >
                  {MBCS_CLASSES.map(({ value, label }) => (
                    <Option key={value} value={value}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Shift" name="shift">
                <Select placeholder="Select shift" allowClear>
                  <Option value="morning">Morning</Option>
                  <Option value="day">Day</Option>
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
              <Form.Item label="Branch" name="branch">
                <Input placeholder="e.g., Basabo Branch" />
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

        {/* Contact & Fee */}
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
                label={
                  <span>
                    Monthly Tuition Fee (৳)
                    <Tooltip title="Auto-filled from Settings → Configure MBCS. Change class to update.">
                      <InfoCircleOutlined style={{ marginLeft: 4, color: "#8c8c8c" }} />
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
                  placeholder="Select a class first"
                  disabled
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Discount on Tuition (৳)" name="discountTuition">
                <Select allowClear placeholder="No Discount">
                  <Option value={0}>No Discount</Option>
                  {tuitionDiscounts.map((d) => (
                    <Option key={d} value={d}>
                      ৳{d}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={
                  <span>
                    Admission Fee (৳)
                    <Tooltip title="Auto-filled from Settings → Configure MBCS">
                      <InfoCircleOutlined style={{ marginLeft: 4, color: "#8c8c8c" }} />
                    </Tooltip>
                  </span>
                }
                name="admissionFee"
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="Select a class first"
                  disabled
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Discount on Admission (৳)" name="discountAdmission">
                <Select allowClear placeholder="No Discount">
                  <Option value={0}>No Discount</Option>
                  {admissionDiscounts.map((d) => (
                    <Option key={d} value={d}>
                      ৳{d}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={
                  <span>
                    Re-Admission Fee (৳)
                    <Tooltip title="Auto-filled from Settings → Configure MBCS">
                      <InfoCircleOutlined style={{ marginLeft: 4, color: "#8c8c8c" }} />
                    </Tooltip>
                  </span>
                }
                name="readmissionFee"
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="N/A"
                  disabled
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Discount on Re-Admission (৳)" name="discountReadmission">
                <Select allowClear placeholder="No Discount">
                  <Option value={0}>No Discount</Option>
                  {readmissionDiscounts.map((d) => (
                    <Option key={d} value={d}>
                      ৳{d}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            {/* Effective fee summary */}
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => {
                const tuition = getFieldValue("monthlyTuitionFee");
                const dTuition = getFieldValue("discountTuition") ?? 0;
                const admission = getFieldValue("admissionFee");
                const dAdmission = getFieldValue("discountAdmission") ?? 0;
                if (!tuition && !admission) return null;
                return (
                  <Col span={24}>
                    <Card size="small" style={{ background: "#f6ffed", borderColor: "#b7eb8f" }}>
                      <Row gutter={16}>
                        {tuition != null && (
                          <Col>
                            <Text>Effective Tuition: </Text>
                            <Text strong style={{ color: "#389e0d" }}>
                              ৳{(tuition - dTuition).toLocaleString()}
                            </Text>
                          </Col>
                        )}
                        {admission != null && (
                          <Col>
                            <Text>Effective Admission: </Text>
                            <Text strong style={{ color: "#389e0d" }}>
                              ৳{(admission - dAdmission).toLocaleString()}
                            </Text>
                          </Col>
                        )}
                      </Row>
                    </Card>
                  </Col>
                );
              }}
            </Form.Item>
            <Col span={8}>
              <Form.Item label="Admission Date" name="admissionDate">
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
            onClick={() => navigate("/mbcs/students")}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
