import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { ChatApp } from "@/components/chat-app";

export default async function StudioPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login?callbackUrl=%2Fstudio");
  return <ChatApp />;
}
