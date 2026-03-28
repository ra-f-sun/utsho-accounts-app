import { useNavigate, useParams } from "react-router-dom";
import { Form, Input, Button, Card, Select, Switch, App } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  usersService,
  type CreateUserDto,
  type UpdateUserDto,
} from "../../services/usersService";
import { useEffect } from "react";
import { PERSON_NAME_MESSAGE, PERSON_NAME_REGEX } from "../../utils/validators";

function AddUser() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // Fetch user data if editing
  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => usersService.getById(id!),
    enabled: isEdit,
  });

  // Populate form when user data is loaded
  useEffect(() => {
    if (user?.data) {
      const userData = user.data;
      form.setFieldsValue({
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        isActive: userData.isActive,
      });
    }
  }, [user, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateUserDto) => usersService.create(data),
    onSuccess: () => {
      message.success("User created successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/users");
    },
    onError: (error: Error) => {
      message.error(error.message || "Failed to create user");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserDto) => usersService.update(id!, data),
    onSuccess: () => {
      message.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      navigate("/users");
    },
    onError: (error: Error) => {
      message.error(error.message || "Failed to update user");
    },
  });

  const onFinish = (values: CreateUserDto | UpdateUserDto) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values as CreateUserDto);
    }
  };

  return (
    <div>
      <Card
        title={
          <div>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/users")}
              style={{ marginRight: 16 }}
            />
            {isEdit ? "Edit User" : "Add New User"}
          </div>
        }
        loading={isEdit && isLoading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            isActive: true,
          }}
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            label="Full Name"
            name="fullName"
            rules={[
              { required: true, message: "Please enter full name" },
              { min: 2, message: "Name must be at least 2 characters" },
              { pattern: PERSON_NAME_REGEX, message: PERSON_NAME_MESSAGE },
            ]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>

          {!isEdit && (
            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: "Please enter password" },
                { min: 6, message: "Password must be at least 6 characters" },
              ]}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          )}

          {isEdit && (
            <Form.Item
              label="New Password (leave empty to keep current)"
              name="password"
              rules={[
                {
                  min: 6,
                  message: "Password must be at least 6 characters",
                },
              ]}
            >
              <Input.Password placeholder="Enter new password (optional)" />
            </Form.Item>
          )}

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: "Please select a role" }]}
          >
            <Select placeholder="Select role">
              <Select.Option value="SUPER_ADMIN">Super Admin</Select.Option>
              <Select.Option value="DIRECTOR">Director</Select.Option>
              <Select.Option value="ACCOUNTANT_UAC">
                UAC Accountant
              </Select.Option>
              <Select.Option value="ACCOUNTANT_MBCS">
                MBCS Accountant
              </Select.Option>
              <Select.Option value="ACCOUNTANT_MEC">
                MEC Accountant
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Status"
            name="isActive"
            valuePropName="checked"
            tooltip="Active users can log in to the system"
          >
            <Switch
              checkedChildren="Active"
              unCheckedChildren="Inactive"
              defaultChecked
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              style={{ marginRight: 8 }}
            >
              {isEdit ? "Update User" : "Create User"}
            </Button>
            <Button onClick={() => navigate("/users")}>Cancel</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default AddUser;
