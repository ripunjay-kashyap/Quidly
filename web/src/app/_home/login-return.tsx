"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { Icon } from "@/lib/icons";
import { takeReturnPath } from "@/lib/login";
import { useSession } from "@/lib/use-session";

const noSubscription = () => () => {};

// PayPal returns every login to the home page. This sends the person back to where they
// started, or shows why the login failed.
export function LoginReturn() {
  const { user } = useSession();
  const router = useRouter();
  const failed = useSyncExternalStore(
    noSubscription,
    () => new URLSearchParams(window.location.search).get("login") === "failed",
    () => false,
  );

  useEffect(() => {
    if (failed) takeReturnPath();
  }, [failed]);

  useEffect(() => {
    if (!user) return;
    const path = takeReturnPath();
    if (path && path !== "/") router.replace(path);
  }, [user, router]);

  if (!failed) return null;
  return (
    <div className="container-page pt-6">
      <div role="alert" className="notice notice-danger">
        <Icon name="alert" size={18} className="mt-px shrink-0" />
        PayPal login didn&apos;t finish. Please try again.
      </div>
    </div>
  );
}
