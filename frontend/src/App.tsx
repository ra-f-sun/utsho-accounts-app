import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntApp } from "antd";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentsList from "./pages/uac/students/StudentsList";
import AddStudent from "./pages/uac/students/AddStudent";
import StudentPaymentHistory from "./pages/uac/students/StudentPaymentHistory";
import TeachersList from "./pages/uac/teachers/TeachersList";
import AddTeacher from "./pages/uac/teachers/AddTeacher";
import TeacherPayrollHistory from "./pages/uac/teachers/TeacherPayrollHistory";
import StaffList from "./pages/uac/staff/StaffList";
import AddStaff from "./pages/uac/staff/AddStaff";
import PaymentsList from "./pages/uac/payments/PaymentsList";
import RecordPayment from "./pages/uac/payments/RecordPayment";
import PaymentInvoice from "./pages/uac/payments/PaymentInvoice";
import UacPaymentHistory from "./pages/uac/payments/UacPaymentHistory";
import ExpensesList from "./pages/expenses/ExpensesList";
import AddExpense from "./pages/expenses/AddExpense";
import PayrollList from "./pages/uac/payroll/PayrollList";
import CreatePayroll from "./pages/uac/payroll/CreatePayroll";
import PayrollInvoice from "./pages/uac/payroll/PayrollInvoice";
import MbcsStudentsList from "./pages/mbcs/students/MbcsStudentsList";
import AddMbcsStudent from "./pages/mbcs/students/AddMbcsStudent";
import MbcsStudentPaymentHistory from "./pages/mbcs/students/MbcsStudentPaymentHistory";
import MbcsTeachersList from "./pages/mbcs/teachers/MbcsTeachersList";
import AddMbcsTeacher from "./pages/mbcs/teachers/AddMbcsTeacher";
import MbcsTeacherPayrollHistory from "./pages/mbcs/teachers/MbcsTeacherPayrollHistory";
import MbcsStaffList from "./pages/mbcs/staff/MbcsStaffList";
import AddMbcsStaff from "./pages/mbcs/staff/AddMbcsStaff";
import MbcsPaymentsList from "./pages/mbcs/payments/MbcsPaymentsList";
import MbcsRecordPayment from "./pages/mbcs/payments/MbcsRecordPayment";
import MbcsPaymentInvoice from "./pages/mbcs/payments/MbcsPaymentInvoice";
import MbcsPaymentHistory from "./pages/mbcs/payments/MbcsPaymentHistory";
import MbcsPayrollList from "./pages/mbcs/payroll/MbcsPayrollList";
import MbcsCreatePayroll from "./pages/mbcs/payroll/MbcsCreatePayroll";
import MbcsPayrollInvoice from "./pages/mbcs/payroll/MbcsPayrollInvoice";
import TeacherAttendanceList from "./pages/uac/teacher-attendance/TeacherAttendanceList";
import AddTeacherAttendance from "./pages/uac/teacher-attendance/AddTeacherAttendance";
import MbcsTeacherAttendanceList from "./pages/mbcs/teacher-attendance/MbcsTeacherAttendanceList";
import AddMbcsTeacherAttendance from "./pages/mbcs/teacher-attendance/AddMbcsTeacherAttendance";
import MecStudentsList from "./pages/mec/students/MecStudentsList";
import AddMecStudent from "./pages/mec/students/AddMecStudent";
import MecStudentPaymentHistory from "./pages/mec/students/MecStudentPaymentHistory";
import MecRecordPayment from "./pages/mec/payments/MecRecordPayment";
import MecPaymentInvoice from "./pages/mec/payments/MecPaymentInvoice";
import MecPaymentHistory from "./pages/mec/payments/MecPaymentHistory";
import UsersList from "./pages/users/UsersList";
import AddUser from "./pages/users/AddUser";
import ErrorBoundary from "./components/ErrorBoundary";

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
          <ErrorBoundary>
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
                {/* Users Routes */}
                <Route path="users" element={<UsersList />} />
                <Route path="users/add" element={<AddUser />} />
                <Route path="users/edit/:id" element={<AddUser />} />
                {/* UAC Students Routes */}
                <Route path="uac/students" element={<StudentsList />} />
                <Route path="uac/students/add" element={<AddStudent />} />
                <Route path="uac/students/edit/:id" element={<AddStudent />} />
                <Route
                  path="uac/students/:id/payments"
                  element={<StudentPaymentHistory />}
                />
                {/* UAC Teachers Routes */}
                <Route path="uac/teachers" element={<TeachersList />} />
                <Route path="uac/teachers/add" element={<AddTeacher />} />
                <Route path="uac/teachers/edit/:id" element={<AddTeacher />} />
                <Route
                  path="uac/teachers/:id/payroll"
                  element={<TeacherPayrollHistory />}
                />
                {/* UAC Staff Routes */}
                <Route path="uac/staff" element={<StaffList />} />
                <Route path="uac/staff/add" element={<AddStaff />} />
                <Route path="uac/staff/edit/:id" element={<AddStaff />} />
                {/* UAC Payments Routes */}
                <Route path="uac/payments" element={<PaymentsList />} />
                <Route path="uac/payments/record" element={<RecordPayment />} />
                <Route
                  path="uac/payments/:id/invoice"
                  element={<PaymentInvoice />}
                />
                <Route
                  path="uac/payment-history"
                  element={<UacPaymentHistory />}
                />
                {/* Shared Expenses Routes */}
                <Route path="expenses" element={<ExpensesList />} />
                <Route path="expenses/add" element={<AddExpense />} />
                <Route path="expenses/edit/:id" element={<AddExpense />} />
                {/* UAC Teacher Attendance Routes */}
                <Route
                  path="uac/teacher-attendance"
                  element={<TeacherAttendanceList />}
                />
                <Route
                  path="uac/teacher-attendance/add"
                  element={<AddTeacherAttendance />}
                />
                {/* UAC Payroll Routes */}
                <Route path="uac/payroll" element={<PayrollList />} />
                <Route path="uac/payroll/create" element={<CreatePayroll />} />
                <Route
                  path="uac/payroll/:id/invoice"
                  element={<PayrollInvoice />}
                />
                {/* MBCS Students Routes */}
                <Route path="mbcs/students" element={<MbcsStudentsList />} />
                <Route path="mbcs/students/add" element={<AddMbcsStudent />} />
                <Route
                  path="mbcs/students/edit/:id"
                  element={<AddMbcsStudent />}
                />
                <Route
                  path="mbcs/students/:id/payments"
                  element={<MbcsStudentPaymentHistory />}
                />
                <Route path="mbcs/teachers" element={<MbcsTeachersList />} />
                <Route path="mbcs/teachers/add" element={<AddMbcsTeacher />} />
                <Route
                  path="mbcs/teachers/edit/:id"
                  element={<AddMbcsTeacher />}
                />
                <Route
                  path="mbcs/teachers/:id/payroll"
                  element={<MbcsTeacherPayrollHistory />}
                />
                <Route path="mbcs/staff" element={<MbcsStaffList />} />
                <Route path="mbcs/staff/add" element={<AddMbcsStaff />} />
                <Route path="mbcs/staff/edit/:id" element={<AddMbcsStaff />} />
                {/* MBCS Payments Routes */}
                <Route path="mbcs/payments" element={<MbcsPaymentsList />} />
                <Route
                  path="mbcs/payments/record"
                  element={<MbcsRecordPayment />}
                />
                <Route
                  path="mbcs/payments/:id/invoice"
                  element={<MbcsPaymentInvoice />}
                />
                <Route
                  path="mbcs/payment-history"
                  element={<MbcsPaymentHistory />}
                />
                {/* MBCS Teacher Attendance Routes */}
                <Route
                  path="mbcs/teacher-attendance"
                  element={<MbcsTeacherAttendanceList />}
                />
                <Route
                  path="mbcs/teacher-attendance/add"
                  element={<AddMbcsTeacherAttendance />}
                />
                {/* MBCS Payroll Routes */}
                <Route path="mbcs/payroll" element={<MbcsPayrollList />} />
                <Route
                  path="mbcs/payroll/create"
                  element={<MbcsCreatePayroll />}
                />
                <Route
                  path="mbcs/payroll/:id/invoice"
                  element={<MbcsPayrollInvoice />}
                />
                {/* MEC Students Routes */}
                <Route path="mec/students" element={<MecStudentsList />} />
                <Route path="mec/students/add" element={<AddMecStudent />} />
                <Route
                  path="mec/students/edit/:id"
                  element={<AddMecStudent />}
                />
                <Route
                  path="mec/students/:id/payments"
                  element={<MecStudentPaymentHistory />}
                />
                {/* MEC Payments Routes */}
                <Route
                  path="mec/payments/record"
                  element={<MecRecordPayment />}
                />
                <Route
                  path="mec/payments/:id/invoice"
                  element={<MecPaymentInvoice />}
                />
                <Route
                  path="mec/payment-history"
                  element={<MecPaymentHistory />}
                />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
