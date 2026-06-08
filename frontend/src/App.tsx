import type { ReactNode } from "react";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { useNativeBackButton } from "./hooks/useNativeBackButton";
import AppLayout from "./layouts/AppLayout";
import { ProtectedRoute } from "./guards/ProtectedRoute";
import type { UserRole } from "./types/domain";
import { Skeleton } from "@/components/ui/skeleton";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const PlatformLoginPage = lazy(() => import("./pages/platform/PlatformLoginPage"));
const PlatformTenantsPage = lazy(() => import("./pages/platform/PlatformTenantsPage"));
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const AssetsPage = lazy(() => import("./pages/assets/AssetsPage"));
const AllocationsPage = lazy(() => import("./pages/allocations/AllocationsPage"));
const OperationsPage = lazy(() => import("./pages/operations/OperationsPage"));
const FuelLogsPage = lazy(() => import("./pages/fuel/FuelLogsPage"));
const MaintenancePage = lazy(() => import("./pages/maintenance/MaintenancePage"));
const LocationsPage = lazy(() => import("./pages/locations/LocationsPage"));
const UsersPage = lazy(() => import("./pages/users/UsersPage"));
const DriversPage = lazy(() => import("./pages/drivers/DriversPage"));
const InsurancePage = lazy(() => import("./pages/insurance/InsurancePage"));
const SuppliersPage = lazy(() => import("./pages/suppliers/SuppliersPage"));
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage"));
const ReportDetailPage = lazy(() => import("./pages/reports/ReportDetailPage"));
const NotificationsPage = lazy(() => import("./pages/notifications/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));

function PageLoader() {
  return (
    <div className="space-y-4 p-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function Private({ children, minRole = "driver" }: { children: ReactNode; minRole?: UserRole }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <ProtectedRoute minRole={minRole}>{children}</ProtectedRoute>;
}

function PlatformPrivate({ children }: { children: ReactNode }) {
  const platformToken = useAuthStore((s) => s.platformToken);
  if (!platformToken) return <Navigate to="/platform/login" replace />;
  return <>{children}</>;
}

export default function App() {
  useNativeBackButton();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Lazy>
            <LoginPage />
          </Lazy>
        }
      />
      <Route
        path="/platform/login"
        element={
          <Lazy>
            <PlatformLoginPage />
          </Lazy>
        }
      />
      <Route
        path="/platform"
        element={
          <PlatformPrivate>
            <AppLayout />
          </PlatformPrivate>
        }
      >
        <Route
          path="tenants"
          element={
            <Lazy>
              <PlatformTenantsPage />
            </Lazy>
          }
        />
      </Route>
      <Route
        path="/"
        element={
          <Private>
            <AppLayout />
          </Private>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <Lazy>
              <DashboardPage />
            </Lazy>
          }
        />
        <Route
          path="assets"
          element={
            <Lazy>
              <AssetsPage />
            </Lazy>
          }
        />
        <Route
          path="allocations"
          element={
            <Lazy>
              <AllocationsPage />
            </Lazy>
          }
        />
        <Route
          path="operations"
          element={
            <Private minRole="supervisor">
              <Lazy>
                <OperationsPage />
              </Lazy>
            </Private>
          }
        />
        <Route
          path="operations/fuel"
          element={
            <Private minRole="supervisor">
              <Lazy>
                <FuelLogsPage />
              </Lazy>
            </Private>
          }
        />
        <Route
          path="operations/maintenance"
          element={
            <Private minRole="manager">
              <Lazy>
                <MaintenancePage />
              </Lazy>
            </Private>
          }
        />
        <Route
          path="locations"
          element={
            <Private minRole="supervisor">
              <Lazy>
                <LocationsPage />
              </Lazy>
            </Private>
          }
        />
        <Route
          path="users"
          element={
            <Private minRole="admin">
              <Lazy>
                <UsersPage />
              </Lazy>
            </Private>
          }
        />
        <Route
          path="drivers"
          element={
            <Private minRole="supervisor">
              <Lazy>
                <DriversPage />
              </Lazy>
            </Private>
          }
        />
        <Route
          path="insurance"
          element={
            <Private minRole="manager">
              <Lazy>
                <InsurancePage />
              </Lazy>
            </Private>
          }
        />
        <Route
          path="suppliers"
          element={
            <Private minRole="manager">
              <Lazy>
                <SuppliersPage />
              </Lazy>
            </Private>
          }
        />
        <Route
          path="reports"
          element={
            <Private minRole="supervisor">
              <Lazy>
                <ReportsPage />
              </Lazy>
            </Private>
          }
        />
        <Route
          path="reports/:type"
          element={
            <Private minRole="supervisor">
              <Lazy>
                <ReportDetailPage />
              </Lazy>
            </Private>
          }
        />
        <Route
          path="notifications"
          element={
            <Lazy>
              <NotificationsPage />
            </Lazy>
          }
        />
        <Route
          path="settings"
          element={
            <Private minRole="admin">
              <Lazy>
                <SettingsPage />
              </Lazy>
            </Private>
          }
        />
      </Route>
    </Routes>
  );
}
