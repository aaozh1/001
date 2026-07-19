import { handlers } from "@/auth";

// Auth.js catch-all: powers login (signIn), logout (signOut), session, CSRF.
export const { GET, POST } = handlers;
