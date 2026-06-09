export type UserRole =
  | "super_user"
  | "admin"
  | "manager"
  | "supervisor"
  | "employee"
  | "driver";

export type BuiltinAssetType = "vehicle" | "equipment" | "tool";
/** Built-in keys or tenant-defined custom type name stored on assets. */
export type AssetType = BuiltinAssetType | (string & {});
export type AssetStatus = "available" | "active" | "in_repair" | "in_transit" | "decommissioned";
export type BuiltinOwnershipType = "owned" | "leased" | "rented";
export type OwnershipType = BuiltinOwnershipType | (string & {});
export type AllocState = "pending" | "approved" | "in_transit" | "active" | "released" | "cancelled";
export type BuiltinCoverageType = "comprehensive" | "third_party" | "fire_theft" | "liability";
export type CoverageType = BuiltinCoverageType | (string & {});
export type BuiltinSupplierCategory = "repair" | "parts" | "fuel" | "rental" | "other";
export type SupplierCategory = BuiltinSupplierCategory | (string & {});

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  location_ids: string[];
  tenant_id?: string;
  tenant_name?: string;
};

export type WorkLocation = {
  id: string;
  name: string;
  type: string;
  address: string;
  manager_id: string | null;
  manager_name?: string;
  latitude?: number;
  longitude?: number;
  is_custom: boolean;
};

export type Asset = {
  id: string;
  asset_type: AssetType;
  reg_serial_no: string;
  make: string;
  model: string;
  year: number;
  ownership_type: OwnershipType;
  status: AssetStatus;
  location_id: string;
  location_name?: string;
  vehicle_category?: string | null;
  department?: string | null;
  rta_office?: string | null;
  alert_cell_number?: string | null;
  registration_date?: string | null;
  bluebook_no?: string | null;
  bluebook_issued_at?: string | null;
  bluebook_expires_at?: string | null;
  operation_mode?: "km" | "hour" | "custom" | null;
  operation_mode_label?: string | null;
  operation_custom_fields?: Record<string, string> | null;
  route_from?: string | null;
  route_to?: string | null;
  operation_km?: number | null;
  operation_place?: string | null;
  operation_hours?: number | null;
  operation_minutes?: number | null;
  assigned_driver_id?: string | null;
  assigned_driver_name?: string | null;
};

export type AllocationReceiverRole = "manager" | "employee" | "supervisor" | "other";

export type Allocation = {
  id: string;
  group_id?: string | null;
  asset_id: string;
  asset_label?: string;
  from_location_id: string;
  from_location_name?: string;
  to_location_id: string;
  to_location_name?: string;
  driver_id?: string | null;
  driver_name?: string | null;
  external_driver_name?: string | null;
  external_driver_contact?: string | null;
  receiver_user_id?: string | null;
  receiver_role?: AllocationReceiverRole | null;
  receiver_name?: string | null;
  receiver_contact?: string | null;
  approved_by?: string | null;
  state: AllocState;
  start_date: string;
  expected_return: string;
  actual_return?: string | null;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  location_id: string | null;
  location_name?: string;
};

export type DriverProfile = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  license_no: string;
  license_class: string;
  issue_date: string;
  expiry_date: string;
  endorsements?: string;
  contact_phone?: string;
  status: "valid" | "expiring" | "expired";
};

export type InsurancePolicy = {
  id: string;
  asset_id: string;
  asset_label?: string;
  policy_no: string;
  insurer_name: string;
  coverage_type: CoverageType;
  insured_value: number;
  premium_amount: number;
  start_date: string;
  expiry_date: string;
  status: "active" | "expired" | "expiring" | (string & {});
};

export type Supplier = {
  id: string;
  name: string;
  category: SupplierCategory;
  contact_name: string;
  email: string;
  phone: string;
  rating: number;
  is_preferred: boolean;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  channel: "email" | "sms" | "in_app";
  sent_at: string;
  status: "sent" | "failed" | "pending";
  read: boolean;
};

export type DashboardStats = {
  total_assets: number;
  active_allocations: number;
  pending_approvals: number;
  expiring_insurance: number;
  expiring_licenses: number;
  overdue_returns: number;
};

export type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  per_page: number;
};

export type FuelLog = {
  id: string;
  asset_id: string;
  asset_label?: string;
  supplier_id?: string | null;
  supplier_name?: string;
  fueled_at: string;
  odometer_km?: number | null;
  liters?: number | null;
  total_cost?: number | null;
  notes?: string;
};

export type MaintenanceStatus = "Scheduled" | "In progress" | "Completed";

export type MaintenanceJob = {
  id: string;
  asset_id: string;
  asset_label?: string;
  supplier_id?: string | null;
  supplier_name?: string;
  scheduled_at?: string | null;
  completed_at?: string | null;
  status: MaintenanceStatus | string;
  description?: string;
  parts_cost?: number | null;
  labor_cost?: number | null;
  odometer_at_service?: number | null;
  notes?: string;
};
