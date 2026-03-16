import { redirect } from "next/navigation";

// Developer portal is currently disabled
export default function DeveloperPage() {
  redirect("/");
}
