import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Form, Input, Button, App } from "antd";
import {
  UserOutlined,
  LockOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { AxiosError } from "axios";
import { type LoginData, authApi } from "../services/authService";
import { useAuthStore } from "../stores/authStore";

interface ApiErrorResponse {
  message: string;
}

export default function LoginPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      const { user, accessToken } = data.data;
      setAuth(user, accessToken);
      setLoading(false);
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
    <div className="login-root">
      {/* Left branding panel */}
      <div className="login-left">
        <div className="login-left-icon">U</div>
        <h1 className="login-left-title">Utsho Accounting System</h1>
        <p className="login-left-desc">
          Manage students, payments, payroll, and expenses across all your
          institutions from one place.
        </p>
      </div>

      {/* Right form panel */}
      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-form-header">
            <div className="login-logo-mark">U</div>
            <h2 className="login-title">Welcome back</h2>
            <p className="login-subtitle">Sign in to your account</p>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
          >
            <Form.Item
              name="email"
              label={<span className="login-field-label">Email address</span>}
              rules={[
                { required: true, message: "Please input your email!" },
                { type: "email", message: "Please enter a valid email!" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="you@example.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="login-field-label">Password</span>}
              rules={[
                { required: true, message: "Please input your password!" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
                size="large"
              />
            </Form.Item>

            <Form.Item className="login-btn-wrap">
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                size="large"
                icon={<ArrowRightOutlined />}
                iconPosition="end"
                className="login-btn"
              >
                Sign in
              </Button>
            </Form.Item>
          </Form>

          {import.meta.env.DEV && (
            <div className="login-dev-hint">
              <p className="login-dev-label">🧪 Dev credentials</p>
              <p className="login-dev-creds">admin@utsho.com / admin123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
