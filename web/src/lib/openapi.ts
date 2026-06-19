import { OpenApiGeneratorV3, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

import { AssetCreateSchema, AssetUpdateSchema, AssetResponseSchema, AssetListQuerySchema, AssetListResponseSchema } from "./schemas/assets";
import { AllocationCreateSchema, AllocationTransitionSchema, AllocationResponseSchema, AllocationListQuerySchema, AllocationListResponseSchema } from "./schemas/allocations";
import { FuelLogCreateSchema, FuelLogUpdateSchema, FuelLogResponseSchema, FuelLogListQuerySchema, FuelLogListResponseSchema } from "./schemas/fuel";
import { MaintenanceCreateSchema, MaintenanceUpdateSchema, MaintenanceResponseSchema, MaintenanceListQuerySchema, MaintenanceListResponseSchema } from "./schemas/maintenance";
import { TenantLoginSchema, PlatformLoginSchema, RefreshTokenSchema, LogoutSchema, TokenResponseSchema } from "./schemas/auth";

const registry = new OpenAPIRegistry();

registry.register("AssetCreate", AssetCreateSchema);
registry.register("AssetUpdate", AssetUpdateSchema);
registry.register("AssetResponse", AssetResponseSchema);
registry.register("AssetListQuery", AssetListQuerySchema);
registry.register("AssetListResponse", AssetListResponseSchema);

registry.register("AllocationCreate", AllocationCreateSchema);
registry.register("AllocationTransition", AllocationTransitionSchema);
registry.register("AllocationResponse", AllocationResponseSchema);
registry.register("AllocationListQuery", AllocationListQuerySchema);
registry.register("AllocationListResponse", AllocationListResponseSchema);

registry.register("FuelLogCreate", FuelLogCreateSchema);
registry.register("FuelLogUpdate", FuelLogUpdateSchema);
registry.register("FuelLogResponse", FuelLogResponseSchema);
registry.register("FuelLogListQuery", FuelLogListQuerySchema);
registry.register("FuelLogListResponse", FuelLogListResponseSchema);

registry.register("MaintenanceCreate", MaintenanceCreateSchema);
registry.register("MaintenanceUpdate", MaintenanceUpdateSchema);
registry.register("MaintenanceResponse", MaintenanceResponseSchema);
registry.register("MaintenanceListQuery", MaintenanceListQuerySchema);
registry.register("MaintenanceListResponse", MaintenanceListResponseSchema);

registry.register("TenantLogin", TenantLoginSchema);
registry.register("PlatformLogin", PlatformLoginSchema);
registry.register("RefreshToken", RefreshTokenSchema);
registry.register("Logout", LogoutSchema);
registry.register("TokenResponse", TokenResponseSchema);

registry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const generator = new OpenApiGeneratorV3(registry.definitions);

export function generateOpenApiSpec(): string {
  const spec = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Navigator VMS API",
      version: "1.0.0",
      description: "Vehicle Management System API",
    },
    servers: [
      { url: "/api/v1", description: "Current API version" },
    ],
    security: [{ BearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Assets", description: "Asset management" },
      { name: "Allocations", description: "Asset allocation management" },
      { name: "Fuel", description: "Fuel log management" },
      { name: "Maintenance", description: "Maintenance job management" },
    ],
  });

  return JSON.stringify(spec, null, 2);
}

export const openApiRegistry = registry;