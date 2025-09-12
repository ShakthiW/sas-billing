"use client";

import TableView from "@/components/TableView";
import { DashboardLayout } from "@/components/DashboardLayout";

export default function TableViewPage() {
    return (
        <DashboardLayout
            title="Job Table View"
            breadcrumbs={[{ label: "Table View" }]}
        >
            <TableView />
        </DashboardLayout>
    );
}
