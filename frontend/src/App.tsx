import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntApp } from "antd";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentsList from "./pages/uac/students/StudentsList";
import AddStudent from "./pages/uac/students/AddStudent";
import TeachersList from "./pages/uac/teachers/TeachersList";
import AddTeacher from "./pages/uac/teachers/AddTeacher";
import StaffList from "./pages/uac/staff/StaffList";
import AddStaff from "./pages/uac/staff/AddStaff";
import PaymentsList from "./pages/uac/payments/PaymentsList";
import RecordPayment from "./pages/uac/payments/RecordPayment";
import ExpensesList from "./pages/expenses/ExpensesList";
import AddExpense from "./pages/expenses/AddExpense";
import PayrollList from "./pages/uac/payroll/PayrollList";
import CreatePayroll from "./pages/uac/payroll/CreatePayroll";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#667eea",
          },
        }}
      >
        <AntApp>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route
                  path="users"
                  element={<div>Users Page (Coming Soon)</div>}
                />
                {/* UAC Students Routes */}
                <Route path="uac/students" element={<StudentsList />} />
                <Route path="uac/students/add" element={<AddStudent />} />
                <Route path="uac/students/edit/:id" element={<AddStudent />} />
                {/* UAC Teachers Routes */}
                <Route path="uac/teachers" element={<TeachersList />} />
                <Route path="uac/teachers/add" element={<AddTeacher />} />
                <Route path="uac/teachers/edit/:id" element={<AddTeacher />} />
                {/* UAC Staff Routes */}
                <Route path="uac/staff" element={<StaffList />} />
                <Route path="uac/staff/add" element={<AddStaff />} />
                <Route path="uac/staff/edit/:id" element={<AddStaff />} />
                {/* UAC Payments Routes */}
                <Route path="uac/payments" element={<PaymentsList />} />
                <Route path="uac/payments/record" element={<RecordPayment />} />
                {/* Shared Expenses Routes */}
                <Route path="expenses" element={<ExpensesList />} />
                <Route path="expenses/add" element={<AddExpense />} />
                <Route path="expenses/edit/:id" element={<AddExpense />} />
                {/* UAC Payroll Routes */}
                <Route path="uac/payroll" element={<PayrollList />} />
                <Route path="uac/payroll/create" element={<CreatePayroll />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
