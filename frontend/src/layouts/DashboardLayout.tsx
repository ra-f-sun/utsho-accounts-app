import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Avatar, Dropdown, Typography } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  SettingOutlined,
  DollarOutlined,
  HistoryOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../stores/authStore";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Derive selected key: find the longest matching menu key for current path
  const pathname = location.pathname;
  const allKeys = [
    "/dashboard",
    "/users",
    "/uac/students",
    "/uac/teachers",
    "/uac/staff",
    "/uac/payments",
    "/uac/payment-history",
    "/uac/teacher-attendance",
    "/uac/payroll",
    "/mbcs/students",
    "/mbcs/teachers",
    "/mbcs/staff",
    "/mbcs/payments",
    "/mbcs/payment-history",
    "/mbcs/teacher-attendance",
    "/mbcs/payroll",
    "/expenses",
  ];
  const selectedKey =
    allKeys
      .filter((k) => pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] || "/dashboard";

  // Auto-open the parent submenu
  const openKeys = pathname.startsWith("/uac")
    ? ["uac"]
    : pathname.startsWith("/mbcs")
      ? ["mbcs"]
      : [];

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
          icon: <DollarOutlined />,
          label: "Payments",
          onClick: () => navigate("/uac/payments"),
        },
        {
          key: "/uac/payment-history",
          icon: <HistoryOutlined />,
          label: "Payment History",
          onClick: () => navigate("/uac/payment-history"),
        },
        {
          key: "/uac/teacher-attendance",
          label: "Teacher Attendance",
          onClick: () => navigate("/uac/teacher-attendance"),
        },
        {
          key: "/uac/payroll",
          icon: <WalletOutlined />,
          label: "Payroll",
          onClick: () => navigate("/uac/payroll"),
        },
      ],
      disabled: !["SUPER_ADMIN", "DIRECTOR", "ACCOUNTANT_UAC"].includes(
        user?.role || "",
      ),
    },
    {
      key: "mbcs",
      icon: <TeamOutlined />,
      label: "MBCS Module",
      children: [
        {
          key: "/mbcs/students",
          label: "Students",
          onClick: () => navigate("/mbcs/students"),
        },
        {
          key: "/mbcs/teachers",
          label: "Teachers",
          onClick: () => navigate("/mbcs/teachers"),
        },
        {
          key: "/mbcs/staff",
          label: "Staff",
          onClick: () => navigate("/mbcs/staff"),
        },
        {
          key: "/mbcs/payments",
          icon: <DollarOutlined />,
          label: "Payments",
          onClick: () => navigate("/mbcs/payments"),
        },
        {
          key: "/mbcs/payment-history",
          icon: <HistoryOutlined />,
          label: "Payment History",
          onClick: () => navigate("/mbcs/payment-history"),
        },
        {
          key: "/mbcs/teacher-attendance",
          label: "Teacher Attendance",
          onClick: () => navigate("/mbcs/teacher-attendance"),
        },
        {
          key: "/mbcs/payroll",
          icon: <WalletOutlined />,
          label: "Payroll",
          onClick: () => navigate("/mbcs/payroll"),
        },
      ],
      disabled: !["SUPER_ADMIN", "DIRECTOR", "ACCOUNTANT_MBCS"].includes(
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
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
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
