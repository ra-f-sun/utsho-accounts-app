import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

interface Props {
  allowedRoles: string[];
}

export default function RoleProtectedRoute({ allowedRoles }: Props) {
  const user = useAuthStore((s) => s.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
