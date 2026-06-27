'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, MapPin, Layers, Folder, Disc, FileText, Activity, 
  ChevronRight, ChevronDown, Plus, Trash2, Menu, ChevronLeft,
  AlertTriangle
} from 'lucide-react';

// Isolated inline form component so typing does not trigger parent LeftSidebar re-renders
function InlineAddForm({ placeholder, onAdd, onCancel }) {
  const [name, setName] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onAdd(name);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      onMouseDown={(e) => e.stopPropagation()} 
      className="mt-1 pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg flex flex-col gap-1 border border-slate-200 dark:border-slate-800 animate-fadeIn"
    >
      <div className="flex gap-1">
        <input
          type="text"
          autoFocus
          placeholder={placeholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 text-xs py-0.5 px-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 transition-colors"
        />
        <button
          onClick={() => onAdd(name)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] transition font-medium cursor-pointer"
        >
          Add
        </button>
        <button
          onClick={onCancel}
          className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] transition font-medium cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Isolated Rename Dialog component to prevent parent re-renders while typing
function RenameDialog({ oldName, nodeType, onRename, onCancel }) {
  const [newName, setNewName] = useState(oldName || '');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onRename(newName);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Rename {nodeType === 'trajectory' ? 'Plan' : nodeType === 'survey' ? 'Actual Survey' : nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}
          </h3>
          <input
            type="text"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-xs py-1.5 px-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
            placeholder="Enter new name..."
          />
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/60 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onRename(newName)}
            disabled={!newName.trim() || newName.trim() === oldName}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition flex items-center gap-1 shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeftSidebar({
  activeNodeId,
  onSelectNode,
  refreshTrigger,
  isAdmin = false,
  onRefresh,
  isOpenMobile,
  onCloseMobile
}) {
  const [nodes, setNodes] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [isOpen, setIsOpen] = useState(true);
  const idleTimerRef = useRef(null);

  const [width, setWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, node: null });
  const [activeAddForm, setActiveAddForm] = useState(null); // { key, parentId, type }
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, nodeId: null, nodeName: '', nodeType: '' });
  const [renameDialog, setRenameDialog] = useState({ isOpen: false, nodeId: null, oldName: '', nodeType: '' });

  const handleToggleAddForm = (key, parentId, type) => {
    setActiveAddForm(prev => (prev && prev.key === key) ? null : { key, parentId, type });
  };

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
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Error setting definitive: " + err.message);
    }
  };

  const isWellWorkingProject = (wellNode) => {
    if (wellNode.type !== 'well') return false;
    if (wellNode.metadata?.is_working_project === true || wellNode.metadata?.is_working_project === 'true') {
      return true;
    }
    const hasAnyWorking = nodes.some(n => n.type === 'well' && (n.metadata?.is_working_project === true || n.metadata?.is_working_project === 'true'));
    if (!hasAnyWorking) {
      const firstWell = nodes.find(n => n.type === 'well');
      return firstWell && firstWell.id === wellNode.id;
    }
    return false;
  };

  const handleSetWorkingProject = async (wellNode) => {
    try {
      const otherWells = nodes.filter(n => n.type === 'well' && n.id !== wellNode.id);
      
      // Update targeted well to working project
      const res = await fetch(`/api/nodes/${wellNode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { is_working_project: true } })
      });
      if (!res.ok) throw new Error("Failed to update working project status");

      // Update all other wells to non-working project
      await Promise.all(otherWells.map(well => 
        fetch(`/api/nodes/${well.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata: { is_working_project: false } })
        })
      ));

      fetchNodes();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Error setting working project: " + err.message);
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
    if (activeNodeId) {
      setIsOpen(true);
    }
  }, [refreshTrigger, activeNodeId]);

  // Autohide idle logic: 30 seconds
  useEffect(() => {
    let hasInteracted = false;

    const resetIdleTimer = () => {
      // If sidebar is closed, don't trigger anything. If open, reset timer.
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      
      idleTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 30000); // 30 seconds
    };

    const handleUserActivity = () => {
      hasInteracted = true;
      resetIdleTimer();
    };

    // Listen to mouse movement and clicks
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    
    // We do NOT call resetIdleTimer() on mount to keep sidebars displayed on reload/refresh

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
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
        if (onRefresh) onRefresh();
        if (addedNode.type === 'trajectory' || addedNode.type === 'survey') {
          onSelectNode(addedNode);
        }
      }
    } catch (e) {
      alert("Failed to add node: " + e.message);
    }
  };

  const handleDeleteNode = async (id) => {
    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchNodes();
        if (onRefresh) onRefresh();
        if (activeNodeId === id) {
          onSelectNode(null);
        }
      }
    } catch (e) {
      alert("Failed to delete node: " + e.message);
    }
  };

  const handleRenameNode = async (id, newName) => {
    if (!newName || !newName.trim()) return;
    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      if (res.ok) {
        fetchNodes();
        if (onRefresh) onRefresh();
        if (activeNodeId === id) {
          const updated = await res.json();
          onSelectNode(updated);
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to rename node");
      }
    } catch (e) {
      alert("Failed to rename node: " + e.message);
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
            if (node.type !== 'plans_folder' && node.type !== 'surveys_folder') {
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
            {isWellWorkingProject(node) && (
              <span className="text-[10px] text-emerald-500 font-bold shrink-0 ml-1.5" title="Working Project">👷</span>
            )}
          </div>

          {/* Action buttons on hover (Admin or node creation) */}
          <div className="hidden group-hover:flex items-center gap-1 shrink-0">
            {node.type !== 'trajectory' && node.type !== 'survey' && node.type !== 'slot' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const dbParentId = (node.type === 'plans_folder' || node.type === 'surveys_folder') ? node.parent_id : node.id;
                  handleToggleAddForm(node.id, dbParentId, childType);
                }}
                title={`Add ${getFriendlyTypeName(childType)}`}
                className="p-0.5 rounded text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
            {node.type !== 'plans_folder' && node.type !== 'surveys_folder' && (isAdmin || node.type === 'trajectory' || node.type === 'survey' || node.type === 'well' || node.type === 'slot') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm({
                    isOpen: true,
                    nodeId: node.id,
                    nodeName: node.name,
                    nodeType: node.type
                  });
                }}
                title="Delete"
                className="p-0.5 rounded text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Inline sub-node creation form */}
        {activeAddForm && activeAddForm.key === node.id && (
          <InlineAddForm
            placeholder={`New ${getFriendlyTypeName(activeAddForm.type)} name...`}
            onAdd={(name) => {
              handleAddNode(activeAddForm.parentId, activeAddForm.type, name);
              setActiveAddForm(null);
            }}
            onCancel={() => setActiveAddForm(null)}
          />
        )}

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
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      
      <div 
        className={`fixed lg:relative inset-y-0 left-0 h-full border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/95 dark:backdrop-blur-md z-50 lg:z-30 flex flex-col transition-transform duration-300 transform lg:transform-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isOpen ? '' : 'lg:w-4'}`}
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
            onClick={() => handleToggleAddForm('root', null, 'country')}
            className="p-1 rounded text-slate-500 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {activeAddForm && activeAddForm.key === 'root' && (
          <div className="m-2">
            <InlineAddForm
              placeholder="New Country name..."
              onAdd={(name) => {
                handleAddNode(null, 'country', name);
                setActiveAddForm(null);
              }}
              onCancel={() => setActiveAddForm(null)}
            />
          </div>
        )}

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
      {contextMenu.visible && contextMenu.node && (
        <div 
          className="fixed bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xl py-1.5 z-50 text-xs w-48 text-slate-700 dark:text-slate-200 animate-in fade-in slide-in-from-top-1 duration-100 ring-1 ring-black/5 dark:ring-black/40"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {(contextMenu.node.type === 'trajectory' || contextMenu.node.type === 'survey') && !isNodeDefinitive(contextMenu.node) && (
            <button
              onClick={() => {
                handleSetDefinitive(contextMenu.node);
                setContextMenu(prev => ({ ...prev, visible: false }));
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-2 font-medium cursor-pointer"
            >
              <span className="text-amber-500 font-bold text-sm">★</span> Set as Definitive
            </button>
          )}
          {contextMenu.node.type === 'well' && !isWellWorkingProject(contextMenu.node) && (
            <button
              onClick={() => {
                handleSetWorkingProject(contextMenu.node);
                setContextMenu(prev => ({ ...prev, visible: false }));
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-2 font-medium cursor-pointer"
            >
              <span className="text-emerald-500 font-bold text-sm">👷</span> Set as Working Project
            </button>
          )}
          <button
            onClick={() => {
              setRenameDialog({
                isOpen: true,
                nodeId: contextMenu.node.id,
                oldName: contextMenu.node.name,
                nodeType: contextMenu.node.type
              });
              setContextMenu(prev => ({ ...prev, visible: false }));
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-2 font-medium cursor-pointer"
          >
            <span className="text-blue-500 text-xs font-bold">✎</span> Rename Node
          </button>
        </div>
      )}

      {/* Rename Dialog Modal */}
      {renameDialog.isOpen && (
        <RenameDialog
          oldName={renameDialog.oldName}
          nodeType={renameDialog.nodeType}
          onRename={async (newName) => {
            const id = renameDialog.nodeId;
            setRenameDialog({ isOpen: false, nodeId: null, oldName: '', nodeType: '' });
            await handleRenameNode(id, newName);
          }}
          onCancel={() => setRenameDialog({ isOpen: false, nodeId: null, oldName: '', nodeType: '' })}
        />
      )}

      {/* Client-Side Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteConfirm({ isOpen: false, nodeId: null, nodeName: '', nodeType: '' });
          }}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center text-red-650 dark:text-red-400 mb-4 shadow-inner">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Delete {getFriendlyTypeName(deleteConfirm.nodeType)}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-normal">
                Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-200">"{deleteConfirm.nodeName}"</span> and all its contents? This action is irreversible.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/60 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, nodeId: null, nodeName: '', nodeType: '' })}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = deleteConfirm.nodeId;
                  setDeleteConfirm({ isOpen: false, nodeId: null, nodeName: '', nodeType: '' });
                  await handleDeleteNode(id);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition flex items-center gap-1 shadow-sm shadow-red-500/20 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
