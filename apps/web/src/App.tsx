import { useEffect } from "react";
import { StatusBar } from "./components/StatusBar.js";
import { IncidentSignalsSidebar } from "./components/IncidentSignalsSidebar.js";
import { MapPlaceholder } from "./components/MapPlaceholder.js";
import { IntelligencePanel } from "./components/IntelligencePanel.js";
import { AgentActivityTimeline } from "./components/AgentActivityTimeline.js";
import { PlanComparisonPanel } from "./components/PlanComparisonPanel.js";
import { ApprovalDrawer } from "./components/ApprovalDrawer.js";
import { useCommandCenterStore } from "./state/store.js";

export function App() {
  const loadAll = useCommandCenterStore((s) => s.loadAll);
  const errorMessage = useCommandCenterStore((s) => s.errorMessage);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="command-center">
      <StatusBar />
      {errorMessage && <div className="error-banner">{errorMessage}</div>}
      <div className="command-center__body">
        <IncidentSignalsSidebar />
        <main className="command-center__main">
          <MapPlaceholder />
          <PlanComparisonPanel />
        </main>
        <div className="command-center__right">
          <IntelligencePanel />
          <ApprovalDrawer />
          <AgentActivityTimeline />
        </div>
      </div>
    </div>
  );
}
