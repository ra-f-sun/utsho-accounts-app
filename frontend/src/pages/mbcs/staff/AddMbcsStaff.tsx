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
import { mbcsStaffService } from "../../../services/mbcsStaffService";
import type { CreateMbcsStaffDto } from "../../../services/mbcsStaffService";

export default function AddMbcsStaff() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  // Fetch existing staff for edit
  const { data: existingData } = useQuery({
    queryKey: ["mbcs-staff-member", id],
    queryFn: () => mbcsStaffService.getOne(id!),
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
    mutationFn: (data: CreateMbcsStaffDto) => mbcsStaffService.create(data),
    onSuccess: () => {
      message.success("Staff member added successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-staff"] });
      navigate("/mbcs/staff");
    },
    onError: () => message.error("Failed to add staff member"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateMbcsStaffDto>) =>
      mbcsStaffService.update(id!, data),
    onSuccess: () => {
      message.success("Staff member updated successfully");
      queryClient.invalidateQueries({ queryKey: ["mbcs-staff"] });
      navigate("/mbcs/staff");
    },
    onError: () => message.error("Failed to update staff member"),
  });

  const onFinish = (values: CreateMbcsStaffDto) => {
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2>{isEditMode ? "Edit Staff" : "Add New Staff"} (MBCS)</h2>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Card title="Staff Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Full Name"
                name="name"
                rules={[{ required: true, message: "Please enter staff name" }]}
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
            <Col span={12}>
              <Form.Item label="Designation" name="designation">
                <Input placeholder="e.g., Office Assistant, Driver" />
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
                  placeholder="Enter amount"
                />
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
            {isEditMode ? "Update Staff" : "Add Staff"}
          </Button>
          <Button
            style={{ marginLeft: 8 }}
            onClick={() => navigate("/mbcs/staff")}
            size="large"
          >
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
