import { useEffect } from "react";
import {
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  message,
} from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { staffService } from "../../../services/staffService";
import type { CreateStaffDto } from "../../../services/staffService";
import { PERSON_NAME_MESSAGE, PERSON_NAME_REGEX } from "../../../utils/validators";

export default function AddStaff() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  // Fetch existing staff for edit
  const { data: existingData } = useQuery({
    queryKey: ["staff-member", id],
    queryFn: () => staffService.getOne(id!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingData) {
      const staff = existingData?.data;
      if (staff) {
        form.setFieldsValue(staff);
      }
    }
  }, [existingData, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateStaffDto) => staffService.create(data),
    onSuccess: () => {
      message.success("Staff added successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      navigate("/uac/staff");
    },
    onError: () => {
      message.error("Failed to add staff");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateStaffDto>) =>
      staffService.update(id!, data),
    onSuccess: () => {
      message.success("Staff updated successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      navigate("/uac/staff");
    },
    onError: () => {
      message.error("Failed to update staff");
    },
  });

  const onFinish = (values: CreateStaffDto) => {
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2>{isEditMode ? "Edit Staff" : "Add New Staff"}</h2>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Card title="Staff Information">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Full Name"
                name="name"
                rules={[
                  { required: true, message: "Please enter staff name" },
                  { min: 2, message: "Name must be at least 2 characters" },
                  { pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE },
                ]}
              >
                <Input placeholder="Enter full name" maxLength={100} />
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
            <Col span={12}>
              <Form.Item
                label="Designation"
                name="designation"
                rules={[
                  { required: true, message: "Please enter designation" },
                ]}
              >
                <Input placeholder="e.g., Librarian, Lab Assistant" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
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
                  placeholder="Enter salary amount"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Form.Item style={{ marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={isPending}
            size="large"
          >
            {isEditMode ? "Update Staff" : "Add Staff"}
          </Button>
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => navigate("/uac/staff")}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
