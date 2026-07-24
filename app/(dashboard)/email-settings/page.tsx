"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function EmailSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new unified settings page with the email tab selected
    router.replace("/settings?tab=email");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">
        Moving to Unified Settings Hub...
      </p>
    </div>
  );
}
