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
import settingsService, { type OrgSetting } from "../../../services/settingsService";
import { UAC_ADMISSION_CLASSES } from "../../../constants/uacClasses";
import { MBCS_CLASSES } from "../../../constants/mbcsClasses";
import dayjs from "dayjs";
import {
  PERSON_NAME_MESSAGE,
  PERSON_NAME_REGEX,
  disableFutureDate,
} from "../../../utils/validators";

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

type OrgType = "uac" | "mbcs" | "mec";

interface OrgConfig {
  classField: "select" | "number";
  classOptions: { value: number; label: string }[];
  classRequired: boolean;
  hasGroup: boolean;
  groupType: "select" | "input";
  groupRequiresMinClass: number | null;
  hasShift: boolean;
  hasSchool: boolean;
  hasBranch: boolean;
  hasFeeClassSync: boolean;    // UAC + MBCS: class change auto-fills fees
  feeLoadDefault: boolean;     // MEC: load tuition_default once for new students
  hasAdmissionFee: boolean;
  hasReadmissionFee: boolean;
  admissionDateRequired: boolean;
  addTitle: string;
  orgSettingsTooltip: string;
  initialNationality: string | undefined;
}

const ORG_CONFIG: Record<OrgType, OrgConfig> = {
  uac: {
    classField: "select",
    classOptions: UAC_ADMISSION_CLASSES,
    classRequired: true,
    hasGroup: true,
    groupType: "select",
    groupRequiresMinClass: 9,
    hasShift: false,
    hasSchool: true,
    hasBranch: false,
    hasFeeClassSync: true,
    feeLoadDefault: false,
    hasAdmissionFee: true,
    hasReadmissionFee: true,
    admissionDateRequired: true,
    addTitle: "Add New Student",
    orgSettingsTooltip: "Configure UAC",
    initialNationality: "Bangladeshi",
  },
  mbcs: {
    classField: "select",
    classOptions: MBCS_CLASSES,
    classRequired: true,
    hasGroup: false,
    groupType: "select",
    groupRequiresMinClass: null,
    hasShift: true,
    hasSchool: false,
    hasBranch: true,
    hasFeeClassSync: true,
    feeLoadDefault: false,
    hasAdmissionFee: true,
    hasReadmissionFee: true,
    admissionDateRequired: false,
    addTitle: "Add New Student (MBCS)",
    orgSettingsTooltip: "Configure MBCS",
    initialNationality: "Bangladeshi",
  },
  mec: {
    classField: "number",
    classOptions: [],
    classRequired: false,
    hasGroup: true,
    groupType: "input",
    groupRequiresMinClass: 9,
    hasShift: false,
    hasSchool: false,
    hasBranch: false,
    hasFeeClassSync: false,
    feeLoadDefault: true,
    hasAdmissionFee: true,
    hasReadmissionFee: false,
    admissionDateRequired: false,
    addTitle: "Add MEC Student",
    orgSettingsTooltip: "Configure MEC",
    initialNationality: undefined,
  },
};

function resolveFee(rows: OrgSetting[], prefix: string, cls: number): number | null {
  const override = rows.find((r) => r.settingKey === `${prefix}_override_${cls}`);
  if (override) return (override.settingValue as { value: number }).value;
  const def = rows.find((r) => r.settingKey === `${prefix}_default`);
  if (def) return (def.settingValue as { value: number }).value;
  return null;
}

