"use client";

import { useState } from "react";
import strings from "@/components/i18n/ar";
import Pipeline from "../pipeline/Pipeline";
import AIAnalysis from "./AIAnalysis";
import Activities from "./Activities";
import Tasks from "./Tasks";
import Details from "./Details";

const tabs = [
  { id: "pipeline", label: strings.tabPipeline },
  { id: "ai", label: strings.tabAI },
  { id: "activities", label: strings.tabActivities },
  { id: "tasks", label: strings.tabTasks },
  { id: "details", label: strings.tabDetails },
];

export default function LeadsTabs() {
  const [active, setActive] = useState("pipeline");

  return (
    <div className="leads-page p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-[#94A3B8]">{strings.appName}</div>
          <h1 className="leads-title">{strings.crmTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
          <input placeholder={strings.globalSearchPlaceholder} className="px-3 py-2 rounded-md bg-[#042A44] border border-[rgba(14,165,233,0.12)] text-white" />
          <button className="btn-primary">{strings.searchButton}</button>
        </div>
      </div>

      <div className="tabs-row flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`tab-btn ${active === t.id ? "tab-active" : "tab-inactive"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-area">
        {active === "pipeline" && <Pipeline />}
        {active === "ai" && <AIAnalysis />}
        {active === "activities" && <Activities />}
        {active === "tasks" && <Tasks />}
        {active === "details" && <Details />}
      </div>
    </div>
  );
}
