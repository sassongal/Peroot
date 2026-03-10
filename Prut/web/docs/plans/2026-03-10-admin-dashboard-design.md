# Admin Dashboard Pro - Design Document

## Overview
Upgrade the existing admin dashboard with a professional KPI-driven overview, API cost tracking system, and enhanced user management with full detail views.

## Architecture

### New Database Tables
1. **api_usage_logs** - Auto-tracked LLM usage per request
2. **manual_costs** - Admin-entered monthly service costs

### New/Modified Pages
1. `/admin` (page.tsx) - Complete rewrite as KPI overview dashboard
2. `/admin/costs` - New cost tracking & analysis page
3. `/admin/users` - Enhanced with user detail drawer
4. `/admin/users/[id]` - Full user detail page

### New API Routes
1. `GET /api/admin/dashboard` - Aggregated KPIs
2. `GET /api/admin/costs` - Cost data with date filtering
3. `POST /api/admin/costs/manual` - Manual cost entry
4. `GET /api/admin/users/[id]` - Full user detail
5. `POST /api/admin/users/[id]/actions` - Admin actions on user

### Instrumentation
- Wrap AIGateway.generateStream() with usage tracking to api_usage_logs

### Security
- Fix AdminGuard temporary bypass
- All routes use validateAdminSession()
- All actions audit-logged
