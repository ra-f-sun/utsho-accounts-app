import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Form, Input, Button, Card, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { AxiosError } from "axios";
import { type LoginData, authApi } from "../services/authService";
import { useAuthStore } from "../stores/authStore";

interface ApiErrorResponse {
  message: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      const { user, accessToken } = data.data;
      setAuth(user, accessToken);
      message.success("Login successful!");
      navigate("/dashboard");
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      message.error(error.response?.data?.message || "Login failed");
      setLoading(false);
    },
  });

  const onFinish = (values: LoginData) => {
    setLoading(true);
    loginMutation.mutate(values);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Card
        title="Utsho Accounting System"
        style={{ width: 400, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
      >
        <Form name="login" onFinish={onFinish} autoComplete="off" size="large">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please input your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Log in
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", color: "#666", fontSize: "12px" }}>
          <p>Test Account: admin@utsho.com / admin123</p>
        </div>
      </Card>
    </div>
  );
}
