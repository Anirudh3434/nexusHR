"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, GripVertical } from "lucide-react";

interface BoardColumn {
  id: string;
  name: string;
  status: string;
  color?: string;
  allowedTransitions?: string[];
}

interface StatusTransitionFlowProps {
  columns: BoardColumn[];
  onTransitionChange: (fromStatus: string, toStatus: string, allowed: boolean) => void;
}

interface CardPosition {
  x: number;
  y: number;
}

interface Connection {
  from: string;
  to: string;
}

export default function StatusTransitionFlow({ columns, onTransitionChange }: StatusTransitionFlowProps) {
  const [cardPositions, setCardPositions] = useState<Record<string, CardPosition>>(() => {
    // Initialize positions in a grid layout
    const positions: Record<string, CardPosition> = {};
    const colsPerRow = 3;
    columns.forEach((column, index) => {
      const row = Math.floor(index / colsPerRow);
      const colIndex = index % colsPerRow;
      positions[column.id] = {
        x: colIndex * 280 + 40,
        y: row * 150 + 40
      };
    });
    return positions;
  });

  const [connections, setConnections] = useState<Connection[]>(() => {
    // Initialize connections from allowedTransitions
    const conns: Connection[] = [];
    columns.forEach(fromCol => {
      fromCol.allowedTransitions?.forEach(toStatus => {
        const toCol = columns.find(c => c.status === toStatus);
        if (toCol && fromCol.status !== toStatus) {
          conns.push({ from: fromCol.id, to: toCol.id });
        }
      });
    });
    return conns;
  });

  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isTransitionAllowed = (fromStatus: string, toStatus: string) => {
    const fromColumn = columns.find(col => col.status === fromStatus);
    return fromColumn?.allowedTransitions?.includes(toStatus) ?? true;
  };

  const getStatusColor = (status: string) => {
    const column = columns.find(col => col.status === status);
    // Use subtle professional colors instead of the original punchy colors
    const colorMap: Record<string, string> = {
      'backlog': '#64748b',      // Slate 500
      'to_do': '#3b82f6',        // Blue 500
      'in_progress': '#f59e0b',  // Amber 500
      'in_review': '#8b5cf6',    // Violet 500
      'completed': '#10b981',    // Emerald 500
      'cancelled': '#ef4444',    // Red 500
    };
    return colorMap[status] || column?.color || '#6B7280';
  };

  const getStatusLabel = (status: string) => {
    if (!status) return '';
    if (status.startsWith('col') || status.startsWith('Col') || status.startsWith('cs_') || /^[a-z0-9]{12,}$/i.test(status)) {
      return '';
    }
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getCardCenter = (cardId: string) => {
    const pos = cardPositions[cardId];
    if (!pos) return { x: 0, y: 0 };
    return {
      x: pos.x + 120, // Card width is 240, center is at 120
      y: pos.y + 40   // Card height is 80, center is at 40
    };
  };

  const getConnectorPosition = (cardId: string) => {
    const pos = cardPositions[cardId];
    if (!pos) return { x: 0, y: 0 };
    return {
      x: pos.x + 240, // Right edge of card
      y: pos.y + 40   // Center vertically
    };
  };

  const createBezierPath = (fromX: number, fromY: number, toX: number, toY: number) => {
    const controlOffset = 100;
    return `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`;
  };

  const handleCardMouseDown = (e: React.MouseEvent, cardId: string) => {
    if ((e.target as HTMLElement).closest('.connector-handle')) return; // Don't drag if clicking connector
    e.preventDefault();
    const pos = cardPositions[cardId];
    
    // Calculate offset from mouse click to card position
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    // Get the click position relative to the card
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    setDraggingCard(cardId);
    setDragOffset({
      x: clickX - pos.x,
      y: clickY - pos.y
    });
  };

  const handleConnectorMouseDown = (e: React.MouseEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConnectingFrom(cardId);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingCard) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      
      let newX = e.clientX - rect.left - dragOffset.x;
      let newY = e.clientY - rect.top - dragOffset.y;
      
      // Constrain to canvas bounds
      newX = Math.max(0, Math.min(newX, rect.width - 240));
      newY = Math.max(0, Math.min(newY, rect.height - 80));
      
      setCardPositions(prev => ({
        ...prev,
        [draggingCard]: { x: newX, y: newY }
      }));
    }

    if (connectingFrom) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, [draggingCard, dragOffset, connectingFrom]);

  const handleMouseUp = useCallback(() => {
    if (connectingFrom && hoveredCard && hoveredCard !== connectingFrom) {
      // Check if connection already exists
      const connectionExists = connections.some(
        c => c.from === connectingFrom && c.to === hoveredCard
      );

      if (!connectionExists) {
        // Add new connection
        const newConnection = { from: connectingFrom, to: hoveredCard };
        setConnections(prev => [...prev, newConnection]);

        // Update the allowedTransitions in the column
        const fromCol = columns.find(c => c.id === connectingFrom);
        const toCol = columns.find(c => c.id === hoveredCard);
        if (fromCol && toCol) {
          onTransitionChange(fromCol.status, toCol.status, true);
        }
      }
    }

    setDraggingCard(null);
    setConnectingFrom(null);
    setHoveredCard(null);
  }, [connectingFrom, hoveredCard, connections, columns, onTransitionChange]);

  const handleDeleteConnection = (connection: Connection) => {
    setConnections(prev => prev.filter(c => 
      !(c.from === connection.from && c.to === connection.to)
    ));

    const fromCol = columns.find(c => c.id === connection.from);
    const toCol = columns.find(c => c.id === connection.to);
    if (fromCol && toCol) {
      onTransitionChange(fromCol.status, toCol.status, false);
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Status Transition Rules</h3>
        <div className="text-sm text-slate-500">
          Drag cards to reposition • Drag connector to create transitions
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef}
        className="relative bg-white border border-slate-200 rounded-xl"
        style={{ height: '800px', minHeight: '800px', width: '100%' }}
      >
        {/* SVG for connections */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
          </defs>

          {/* Existing connections */}
          {connections.map((connection) => {
            const fromPos = getConnectorPosition(connection.from);
            const toPos = getCardCenter(connection.to);
            const path = createBezierPath(fromPos.x, fromPos.y, toPos.x, toPos.y);
            
            return (
              <g key={`${connection.from}-${connection.to}`}>
                <motion.path
                  d={path}
                  stroke="#6366f1"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3 }}
                />
                {/* Delete button on connection */}
                <motion.circle
                  cx={(fromPos.x + toPos.x) / 2}
                  cy={(fromPos.y + toPos.y) / 2}
                  r="8"
                  fill="#ef4444"
                  className="cursor-pointer pointer-events-auto"
                  whileHover={{ scale: 1.2 }}
                  onClick={() => handleDeleteConnection(connection)}
                >
                  <X size={10} color="white" x={-5} y={-5} />
                </motion.circle>
              </g>
            );
          })}

          {/* Temporary connection while dragging */}
          <AnimatePresence>
            {connectingFrom && (
              <motion.path
                d={createBezierPath(
                  getConnectorPosition(connectingFrom).x,
                  getConnectorPosition(connectingFrom).y,
                  mousePosition.x,
                  mousePosition.y
                )}
                stroke="#6366f1"
                strokeWidth="2"
                fill="none"
                strokeDasharray="6 4"
                markerEnd="url(#arrowhead)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>
        </svg>

        {/* Status Cards */}
        {columns.map((column) => {
          const pos = cardPositions[column.id];
          const isHovered = hoveredCard === column.id;
          const isConnecting = connectingFrom === column.id;
          const isDragging = draggingCard === column.id;
          
          return (
            <motion.div
              key={column.id}
              className="absolute cursor-move"
              style={{
                left: pos.x,
                top: pos.y,
                width: '240px',
                height: '80px',
                zIndex: isDragging ? 1000 : 1,
                pointerEvents: 'auto',
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
              onMouseDown={(e) => handleCardMouseDown(e, column.id)}
              onMouseEnter={() => setHoveredCard(column.id)}
              onMouseLeave={() => setHoveredCard(null)}
              animate={{
                scale: isDragging ? 1.05 : isHovered ? 1.02 : 1,
                boxShadow: isHovered && connectingFrom && connectingFrom !== column.id
                  ? '0 0 0 3px rgba(99, 102, 241, 0.5)'
                  : isDragging
                  ? '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              transition={{ duration: 0.15 }}
            >
              {/* Card */}
              <div
                className="w-full h-full rounded-xl shadow-lg flex items-center px-4 relative border-2"
                style={{
                  backgroundColor: 'white',
                  borderColor: getStatusColor(column.status),
                  border: isConnecting ? '3px solid #6366f1' : `2px solid ${getStatusColor(column.status)}`
                }}
              >
                {/* Drag handle */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 cursor-grab hover:text-slate-600 transition-colors">
                  <GripVertical size={16} />
                </div>

                {/* Status info */}
                <div className="flex-1 ml-6 min-w-0 pr-2">
                  <div 
                    className="font-bold text-sm truncate"
                    style={{ color: getStatusColor(column.status) }}
                  >
                    {column.name || getStatusLabel(column.status) || 'Status'}
                  </div>
                  {getStatusLabel(column.status) && getStatusLabel(column.status).toLowerCase() !== (column.name || '').toLowerCase() ? (
                    <div className="text-slate-400 text-[11px] font-medium truncate">
                      {getStatusLabel(column.status)}
                    </div>
                  ) : null}
                </div>

                {/* Connector handle */}
                <div
                  className="connector-handle absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center cursor-crosshair hover:scale-125 transition-transform z-10 shadow-sm"
                  style={{ borderColor: getStatusColor(column.status) }}
                  onMouseDown={(e) => handleConnectorMouseDown(e, column.id)}
                >
                  <Plus size={12} style={{ color: getStatusColor(column.status) }} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center">
            <Plus size={10} className="text-indigo-500" />
          </div>
          <span>Drag connector to create transition</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
            <X size={10} className="text-white" />
          </div>
          <span>Click red dot to delete connection</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center">
            <GripVertical size={10} className="text-slate-500" />
          </div>
          <span>Drag card to reposition</span>
        </div>
      </div>
    </div>
  );
}
