import type { Metadata } from "next";
import { MaintenancePage } from "@/components/MaintenanceMode";

export const metadata: Metadata = {
  title: "תחזוקה",
  robots: { index: false, follow: false },
};

export default function Maintenance() {
  return <MaintenancePage />;
}
