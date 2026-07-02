import { ChatApp } from "@/components/chat/chat-app";
import { Landing } from "@/components/landing";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    return <Landing />;
  }

  return (
    <ChatApp
      user={{
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : null,
      }}
    />
  );
}
