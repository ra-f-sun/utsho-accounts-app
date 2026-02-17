import { Outlet, useNavigate } from "react-router-dom";
import { Layout, Menu, Avatar, Dropdown, Typography } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../stores/authStore";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      onClick: () => navigate("/dashboard"),
    },
    {
      key: "/users",
      icon: <TeamOutlined />,
      label: "Users",
      onClick: () => navigate("/users"),
      disabled: user?.role !== "SUPER_ADMIN",
    },
    {
      key: "uac",
      icon: <TeamOutlined />,
      label: "UAC Module",
      children: [
        {
          key: "/uac/students",
          label: "Students",
          onClick: () => navigate("/uac/students"),
        },
        {
          key: "/uac/teachers",
          label: "Teachers",
          onClick: () => navigate("/uac/teachers"),
        },
        {
          key: "/uac/staff",
          label: "Staff",
          onClick: () => navigate("/uac/staff"),
        },
        {
          key: "/uac/payments",
          label: "Payments",
          onClick: () => navigate("/uac/payments"),
        },
        {
          key: "/uac/payroll",
          label: "Payroll",
          onClick: () => navigate("/uac/payroll"),
        },
      ],
      disabled: !["SUPER_ADMIN", "DIRECTOR", "ACCOUNTANT_UAC"].includes(
        user?.role || "",
      ),
    },
    {
      key: "/expenses",
      icon: <TeamOutlined />,
      label: "Expenses",
      onClick: () => navigate("/expenses"),
      disabled: ![
        "SUPER_ADMIN",
        "DIRECTOR",
        "ACCOUNTANT_UAC",
        "ACCOUNTANT_MBCS",
        "ACCOUNTANT_MEC",
      ].includes(user?.role || ""),
    },
  ];

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        style={{
          background: "#001529",
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          Utsho System
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={["/dashboard"]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text strong style={{ fontSize: 18 }}>
            {user?.role?.replace("_", " ")}
          </Text>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Avatar icon={<UserOutlined />} />
              <Text>{user?.fullName}</Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: "24px 16px 0" }}>
          <div style={{ padding: 24, background: "#fff", minHeight: 360 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
