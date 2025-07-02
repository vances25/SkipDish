import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export function useAuthGuard(requiredRole?: string) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    const checkAuth = async () => {
      let token = localStorage.getItem("token");

      const tryDecode = (t: string) => {
        try {
          return jwtDecode<any>(t);
        } catch {
          return null;
        }
      };

      const validateRole = (decoded: any) => {
        if (!requiredRole) return true;
        return decoded?.role === requiredRole;
      };

      const verifyOrRedirect = (t: string) => {
        const decoded = tryDecode(t);
        if (!decoded) {
          router.push("/login");
          return;
        }

        if (!validateRole(decoded)) {
          router.push("/unauthorized");
          return;
        }

        setIsVerified(true); // ✅ Good session & role
      };

      let triedRefresh = false;

      const tryCheck = async (token: string) => {
        const res = await fetch(`${BACKEND_URL}/check-verify-status`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.detail === "connect") {
            router.push("/verify");
            return false;
          }
          verifyOrRedirect(token);
          return true;
        }

        return false;
      };

      if (token) {
        const valid = await tryCheck(token);
        if (valid) return;
      }

      try {
        const refreshRes = await fetch(`${BACKEND_URL}/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          const newToken = data.access_token;
          // Check token exists and is a valid JWT (three segments separated by '.')
          if (newToken && typeof newToken === "string" && newToken.split(".").length === 3) {
            localStorage.setItem("token", newToken);
            const valid = await tryCheck(newToken);
            if (valid) return;
          }
        }

        // Only redirect if refresh fetch exists but fails
        router.push("/login");
      } catch {
        // Also redirect if refresh throws
        router.push("/login");
      }
    };

    checkAuth();
  }, [router, requiredRole]);

  return isVerified;
}