export default function AddStudent({ org }: { org: OrgType }) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const config = ORG_CONFIG[org];

  const [settingsRows, setSettingsRows] = useState<OrgSetting[]>([]);
  const [tuitionDiscounts, setTuitionDiscounts] = useState<number[]>([]);
  const [admissionDiscounts, setAdmissionDiscounts] = useState<number[]>([]);
  const [readmissionDiscounts, setReadmissionDiscounts] = useState<number[]>([]);

  const selectedClass = Form.useWatch("class", form);
  const isGroupDisabled =
    config.groupRequiresMinClass !== null &&
    (typeof selectedClass !== "number" || selectedClass < config.groupRequiresMinClass);

  useEffect(() => {
    if (config.groupRequiresMinClass !== null && typeof selectedClass === "number" && selectedClass < config.groupRequiresMinClass) {
      form.setFieldValue("group", undefined);
    }
  }, [selectedClass, form, config.groupRequiresMinClass]);

  useEffect(() => {
    void settingsService.getAllSettings(org).then((rows: OrgSetting[]) => {
      setSettingsRows(rows);
      const getVals = (key: string) =>
        (rows.find((r) => r.settingKey === key)?.settingValue as { values: number[] } | undefined)
          ?.values ?? [];
      setTuitionDiscounts(getVals("discount_tuition_options"));
      setAdmissionDiscounts(getVals("discount_admission_options"));
      setReadmissionDiscounts(getVals("discount_readmission_options"));

      // MEC: auto-fill tuition default for new students
      if (config.feeLoadDefault && !isEditMode) {
        const defRow = rows.find((r) => r.settingKey === "tuition_default");
        const def = (defRow?.settingValue as { value: number } | null)?.value;
        if (def) form.setFieldValue("monthlyTuitionFee", def);
      }
    });
  }, [form, isEditMode, org, config.feeLoadDefault]);

  function onClassChange(cls: number) {
    if (!config.hasFeeClassSync) return;
    const tuition = resolveFee(settingsRows, "tuition", cls);
    const admission = resolveFee(settingsRows, "admission", cls);
    const readmission = resolveFee(settingsRows, "readmission", cls);
    form.setFieldsValue({
      ...(tuition !== null ? { monthlyTuitionFee: tuition } : {}),
      ...(admission !== null && config.hasAdmissionFee ? { admissionFee: admission } : {}),
      ...(readmission !== null && config.hasReadmissionFee ? { readmissionFee: readmission } : {}),
    });
  }

  const { data: existingData } = useQuery({
    queryKey: [org, "student", id],
    queryFn: () => studentsService.getOne(org, id!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingData) {
      const student = existingData?.data;
      if (student) {
        form.setFieldsValue({
          ...student,
          dateOfBirth: student.dateOfBirth ? dayjs(student.dateOfBirth) : undefined,
          admissionDate: student.admissionDate ? dayjs(student.admissionDate) : undefined,
          discountTuition: student.discountTuition ?? 0,
          discountAdmission: student.discountAdmission ?? 0,
          discountReadmission: student.discountReadmission ?? 0,
        });
      }
    }
  }, [existingData, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateStudentDto) => studentsService.create(org, data),
    onSuccess: () => {
      message.success("Student added successfully");
      void queryClient.invalidateQueries({ queryKey: [org, "students"] });
      navigate(`/${org}/students`);
    },
    onError: () => message.error("Failed to add student"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateStudentDto>) => studentsService.update(org, id!, data),
    onSuccess: () => {
      message.success("Student updated successfully");
      void queryClient.invalidateQueries({ queryKey: [org, "students"] });
      navigate(`/${org}/students`);
    },
    onError: () => message.error("Failed to update student"),
  });

  const onFinish = (
    values: Omit<CreateStudentDto, "dateOfBirth" | "admissionDate"> & {
      dateOfBirth?: ReturnType<typeof dayjs>;
      admissionDate?: ReturnType<typeof dayjs>;
    },
  ) => {
    const raw = {
      ...values,
      // Clear group if below min class
      ...(config.hasGroup &&
      config.groupRequiresMinClass !== null &&
      typeof values.class === "number" &&
      values.class < config.groupRequiresMinClass
        ? { group: undefined }
        : {}),
      dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
      admissionDate: values.admissionDate?.format("YYYY-MM-DD") ?? undefined,
      discountTuition: values.discountTuition ?? 0,
      ...(config.hasAdmissionFee
        ? { discountAdmission: values.discountAdmission ?? 0 }
        : {}),
      ...(config.hasReadmissionFee
        ? { discountReadmission: values.discountReadmission ?? 0 }
        : {}),
    };
    const data = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === "" ? undefined : v]),
    );
    if (isEditMode) updateMutation.mutate(data);
    else createMutation.mutate(data as unknown as CreateStudentDto);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h2>{isEditMode ? "Edit Student" : config.addTitle}</h2>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          ...(config.initialNationality ? { nationality: config.initialNationality } : {}),
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
                  { min: 2, message: "Name must be at least 2 characters" },
                  { pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE },
                ]}
              >
                <Input placeholder="Enter full name" maxLength={100} />
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
                rules={[{ required: true, message: "Please select date of birth" }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" disabledDate={disableFutureDate} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Academic Information */}
        <Card title="Academic Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            {/* Class */}
            <Col span={6}>
              <Form.Item
                label="Class"
                name="class"
                rules={config.classRequired ? [{ required: true, message: "Please select class" }] : []}
              >
                {config.classField === "select" ? (
                  <Select
                    placeholder="Select class"
                    onChange={(val: number) => onClassChange(val)}
                  >
                    {config.classOptions.map(({ value, label }) => (
                      <Option key={value} value={value}>
                        {label}
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <InputNumber min={1} max={12} style={{ width: "100%" }} />
                )}
              </Form.Item>
            </Col>

            {/* Group (UAC: Select, MEC: Input) */}
            {config.hasGroup && (
              <Col span={6}>
                <Form.Item label="Group" name="group">
                  {config.groupType === "select" ? (
                    <Select
                      placeholder={
                        isGroupDisabled ? "Available for class 9 and above" : "Select group"
                      }
                      allowClear
                      disabled={isGroupDisabled}
                    >
                      <Option value="science">Science</Option>
                      <Option value="business">Business</Option>
                    </Select>
                  ) : (
                    <Input
                      placeholder={
                        isGroupDisabled ? "Available for class 9 and above" : "e.g. Science, Arts..."
                      }
                      disabled={isGroupDisabled}
                      maxLength={100}
                    />
                  )}
                </Form.Item>
              </Col>
            )}

            {/* Shift (MBCS only) */}
            {config.hasShift && (
              <Col span={6}>
                <Form.Item label="Shift" name="shift">
                  <Select placeholder="Select shift" allowClear>
                    <Option value="morning">Morning</Option>
                    <Option value="day">Day</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}

            <Col span={6}>
              <Form.Item label="Section" name="section">
                <Input placeholder="e.g., A, B" maxLength={10} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Serial No" name="serialNo">
                <Input placeholder="Institution roll" maxLength={50} />
              </Form.Item>
            </Col>

            {/* School (UAC only) */}
            {config.hasSchool && (
              <Col span={12}>
                <Form.Item label="School" name="school">
                  <Input placeholder="Which school attending" maxLength={255} />
                </Form.Item>
              </Col>
            )}

            {/* Branch (MBCS only) */}
            {config.hasBranch && (
              <Col span={12}>
                <Form.Item label="Branch" name="branch">
                  <Input placeholder="e.g., Basabo Branch" maxLength={255} />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Card>

        {/* Personal Details */}
        <Card title="Personal Details" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Nationality" name="nationality">
                <Input placeholder="Nationality" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Religion" name="religion">
                <Input placeholder="Religion" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Blood Group" name="bloodGroup">
                <Select placeholder="Select blood group" allowClear>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                    <Option key={bg} value={bg}>
                      {bg}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Health Condition" name="healthCondition">
                <TextArea rows={2} placeholder="Any health notes" maxLength={1000} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Present Address" name="presentAddress">
                <TextArea rows={2} placeholder="Current address" maxLength={500} />
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
                rules={[
                  { min: 2, message: "Name must be at least 2 characters" },
                  { pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE },
                ]}
              >
                <Input placeholder="Father's full name" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Father's Mobile" name="fatherMobile">
                <Input placeholder="+8801XXXXXXXXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Father's Occupation" name="fatherOccupation">
                <Input placeholder="Occupation" maxLength={255} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Father's Email"
                name="fatherEmail"
                rules={[{ type: "email" }]}
              >
                <Input placeholder="Email address" maxLength={255} />
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
                rules={[
                  { min: 2, message: "Name must be at least 2 characters" },
                  { pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE },
                ]}
              >
                <Input placeholder="Mother's full name" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Mother's Mobile" name="motherMobile">
                <Input placeholder="+8801XXXXXXXXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Mother's Occupation" name="motherOccupation">
                <Input placeholder="Occupation" maxLength={255} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Mother's Email"
                name="motherEmail"
                rules={[{ type: "email" }]}
              >
                <Input placeholder="Email address" maxLength={255} />
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
                  { min: 2, message: "Name must be at least 2 characters" },
                  { pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE },
                ]}
              >
                <Input placeholder="Primary contact person" maxLength={100} />
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

          {config.hasFeeClassSync && typeof selectedClass !== "number" && (
            <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              Select a class above to auto-fill default fees from settings.
            </Text>
          )}

          {/* Fee fields */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={
                  <span>
                    Monthly Tuition Fee (৳)&nbsp;
                    <Tooltip
                      title={`Auto-filled from Settings → ${config.orgSettingsTooltip}. You can override the value after selection.`}
                    >
                      <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
                    </Tooltip>
                  </span>
                }
                name="monthlyTuitionFee"
                rules={[{ required: true, message: "Please enter monthly fee" }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder={
                    config.hasFeeClassSync && typeof selectedClass !== "number"
                      ? "Select a class first"
                      : "Enter amount"
                  }
                />
              </Form.Item>
            </Col>
            {config.hasAdmissionFee && (
              <Col span={8}>
                <Form.Item
                  label={
                    <span>
                      Admission Fee (৳)&nbsp;
                      <Tooltip
                        title={`Auto-filled from Settings → ${config.orgSettingsTooltip}. You can override.`}
                      >
                        <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
                      </Tooltip>
                    </span>
                  }
                  name="admissionFee"
                >
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    placeholder={
                      config.hasFeeClassSync && typeof selectedClass !== "number"
                        ? "Select a class first"
                        : "Enter amount"
                    }
                  />
                </Form.Item>
              </Col>
            )}
            {config.hasReadmissionFee && (
              <Col span={8}>
                <Form.Item
                  label={
                    <span>
                      Re-Admission Fee (৳)&nbsp;
                      <Tooltip
                        title={`Auto-filled from Settings → ${config.orgSettingsTooltip}. You can override.`}
                      >
                        <InfoCircleOutlined style={{ color: "#8c8c8c" }} />
                      </Tooltip>
                    </span>
                  }
                  name="readmissionFee"
                >
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    placeholder={
                      config.hasFeeClassSync && typeof selectedClass !== "number"
                        ? "Select a class first"
                        : "Enter amount"
                    }
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          {/* Discount fields */}
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
            {config.hasAdmissionFee && (
              <Col span={8}>
                <Form.Item label="Discount on Admission Fee" name="discountAdmission">
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
            )}
            {config.hasReadmissionFee && (
              <Col span={8}>
                <Form.Item label="Discount on Re-Admission Fee" name="discountReadmission">
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
            )}
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
                            {" "}
                            (৳{tuition} − ৳{dTuition})
                          </Text>
                        )}
                      </Col>
                    )}
                    {config.hasAdmissionFee && admission > 0 && (
                      <Col>
                        <Text>Admission: </Text>
                        <Text strong>৳{admission - dAdmission}</Text>
                        {dAdmission > 0 && (
                          <Text type="secondary">
                            {" "}
                            (৳{admission} − ৳{dAdmission})
                          </Text>
                        )}
                      </Col>
                    )}
                    {config.hasReadmissionFee && readmission > 0 && (
                      <Col>
                        <Text>Re-Admission: </Text>
                        <Text strong>৳{readmission - dReadmission}</Text>
                        {dReadmission > 0 && (
                          <Text type="secondary">
                            {" "}
                            (৳{readmission} − ৳{dReadmission})
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
                rules={
                  config.admissionDateRequired
                    ? [{ required: true, message: "Please select admission date" }]
                    : []
                }
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

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isPending} size="large">
            {isEditMode ? "Update Student" : "Add Student"}
          </Button>
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => navigate(`/${org}/students`)}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
