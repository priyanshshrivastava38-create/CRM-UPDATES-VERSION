import { requireUser } from "@/lib/auth";
import { CRMApp } from "@/components/crm-app";

export default async function Home() {
  await requireUser();
  return <CRMApp />;
}
