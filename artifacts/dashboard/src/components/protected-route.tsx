import { useAuth } from "@/components/auth-provider";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isError } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      setLocation("/");
    }
  }, [user, isLoading, isError, setLocation]);

  if (isLoading) {
    return null;
  }

  if (isError || !user) {
    return null;
  }

  return <>{children}</>;
}
