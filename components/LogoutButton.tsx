import { signOut } from "@/auth";

// Server-action logout — no client session context needed.
export function LogoutButton({ label }: { label: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-sand px-3 py-1 text-sm text-ink/70 hover:bg-brand/10"
      >
        {label}
      </button>
    </form>
  );
}
