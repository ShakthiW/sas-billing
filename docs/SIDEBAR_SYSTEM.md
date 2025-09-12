# Sidebar and Layout System Documentation

## Overview

The SAS Billing System now includes an improved sidebar with icons, collapsible functionality, and consistent page integration.

## Features

### 1. **Icon Support**

- All navigation items now have appropriate Lucide React icons
- Icons are displayed in both expanded and collapsed states
- Consistent icon sizing and spacing

### 2. **Sidebar Structure**

#### Main Navigation Groups:

- **Job Dashboard** (Briefcase icon)

  - Active Job List (Clock icon)
  - Finished Job List (CheckCircle icon)
  - Delivered Job List (Truck icon)

- **Billing Management** (FileText icon)

  - Draft Bills (FileText icon)
  - Credit Bills (Receipt icon)
  - Payment Records (DollarSign icon)

- **Approvals** (UserCheck icon)

  - My Requests (UserCheck icon)
  - Approval Management (Shield icon) - Managers/Admins only

- **Backlog** (Archive icon)

  - Job List (Archive icon)

- **History** (History icon) - Based on permissions

  - Delivered Job List (Truck icon)
  - Invoices (Receipt icon)
  - Bank Details (CreditCard icon) - Interactive dialog
  - Monthly Report (BarChart3 icon)

- **Admin Tools** (Settings icon) - Admin only
  - User Management (Users icon)
  - Recycle Bin (Trash2 icon)
  - Audit Logs (Eye icon)

### 3. **DashboardLayout Component**

A new wrapper component for consistent page layout:

```tsx
import { DashboardLayout } from "@/components/DashboardLayout";

export default function MyPage() {
  return (
    <DashboardLayout
      title="Page Title"
      breadcrumbs={[
        { label: "Section", href: "/dashboard/section" },
        { label: "Current Page" },
      ]}
    >
      {/* Your page content */}
    </DashboardLayout>
  );
}
```

### 4. **Sidebar Components**

Three sidebar variants are available:

- `app-sidebar.tsx` - Main production sidebar
- `app-sidebar-new.tsx` - Updated variant
- `app-sidebar-old.tsx` - Legacy variant

All include the same icon and collapsible functionality.

## Usage Guidelines

### For New Pages

1. **Use DashboardLayout wrapper:**

```tsx
"use client";

import { DashboardLayout } from "@/components/DashboardLayout";

export default function NewPage() {
  return (
    <DashboardLayout
      title="New Page"
      breadcrumbs={[
        { label: "Section", href: "/dashboard/section" },
        { label: "New Page" },
      ]}
    >
      <div className="space-y-4">{/* Your page content here */}</div>
    </DashboardLayout>
  );
}
```

2. **For pages without DashboardLayout:**

```tsx
"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function CustomPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b sticky top-0 bg-white z-50">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            {/* Header content */}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Page content */}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### For Existing Pages

Update existing dashboard pages to use the DashboardLayout component instead of manually implementing sidebar integration.

**Before:**

```tsx
// Complex manual sidebar setup
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>{/* Repeated header code */}</SidebarInset>
</SidebarProvider>
```

**After:**

```tsx
<DashboardLayout title="Page Title">{/* Just your content */}</DashboardLayout>
```

## Benefits

1. **Consistency**: All pages have the same layout structure
2. **Maintainability**: Changes to header/sidebar affect all pages
3. **User Experience**: Better navigation with clear visual hierarchy
4. **Accessibility**: Proper ARIA labels and keyboard navigation
5. **Responsive**: Works well on mobile and desktop

## Bank Details Integration

The Bank Details feature is integrated into the sidebar under History > Bank Details. It opens a dialog with:

- Account management
- Balance editing with audit trails
- Transaction history viewing
- Real-time balance updates

## Customization

### Adding New Icons

1. Import from Lucide React:

```tsx
import { NewIcon } from "lucide-react";
```

2. Add to navigation structure:

```tsx
{
  title: "New Section",
  url: "/dashboard/new",
  icon: NewIcon,
}
```

### Modifying Permissions

Navigation items are dynamically generated based on user roles and permissions:

- `role`: 'admin', 'manager', 'staff'
- `permissions.canAccessHistory`: Boolean for history access

## Troubleshooting

### Common Issues

1. **Missing Sidebar**: Ensure page is wrapped with SidebarProvider
2. **Overlapping Content**: Use proper SidebarInset container
3. **Icons Not Showing**: Check Lucide React import and icon name
4. **Permission Issues**: Verify user role and permissions in useUserPermissions hook

### Layout Problems

If content overlaps with sidebar:

1. Ensure using SidebarInset wrapper
2. Check for conflicting CSS positioning
3. Verify z-index values for sticky headers

## Future Enhancements

Planned improvements:

- Keyboard shortcuts for navigation
- Collapsible sidebar state persistence
- Custom theme support
- Advanced permission-based rendering
