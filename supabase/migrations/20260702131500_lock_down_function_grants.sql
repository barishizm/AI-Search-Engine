-- Trigger/event-trigger functions must not be callable through the Data API.
-- (Applied to project kvrpxrsvwwrqcvloupup via Supabase MCP on 2026-07-02.)
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.touch_conversation() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
