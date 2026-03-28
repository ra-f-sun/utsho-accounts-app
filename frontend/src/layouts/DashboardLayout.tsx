import { useState, useEffect, useMemo, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Avatar, Dropdown, Button, Tooltip, Badge } from "antd";
import {
  DashboardOutlined,
  UsergroupAddOutlined,
  BankOutlined,
  ReadOutlined,
  SolutionOutlined,
  LogoutOutlined,
  DollarOutlined,
  HistoryOutlined,
  WalletOutlined,
  SettingOutlined,
  VerticalAlignTopOutlined,
  SwapOutlined,
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  SearchOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../stores/authStore";

const { Header, Sider, Content } = Layout;

const SIDER_WIDTH = 240;
const COLLAPSED_WIDTH = 68;
const STORAGE_KEY = "sidebar_collapsed";

function formatRole(role = "") {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleColor(role = "") {
  if (role.includes("SUPER")) return "#e63946";
  if (role.includes("DIRECTOR")) return "#4361ee";
  if (role.includes("ACCOUNTANT")) return "#2ec4b6";
  return "#888";
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Collapse state ── */
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  /* ── Active menu key ── */
  const pathname = location.pathname;
  const allKeys = [
    "/dashboard",
    "/users",
    "/uac/students",
    "/uac/students/promote",
    "/uac/students/directory",
    "/uac/teachers",
    "/uac/staff",
    "/uac/payments",
    "/uac/payments/collect-due",
    "/uac/payment-history",
    "/uac/teacher-attendance",
    "/uac/payroll",
    "/uac/expenses",
    "/mbcs/students",
    "/mbcs/students/promote",
    "/mbcs/students/directory",
    "/mbcs/teachers",
    "/mbcs/staff",
    "/mbcs/payments",
    "/mbcs/payments/collect-due",
    "/mbcs/payment-history",
    "/mbcs/teacher-attendance",
    "/mbcs/payroll",
    "/mbcs/expenses",
    "/mec/students",
    "/mec/payments/record",
    "/mec/payments/collect-due",
    "/mec/payment-history",
    "/mec/expenses",
    "/import-export",
    "/settings",
  ];
  const selectedKey =
    allKeys
      .filter((k) => pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] || "/dashboard";

  /* ── Submenu open state ── */
  const openKeys = useMemo(
    () =>
      pathname.startsWith("/uac")
        ? ["uac"]
        : pathname.startsWith("/mbcs")
          ? ["mbcs"]
          : pathname.startsWith("/mec")
            ? ["mec"]
            : [],
    [pathname],
  );

  const [currentOpenKeys, setCurrentOpenKeys] = useState<string[]>(openKeys);
  useEffect(() => {
    setCurrentOpenKeys(collapsed ? [] : openKeys);
  }, [pathname, openKeys, collapsed]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /* ── Menu items ── */
  const menuItems = [
    {
      type: "group" as const,
      label: (
        <span
          className={`sidebar-section-label${collapsed ? " sidebar-section-label--hidden" : ""}`}
        >
          Main
        </span>
      ),
      children: [
        {
          key: "/dashboard",
          icon: <DashboardOutlined />,
          label: "Dashboard",
          onClick: () => navigate("/dashboard"),
        },
        {
          key: "/users",
          icon: <UsergroupAddOutlined />,
          label: "Users",
          onClick: () => navigate("/users"),
          disabled: user?.role !== "SUPER_ADMIN",
        },
      ],
    },
    {
      type: "group" as const,
      label: (
        <span
          className={`sidebar-section-label${collapsed ? " sidebar-section-label--hidden" : ""}`}
        >
          Modules
        </span>
      ),
      children: [
        {
          key: "uac",
          icon: <BankOutlined />,
          label: "UAC Module",
          disabled: !["SUPER_ADMIN", "DIRECTOR", "ACCOUNTANT_UAC"].includes(
            user?.role || "",
          ),
          children: [
            {
              key: "/uac/students",
              label: "Students",
              onClick: () => navigate("/uac/students"),
            },
            ...(["SUPER_ADMIN", "DIRECTOR"].includes(user?.role || "")
              ? [
                  {
                    key: "/uac/students/promote",
                    icon: <VerticalAlignTopOutlined />,
                    label: "Promote Students",
                    onClick: () => navigate("/uac/students/promote"),
                  },
                ]
              : []),
            {
              key: "/uac/students/directory",
              icon: <BookOutlined />,
              label: "Student Directory",
              onClick: () => navigate("/uac/students/directory"),
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
              key: "/uac/payments/collect-due",
              icon: <DollarOutlined />,
              label: "Collect Due",
              onClick: () => navigate("/uac/payments/collect-due"),
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
            {
              key: "/uac/expenses",
              icon: <DollarOutlined />,
              label: "Expenses",
              onClick: () => navigate("/uac/expenses"),
            },
          ],
        },
        {
          key: "mbcs",
          icon: <ReadOutlined />,
          label: "MBCS Module",
          disabled: !["SUPER_ADMIN", "DIRECTOR", "ACCOUNTANT_MBCS"].includes(
            user?.role || "",
          ),
          children: [
            {
              key: "/mbcs/students",
              label: "Students",
              onClick: () => navigate("/mbcs/students"),
            },
            ...(["SUPER_ADMIN", "DIRECTOR"].includes(user?.role || "")
              ? [
                  {
                    key: "/mbcs/students/promote",
                    icon: <VerticalAlignTopOutlined />,
                    label: "Promote Students",
                    onClick: () => navigate("/mbcs/students/promote"),
                  },
                ]
              : []),
            {
              key: "/mbcs/students/directory",
              icon: <BookOutlined />,
              label: "Student Directory",
              onClick: () => navigate("/mbcs/students/directory"),
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
              key: "/mbcs/payments/collect-due",
              icon: <DollarOutlined />,
              label: "Collect Due",
              onClick: () => navigate("/mbcs/payments/collect-due"),
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
            {
              key: "/mbcs/expenses",
              icon: <DollarOutlined />,
              label: "Expenses",
              onClick: () => navigate("/mbcs/expenses"),
            },
          ],
        },
        {
          key: "mec",
          icon: <SolutionOutlined />,
          label: "MEC Module",
          disabled: !["SUPER_ADMIN", "DIRECTOR", "ACCOUNTANT_MEC"].includes(
            user?.role || "",
          ),
          children: [
            {
              key: "/mec/students",
              label: "Students",
              onClick: () => navigate("/mec/students"),
            },
            {
              key: "/mec/payments/record",
              icon: <DollarOutlined />,
              label: "Record Payment",
              onClick: () => navigate("/mec/payments/record"),
            },
            {
              key: "/mec/payments/collect-due",
              icon: <DollarOutlined />,
              label: "Collect Due",
              onClick: () => navigate("/mec/payments/collect-due"),
            },
            {
              key: "/mec/payment-history",
              icon: <HistoryOutlined />,
              label: "Payment History",
              onClick: () => navigate("/mec/payment-history"),
            },
            {
              key: "/mec/expenses",
              icon: <DollarOutlined />,
              label: "Expenses",
              onClick: () => navigate("/mec/expenses"),
            },
          ],
        },
      ],
    },
    {
      type: "group" as const,
      label: (
        <span
          className={`sidebar-section-label${collapsed ? " sidebar-section-label--hidden" : ""}`}
        >
          System
        </span>
      ),
      children: [
        {
          key: "/import-export",
          icon: <SwapOutlined />,
          label: "Import & Export",
          onClick: () => navigate("/import-export"),
        },
        ...(["SUPER_ADMIN", "DIRECTOR"].includes(user?.role || "")
          ? [
              {
                key: "/settings",
                icon: <SettingOutlined />,
                label: "Settings",
                onClick: () => navigate("/settings"),
              },
            ]
          : []),
      ],
    },
  ];

  const userMenuItems = [
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
      onClick: () => navigate("/settings"),
      disabled: !["SUPER_ADMIN", "DIRECTOR"].includes(user?.role || ""),
    },
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
      danger: true,
    },
  ];

  const initials = (user?.fullName || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f8" }}>
      {/* ══ SIDEBAR ══ */}
      <Sider
        width={SIDER_WIDTH}
        collapsedWidth={COLLAPSED_WIDTH}
        collapsed={collapsed}
        className="sidebar"
      >
        <div
          className={`sidebar-brand ${collapsed ? "sidebar-brand--collapsed" : ""}`}
        >
          <div className="sidebar-logo-mark">
            <span>U</span>
          </div>
          <div
            className={`sidebar-brand-text${collapsed ? " sidebar-brand-text--hidden" : ""}`}
          >
            <div className="sidebar-brand-name">Utsho</div>
            <div className="sidebar-brand-sub">Accounting System</div>
          </div>
        </div>

        <div className="sidebar-menu-wrap">
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            openKeys={currentOpenKeys}
            onOpenChange={(keys) => setCurrentOpenKeys(keys)}
            items={menuItems}
            inlineCollapsed={collapsed}
            className="sidebar-menu"
          />
        </div>
      </Sider>

      {/* ══ MAIN ══ */}
      <Layout style={{ overflow: "hidden", background: "#f0f2f8" }}>
        <Header className="topbar">
          <div className="topbar-left">
            <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={toggleCollapsed}
                className="topbar-icon-btn"
              />
            </Tooltip>

            <div
              className="header-search"
              onClick={() => searchRef.current?.focus()}
            >
              <SearchOutlined className="header-search-icon" />
              <input ref={searchRef} placeholder="Search…" />
            </div>
          </div>

          <div className="topbar-right">
            <Tooltip title="Notifications">
              <Badge count={0} dot>
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="topbar-icon-btn"
                />
              </Badge>
            </Tooltip>

            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <div className="user-card">
                <Avatar size={32} className="user-avatar">
                  {initials}
                </Avatar>
                <div className="user-info">
                  <div className="user-name">{user?.fullName}</div>
                  <div
                    className="user-role"
                    style={{ color: roleColor(user?.role) }}
                  >
                    {formatRole(user?.role)}
                  </div>
                </div>
                <DownOutlined className="user-chevron" />
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content className="page-content">
          <div className="page-inner">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
