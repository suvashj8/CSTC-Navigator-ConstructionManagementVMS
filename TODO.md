# TODO - Backend improvements (web / Next / Node)

## Step 1: Correctness / robustness
- [x] Locate and fix tenantLogin/platformLogin error encoding (â€” -> —) to prevent garbled messages.
- [x] Make role-error responses consistent in handleApiV1WithContext (switch roleErrorMode from withCors -> finalizeApiResponse).

## Step 2: Performance
- [x] Remove N+1 writes in createAllocation by switching to transactional/batched insert.

## Step 3: Report job latency
- [x] Make createReportJob return immediately (do not await runReportSync); run report generation in background safely.

## Step 4: Security hardening
- [x] Restrict export_format to an allowlist when creating report jobs.

## Step 5: Validation
- [x] Run typecheck/lint/tests and verify endpoints compile.
