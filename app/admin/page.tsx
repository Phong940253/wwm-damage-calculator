"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { SkillModal } from "./components/SkillModal";
import { PassiveSkillModal } from "./components/PassiveSkillModal";
import { InnerWayModal } from "./components/InnerWayModal";
import { MartialArtModal } from "./components/MartialArtModal";
import { DefaultRotationModal } from "./components/DefaultRotationModal";

export default function AdminPage() {
  const [secretKey, setSecretKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dataKey, setDataKey] = useState("skills");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [showRawJson, setShowRawJson] = useState(false);
  const [rawJsonText, setRawJsonText] = useState("");

  // Modal states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [isPassiveModalOpen, setIsPassiveModalOpen] = useState(false);
  const [isInnerWayModalOpen, setIsInnerWayModalOpen] = useState(false);
  const [isMartialArtModalOpen, setIsMartialArtModalOpen] = useState(false);
  const [isDefaultRotationModalOpen, setIsDefaultRotationModalOpen] = useState(false);
  
  useEffect(() => {
    const savedKey = localStorage.getItem("wwm_admin_key");
    if (savedKey) {
      setSecretKey(savedKey);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    if (secretKey) {
      localStorage.setItem("wwm_admin_key", secretKey);
      setIsAuthenticated(true);
      fetchData();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("wwm_admin_key");
    setSecretKey("");
    setIsAuthenticated(false);
    setParsedData([]);
    setRawJsonText("");
  };

  const fetchData = async () => {
    setStatus("Loading...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("static_data")
        .select("data")
        .eq("key", dataKey)
        .single();
        
      if (error) {
        if (error.code === "PGRST116") {
          setStatus("No data found for this key.");
          setParsedData([]);
          setRawJsonText("[]");
        } else {
          throw new Error(error.message);
        }
      } else if (data) {
        setParsedData(data.data || []);
        setRawJsonText(JSON.stringify(data.data || [], null, 2));
        setStatus("Data loaded successfully.");
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [dataKey, isAuthenticated]);

  const handleSave = async () => {
    setStatus("Saving to database...");
    try {
      let dataToSave = parsedData;

      if (showRawJson) {
        try {
          dataToSave = JSON.parse(rawJsonText);
          setParsedData(dataToSave);
        } catch {
          setStatus("Error: Invalid JSON format in Raw Editor");
          return;
        }
      }

      const res = await fetch("/api/admin/static-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: secretKey,
          key: dataKey,
          data: dataToSave
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${resData.error}`);
      } else {
        setStatus("Saved successfully!");
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleSeed = async () => {
    setStatus("Seeding database...");
    try {
      const res = await fetch("/api/admin/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secretKey })
      });
      const resData = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${resData.error}`);
      } else {
        setStatus("Database seeded successfully!");
        fetchData();
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    if (dataKey === "skills") setIsSkillModalOpen(true);
    else if (dataKey === "passiveSkills") setIsPassiveModalOpen(true);
    else if (dataKey === "innerWays") setIsInnerWayModalOpen(true);
    else if (dataKey === "martialArts") setIsMartialArtModalOpen(true);
    else if (dataKey === "defaultRotations") setIsDefaultRotationModalOpen(true);
    else {
      alert("No UI form exists for this type yet. Use Raw JSON editor.");
      setShowRawJson(true);
    }
  };

  const handleAddNew = () => {
    setEditingItem(null);
    if (dataKey === "skills") setIsSkillModalOpen(true);
    else if (dataKey === "passiveSkills") setIsPassiveModalOpen(true);
    else if (dataKey === "innerWays") setIsInnerWayModalOpen(true);
    else if (dataKey === "martialArts") setIsMartialArtModalOpen(true);
    else if (dataKey === "defaultRotations") setIsDefaultRotationModalOpen(true);
    else {
      alert("No UI form exists for this type yet. Use Raw JSON editor.");
      setShowRawJson(true);
    }
  };

  const handleDeleteItem = (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const newData = parsedData.filter(item => item.id !== id);
    setParsedData(newData);
    setRawJsonText(JSON.stringify(newData, null, 2));
    setStatus(`Deleted item ${id}. Remember to click Save Changes to push to database.`);
  };

  const handleModalSave = (updatedItem: any) => {
    let newData = [...parsedData];
    const idx = newData.findIndex(item => item.id === updatedItem.id);
    if (idx >= 0 && editingItem) {
      newData[idx] = updatedItem;
    } else {
      newData.push(updatedItem);
    }
    setParsedData(newData);
    setRawJsonText(JSON.stringify(newData, null, 2));
    setStatus("Added/Updated item in local list. Remember to click Save Changes to push to database.");
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
        <h1 className="mb-4 text-2xl font-bold">Admin Login</h1>
        <input 
          type="password" 
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="Enter Secret Key"
          className="mb-4 rounded border border-input bg-background p-2 text-foreground"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />
        <button onClick={handleLogin} className="rounded bg-primary px-4 py-2 text-primary-foreground">
          Enter
        </button>
      </div>
    );
  }

  const NAV_ITEMS = [
    { key: "skills", label: "Skills" },
    { key: "passiveSkills", label: "Passive Skills" },
    { key: "innerWays", label: "Inner Ways" },
    { key: "martialArts", label: "Martial Arts" },
    { key: "defaultRotations", label: "Default Rotations" },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col shrink-0">
        <div className="p-6 border-b shrink-0">
          <h1 className="text-xl font-bold tracking-tight">Data Admin</h1>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setDataKey(item.key)}
              className={`text-left px-4 py-3 rounded-md transition-colors ${
                dataKey === item.key 
                  ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t shrink-0">
          <button onClick={handleLogout} className="w-full rounded bg-destructive px-4 py-2 text-destructive-foreground font-medium hover:opacity-90 transition-opacity">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-8 overflow-hidden">
        <div className="flex items-center justify-between mb-6 shrink-0 flex-wrap gap-4">
          <h2 className="text-2xl font-bold">
            {NAV_ITEMS.find(i => i.key === dataKey)?.label}
          </h2>
          
          <div className="flex gap-3 items-center">
            <button onClick={fetchData} className="rounded bg-secondary px-4 py-2 text-secondary-foreground text-sm font-medium hover:opacity-90">
              Refresh DB
            </button>
            <button onClick={handleSave} className="rounded bg-primary px-4 py-2 text-primary-foreground text-sm font-medium hover:opacity-90">
              Save to DB
            </button>
            <div className="w-px h-6 bg-border mx-2"></div>
            <label className="flex items-center gap-2 text-sm cursor-pointer border px-3 py-2 rounded hover:bg-muted transition-colors">
              <input 
                type="checkbox" 
                checked={showRawJson} 
                onChange={(e) => setShowRawJson(e.target.checked)} 
              />
              Raw Editor
            </label>
            <button onClick={handleSeed} className="rounded bg-muted px-4 py-2 text-muted-foreground border text-sm hover:opacity-90">
              Seed JSON
            </button>
          </div>
        </div>

        <div className="mb-4 text-sm shrink-0 flex justify-between items-center bg-muted/30 p-3 rounded border">
          <div>Status: <span className={status.includes("Error") ? "text-destructive font-medium" : "text-green-500 font-medium"}>{status || "Idle"}</span></div>
          <div className="text-foreground font-medium bg-background px-3 py-1 rounded border shadow-sm">Total Items: {parsedData.length}</div>
        </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0 border rounded">
        {showRawJson ? (
          <textarea
            value={rawJsonText}
            onChange={(e) => setRawJsonText(e.target.value)}
            className="flex-1 w-full bg-background p-4 text-foreground font-mono text-sm resize-none focus:outline-none"
            placeholder="JSON data..."
          />
        ) : (
          <div className="flex-1 overflow-auto bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="p-3 border-b">ID</th>
                  <th className="p-3 border-b">Name</th>
                  <th className="p-3 border-b">Martial Art</th>
                  <th className="p-3 border-b text-right">
                    <button onClick={handleAddNew} className="text-primary hover:underline font-semibold">+ Add New</button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((item: any) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-mono text-xs">{item.id}</td>
                    <td className="p-3">{item.name}</td>
                    <td className="p-3 opacity-70">{item.martialArtId || item.applicableToMartialArtId || "Universal"}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleEditItem(item)} className="text-blue-500 hover:underline mr-4">Edit</button>
                      <button onClick={() => handleDeleteItem(item.id)} className="text-destructive hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
                {parsedData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </main>

      {/* Modals */}
      <SkillModal 
        isOpen={isSkillModalOpen} 
        onClose={() => setIsSkillModalOpen(false)} 
        skill={editingItem} 
        onSave={handleModalSave} 
      />
      <PassiveSkillModal 
        isOpen={isPassiveModalOpen} 
        onClose={() => setIsPassiveModalOpen(false)} 
        skill={editingItem} 
        onSave={handleModalSave} 
      />
      <InnerWayModal 
        isOpen={isInnerWayModalOpen} 
        onClose={() => setIsInnerWayModalOpen(false)} 
        innerWay={editingItem} 
        onSave={handleModalSave} 
      />
      <MartialArtModal 
        isOpen={isMartialArtModalOpen} 
        onClose={() => setIsMartialArtModalOpen(false)} 
        martialArt={editingItem} 
        onSave={handleModalSave} 
      />
      <DefaultRotationModal 
        isOpen={isDefaultRotationModalOpen} 
        onClose={() => setIsDefaultRotationModalOpen(false)} 
        rotation={editingItem} 
        onSave={handleModalSave} 
      />
    </div>
  );
}
