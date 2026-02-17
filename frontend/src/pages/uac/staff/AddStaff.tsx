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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { staffService } from "../../../services/staffService";
import type { CreateStaffDto } from "../../../services/staffService";

export default function AddStaff() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const onFinish = (values: any) => {
    createMutation.mutate(values);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h2>Add New Staff</h2>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Card title="Staff Information">
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
              <Form.Item
                label="Designation"
                name="designation"
                rules={[
                  { required: true, message: "Please enter designation" },
                ]}
              >
                <Input placeholder="e.g., Librarian, Lab Assistant" />
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
            loading={createMutation.isPending}
            size="large"
          >
            Add Staff
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
