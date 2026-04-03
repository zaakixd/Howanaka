import { createContext, useContext, ReactNode } from "react";
import { useGetMe, DiscordUser } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";

interface AuthContextType {
  user: DiscordUser | null;
  isLoading: boolean;
  isError: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isError: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  });

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, isError }}>
      {isLoading ? (
        <div className="min-h-[100dvh] flex items-center justify-center bg-background">
          <Spinner className="w-8 h-8 text-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
