import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    
    const { error } = await supabase.rpc("sync_all_global_stats");
    
    setIsSyncing(false);

    if (error) {
      console.error("Sync Error:", error);
      alert("Failed to sync stats. Check console for details.");
    } else {
      alert("Global stats successfully synced from all completed matches!");
    }
  };

  return (
    <button 
      onClick={handleSync} 
      disabled={isSyncing}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
    >
      {isSyncing ? "Syncing Stats..." : "Sync All Global Stats"}
    </button>
  );
}