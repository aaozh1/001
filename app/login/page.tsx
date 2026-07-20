import { Suspense } from "react";
import { AuthShell } from "../_components/auth-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthShell>
      {/* Suspense: LoginForm reads useSearchParams (callbackUrl deep link). */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
