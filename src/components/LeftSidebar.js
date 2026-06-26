'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, MapPin, Layers, Folder, Disc, FileText, Activity, 
  ChevronRight, ChevronDown, Plus, Trash2, Menu, ChevronLeft 
} from 'lucide-react';

export default function LeftSidebar({
  activeNodeId,
  onSelectNode,
  refreshTrigger,
  isAdmin = false
}) {
  const [nodes, setNodes] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [isOpen, setIsOpen] = useState(true);
  const idleTimerRef = useRef(null);

  const [width, setWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, node: null });

  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    };
    window.addEventListener('click', handleCloseMenu);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
    };
  }, []);

  const isNodeDefinitive = (node) => {
    if (node.type !== 'trajectory' && node.type !== 'survey') return false;
    
    // Check if explicitly marked
    if (node.metadata?.is_definitive === true || node.metadata?.is_definitive === 'true') {
      return true;
    }
    
    // Check if it's the only one of its type under the parent slot
    const siblings = nodes.filter(n => n.parent_id === node.parent_id && n.type === node.type);
    if (siblings.length === 1 && siblings[0].id === node.id) {
      return true;
    }
    
    // If there are multiple and none are explicitly marked, and this is the first one:
    const hasAnyDefinitive = siblings.some(n => n.metadata?.is_definitive === true || n.metadata?.is_definitive === 'true');
    if (!hasAnyDefinitive && siblings[0].id === node.id) {
      return true;
    }
    
    return false;
  };

  const handleSetDefinitive = async (node) => {
    try {
      const siblings = nodes.filter(n => n.parent_id === node.parent_id && n.type === node.type && n.id !== node.id);
      
      // Update targeted node to definitive
      const res = await fetch(`/api/nodes/${node.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { is_definitive: true } })
      });
      if (!res.ok) throw new Error("Failed to update definitive status");

      // Update all siblings to non-definitive
      await Promise.all(siblings.map(sib => 
        fetch(`/api/nodes/${sib.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata: { is_definitive: false } })
        })
      ));

      fetchNodes();
    } catch (err) {
      alert("Error setting definitive: " + err.message);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.max(160, Math.min(600, e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizing = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Load nodes from API
  const fetchNodes = async () => {
    try {
      const res = await fetch('/api/nodes');
      if (res.ok) {
        const data = await res.json();
        setNodes(data);

        // Auto-expand nodes leading to the active node if any
        if (activeNodeId) {
          const parents = getParentChain(data, activeNodeId);
          setExpandedNodes(prev => ({
            ...prev,
            ...parents.reduce((acc, id) => ({ ...acc, [id]: true }), {})
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load nodes", e);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, [refreshTrigger, activeNodeId]);

  // Autohide idle logic: 30 seconds
  useEffect(() => {
    const resetIdleTimer = () => {
      // If sidebar is closed, don't trigger anything. If open, reset timer.
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      
      idleTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 30000); // 30 seconds
    };

    // Listen to mouse movement and clicks
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('mousedown', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('mousedown', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
    };
  }, []);

  // Helper to trace parentage
  const getParentChain = (flatNodes, targetId) => {
    const chain = [];
    let current = flatNodes.find(n => n.id === targetId);
    if (current && (current.type === 'trajectory' || current.type === 'survey')) {
      const folderSuffix = current.type === 'trajectory' ? 'plans' : 'surveys';
      chain.push(`slot-${current.parent_id}-${folderSuffix}`);
    }
    while (current && current.parent_id) {
      chain.push(current.parent_id);
      current = flatNodes.find(n => n.id === current.parent_id);
    }
    return chain;
  };

  // Build tree from flat array
  const buildTree = (parentId = null) => {
    return nodes
      .filter(n => n.parent_id === parentId)
      .map(n => {
        const rawChildren = buildTree(n.id);
        if (n.type === 'slot') {
          return {
            ...n,
            children: [
              {
                id: `slot-${n.id}-plans`,
                parent_id: n.id,
                name: 'Plans',
                type: 'plans_folder',
                children: rawChildren.filter(c => c.type === 'trajectory')
              },
              {
                id: `slot-${n.id}-surveys`,
                parent_id: n.id,
                name: 'Surveys',
                type: 'surveys_folder',
                children: rawChildren.filter(c => c.type === 'survey')
              }
            ]
          };
        }
        return {
          ...n,
          children: rawChildren
        };
      });
  };

  const toggleExpand = (id) => {
    setExpandedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // CRUD API Calls
  const handleAddNode = async (parentId, type, name) => {
    if (!name || !name.trim()) return;
    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: parentId,
          name: name.trim(),
          type: type,
          metadata: type === 'well' ? {
            units: 'metric',
            vs_direction: 0,
            latitude: 0,
            longitude: 0,
            easting: 0,
            northing: 0,
            elevation: 0
          } : {}
        })
      });

      if (res.ok) {
        const addedNode = await res.json();
        // Expand the parent so the new node is visible
        if (parentId) {
          const folderSuffix = addedNode.type === 'trajectory' ? 'plans' : 'surveys';
          setExpandedNodes(prev => ({
            ...prev,
            [parentId]: true,
            [`slot-${parentId}-${folderSuffix}`]: true
          }));
        }
        fetchNodes();
        if (addedNode.type === 'trajectory' || addedNode.type === 'survey') {
          onSelectNode(addedNode);
        }
      }
    } catch (e) {
      alert("Failed to add node: " + e.message);
    }
  };

  const handleDeleteNode = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this node and all its contents? This action is irreversible.")) return;
    
    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchNodes();
        if (activeNodeId === id) {
          onSelectNode(null);
        }
      }
    } catch (e) {
      alert("Failed to delete node: " + e.message);
    }
  };

  const getNodeIcon = (type) => {
    switch (type) {
      case 'country': return <Globe className="h-4 w-4 text-sky-500 shrink-0" />;
      case 'state': return <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />;
      case 'basin': return <Layers className="h-4 w-4 text-indigo-500 shrink-0" />;
      case 'field': return <Folder className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'well': return <Disc className="h-4 w-4 text-red-500 shrink-0" />;
      case 'slot': return <Activity className="h-4 w-4 text-purple-500 shrink-0" />;
      case 'trajectory': return <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'survey': return <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />;
      case 'plans_folder': return <Folder className="h-4 w-4 text-emerald-500/80 dark:text-emerald-400/80 shrink-0" />;
      case 'surveys_folder': return <Folder className="h-4 w-4 text-blue-500/80 dark:text-blue-400/80 shrink-0" />;
      default: return <FileText className="h-4 w-4 shrink-0" />;
    }
  };

  const getFriendlyTypeName = (type) => {
    switch (type) {
      case 'country': return 'Country';
      case 'state': return 'State';
      case 'basin': return 'Basin';
      case 'field': return 'Field';
      case 'well': return 'Well';
      case 'slot': return 'Slot';
      case 'trajectory': return 'Plan';
      case 'survey': return 'Actual Survey';
      default: return type;
    }
  };

  const getChildTypeNeeded = (parentType) => {
    switch (parentType) {
      case 'country': return 'state';
      case 'state': return 'basin';
      case 'basin': return 'field';
      case 'field': return 'well';
      case 'well': return 'slot';
      case 'plans_folder': return 'trajectory';
      case 'surveys_folder': return 'survey';
      default: return 'trajectory'; // Slot gets Trajectory Plan or Deviation Survey
    }
  };

  // Recursive renderer for tree nodes
  const renderNode = (node) => {
    const isExpanded = expandedNodes[node.id];
    const isLeaf = node.type === 'trajectory' || node.type === 'survey';
    const isActive = activeNodeId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const childType = getChildTypeNeeded(node.type);

    return (
      <div key={node.id} className="select-none text-sm pl-2">
        {/* Row element */}
        <div 
          onClick={() => {
            if (isLeaf || node.type === 'slot') {
              onSelectNode(node);
            }
            if (!isLeaf) {
              toggleExpand(node.id);
            }
          }}
          onContextMenu={(e) => {
            if (node.type === 'trajectory' || node.type === 'survey') {
              e.preventDefault();
              setContextMenu({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                node: node
              });
            }
          }}
          className={`flex items-center justify-between group py-1 px-1.5 rounded-lg cursor-pointer transition ${
            isActive 
              ? 'bg-blue-600 text-white font-medium shadow-sm' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            {!isLeaf ? (
              isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            ) : (
              <span className="w-4 h-4 shrink-0"></span> // indent leaf nodes
            )}
            {getNodeIcon(node.type)}
            <span className="truncate text-xs">{node.name}</span>
            {isNodeDefinitive(node) && (
              <span className="text-[10px] text-amber-500 font-bold shrink-0 ml-1.5" title="Definitive">★</span>
            )}
          </div>

          {/* Action buttons on hover (Admin or node creation) */}
          <div className="hidden group-hover:flex items-center gap-1 shrink-0">
            {node.type !== 'trajectory' && node.type !== 'survey' && node.type !== 'slot' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const friendlyType = getFriendlyTypeName(childType);
                  const name = prompt(`Enter new ${friendlyType} name:`);
                  if (name && name.trim()) {
                    const dbParentId = (node.type === 'plans_folder' || node.type === 'surveys_folder') ? node.parent_id : node.id;
                    handleAddNode(dbParentId, childType, name);
                  }
                }}
                title={`Add ${getFriendlyTypeName(childType)}`}
                className="p-0.5 rounded text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
            {node.type !== 'plans_folder' && node.type !== 'surveys_folder' && (isAdmin || node.type === 'trajectory' || node.type === 'survey' || node.type === 'well' || node.type === 'slot') && (
              <button
                onClick={(e) => handleDeleteNode(node.id, e)}
                title="Delete"
                className="p-0.5 rounded text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Render children recursively */}
        {isExpanded && node.children && (
          <div className="mt-0.5 border-l border-slate-200 dark:border-slate-800 ml-3.5 pl-0.5">
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  const rootNodes = buildTree(null);

  return (
    <div 
      className={`relative h-full border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:backdrop-blur-md z-30 flex flex-col ${
        isOpen ? '' : 'w-4'
      } ${isResizing ? '' : 'transition-all duration-300'}`}
      style={isOpen ? { width: `${width}px` } : {}}
    >
      {/* Expand/Collapse Hover Trigger */}
      {!isOpen && (
        <div 
          onMouseEnter={() => setIsOpen(true)}
          className="absolute top-0 left-0 w-4 h-full cursor-pointer hover:bg-blue-500/10 transition flex items-center justify-center text-slate-400 hover:text-blue-500"
        >
          <Menu className="h-4 w-4" />
        </div>
      )}

      {/* Actual Sidebar Content */}
      <div className={`flex flex-col h-full overflow-hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200 dark:border-slate-800">
          <span className="font-semibold text-xs text-slate-500 dark:text-slate-400 tracking-wider uppercase">Project Hierarchy</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Add Country Node Option (Tree Root) */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-[10px] text-slate-400">Add top-level Country</span>
          <button
            onClick={() => {
              const name = prompt("Enter new Country name:");
              if (name && name.trim()) {
                handleAddNode(null, 'country', name);
              }
            }}
            className="p-1 rounded text-slate-500 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Hierarchy Tree Area */}
        <div className="flex-1 overflow-y-auto px-1 py-3 space-y-1">
          {rootNodes.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No project data. Click "+" to create a Country.
            </div>
          ) : (
            rootNodes.map(node => renderNode(node))
          )}
        </div>
      </div>

      {/* Resize Handle */}
      {isOpen && (
        <div
          onMouseDown={startResizing}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/20 active:bg-blue-600/30 transition-colors z-40 group"
          title="Drag to resize sidebar"
        >
          <div className="absolute right-0 top-0 w-[1.5px] h-full bg-slate-200 dark:bg-slate-800 group-hover:bg-blue-500 transition-colors" />
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className="fixed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-50 text-xs w-44 text-slate-700 dark:text-slate-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              handleSetDefinitive(contextMenu.node);
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-2 font-medium"
          >
            <span className="text-amber-500 font-bold text-sm">★</span> Set as Definitive
          </button>
        </div>
      )}
    </div>
  );
}
