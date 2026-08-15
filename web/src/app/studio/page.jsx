import { redirect } from "next/navigation";
import { auth } from "../../auth";
import StudioWorkspace from "./studio-workspace";

export default async function StudioPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login?callbackUrl=%2Fstudio");
  return <StudioWorkspace />;
}
