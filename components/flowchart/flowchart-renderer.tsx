"use client"

import { useState, useRef, useEffect, useCallback } from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FlowchartNode {
  id: string
  label: string
  type: "actor" | "service" | "database" | "external" | "process" | "decision"
  description?: string
  tech?: string[]
}

export interface FlowchartEdge {
  from: string
  to: string
  label?: string
}

export interface FlowchartSubgraph {
  id: string
  label: string
  nodeIds: string[]
}

export interface FlowchartData {
  title: string
  direction?: "TB" | "LR"
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
  subgraphs?: FlowchartSubgraph[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NODE_WIDTH = 220
const NODE_HEIGHT = 72
const VERTICAL_GAP = 100
const HORIZONTAL_GAP = 60
const PADDING_X = 60
const PADDING_Y = 80

// ─── Layout Engine ───────────────────────────────────────────────────────────
// Topological sort + depth-based row positioning for vertical layout

interface LayoutNode {
  id: string
  x: number
  y: number
  depth: number
  column: number
}

function computeLayout(nodes: FlowchartNode[], edges: FlowchartEdge[]): Map<string, LayoutNode> {
  const adjList = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  nodes.forEach(n => {
    adjList.set(n.id, [])
    inDegree.set(n.id, 0)
  })

  edges.forEach(e => {
    const list = adjList.get(e.from)
    if (list) list.push(e.to)
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1)
  })

  // BFS topological sort to assign depths
  const depthMap = new Map<string, number>()
  const queue: string[] = []

  nodes.forEach(n => {
    if ((inDegree.get(n.id) || 0) === 0) {
      queue.push(n.id)
      depthMap.set(n.id, 0)
    }
  })

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentDepth = depthMap.get(current)!
    const children = adjList.get(current) || []

    children.forEach(child => {
      const existingDepth = depthMap.get(child)
      if (existingDepth === undefined || existingDepth < currentDepth + 1) {
        depthMap.set(child, currentDepth + 1)
      }
      const newIn = (inDegree.get(child) || 1) - 1
      inDegree.set(child, newIn)
      if (newIn === 0) {
        queue.push(child)
      }
    })
  }

  // Handle disconnected nodes
  nodes.forEach(n => {
    if (!depthMap.has(n.id)) {
      depthMap.set(n.id, 0)
    }
  })

  // Group by depth
  const rows = new Map<number, string[]>()
  depthMap.forEach((depth, id) => {
    const row = rows.get(depth) || []
    row.push(id)
    rows.set(depth, row)
  })

  // Position nodes
  const layoutMap = new Map<string, LayoutNode>()
  rows.forEach((nodeIds, depth) => {
    const totalWidth = nodeIds.length * NODE_WIDTH + (nodeIds.length - 1) * HORIZONTAL_GAP
    const startX = PADDING_X + (totalWidth > 0 ? 0 : 0)

    nodeIds.forEach((id, colIdx) => {
      const x = startX + colIdx * (NODE_WIDTH + HORIZONTAL_GAP)
      const y = PADDING_Y + depth * (NODE_HEIGHT + VERTICAL_GAP)
      layoutMap.set(id, { id, x, y, depth, column: colIdx })
    })
  })

  // Center columns
  const maxRowWidth = Math.max(...Array.from(rows.values()).map(ids => ids.length * NODE_WIDTH + (ids.length - 1) * HORIZONTAL_GAP))
  rows.forEach((nodeIds) => {
    const rowWidth = nodeIds.length * NODE_WIDTH + (nodeIds.length - 1) * HORIZONTAL_GAP
    const offset = (maxRowWidth - rowWidth) / 2
    nodeIds.forEach(id => {
      const ln = layoutMap.get(id)!
      ln.x += offset
    })
  })

  return layoutMap
}

// ─── SVG Edge Path ───────────────────────────────────────────────────────────

function getEdgePath(fromLayout: LayoutNode, toLayout: LayoutNode): string {
  const x1 = fromLayout.x + NODE_WIDTH / 2
  const y1 = fromLayout.y + NODE_HEIGHT
  const x2 = toLayout.x + NODE_WIDTH / 2
  const y2 = toLayout.y

  const midY = (y1 + y2) / 2

  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
}

// ─── Node Shape Component ────────────────────────────────────────────────────

function NodeShape({ type, isHighlighted, isSelected }: { type: FlowchartNode["type"]; isHighlighted: boolean; isSelected: boolean }) {
  const baseClasses = "absolute inset-0 border transition-all duration-300"

  const highlightBorder = isHighlighted || isSelected
    ? "border-foreground shadow-[0_0_20px_rgba(255,255,255,0.1)]"
    : "border-foreground/40"

  switch (type) {
    case "actor":
      return <div className={`${baseClasses} ${highlightBorder} rounded-full`} />
    case "database":
      return <div className={`${baseClasses} ${highlightBorder} rounded-t-[50%] rounded-b-[50%]`} style={{ borderRadius: "8px 8px 50% 50%" }} />
    case "decision":
      return <div className={`${baseClasses} ${highlightBorder}`} style={{ transform: "rotate(45deg) scale(0.75)", borderRadius: "4px" }} />
    case "external":
      return <div className={`${baseClasses} ${highlightBorder} border-dashed`} style={{ borderRadius: "4px" }} />
    default:
      return <div className={`${baseClasses} ${highlightBorder}`} style={{ borderRadius: "4px" }} />
  }
}

// ─── Main Renderer ───────────────────────────────────────────────────────────

export function FlowchartRenderer({ data }: { data: FlowchartData }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)

  const layoutMap = computeLayout(data.nodes, data.edges)

  // Compute SVG dimensions
  const allLayouts = Array.from(layoutMap.values())
  const svgWidth = Math.max(
    ...allLayouts.map(l => l.x + NODE_WIDTH)
  ) + PADDING_X * 2
  const svgHeight = Math.max(
    ...allLayouts.map(l => l.y + NODE_HEIGHT)
  ) + PADDING_Y * 2

  // Get connected node IDs for highlighting
  const getConnectedIds = useCallback((nodeId: string): Set<string> => {
    const connected = new Set<string>()
    connected.add(nodeId)
    data.edges.forEach(e => {
      if (e.from === nodeId) connected.add(e.to)
      if (e.to === nodeId) connected.add(e.from)
    })
    return connected
  }, [data.edges])

  const highlightedIds = hoveredNode ? getConnectedIds(hoveredNode) : new Set<string>()

  // Zoom controls
  const zoomIn = () => setScale(s => Math.min(s + 0.15, 2.5))
  const zoomOut = () => setScale(s => Math.max(s - 0.15, 0.3))
  const resetView = () => { setScale(1); setTranslate({ x: 0, y: 0 }) }

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setTranslate({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }

  const handleMouseUp = () => setIsPanning(false)

  // Wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setScale(s => Math.max(0.3, Math.min(2.5, s + delta)))
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false })
      return () => container.removeEventListener("wheel", handleWheel)
    }
  }, [handleWheel])

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(!isFullscreen)
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  // Find subgraph for a node
  const getSubgraphForNode = (nodeId: string) => {
    return data.subgraphs?.find(sg => sg.nodeIds.includes(nodeId))
  }

  // Compute subgraph bounding boxes
  const subgraphBounds = data.subgraphs?.map(sg => {
    const sgLayouts = sg.nodeIds
      .map(id => layoutMap.get(id))
      .filter(Boolean) as LayoutNode[]

    if (sgLayouts.length === 0) return null

    const minX = Math.min(...sgLayouts.map(l => l.x)) - 20
    const minY = Math.min(...sgLayouts.map(l => l.y)) - 36
    const maxX = Math.max(...sgLayouts.map(l => l.x + NODE_WIDTH)) + 20
    const maxY = Math.max(...sgLayouts.map(l => l.y + NODE_HEIGHT)) + 20

    return { ...sg, x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }).filter(Boolean)

  const selectedNodeData = selectedNode ? data.nodes.find(n => n.id === selectedNode) : null

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-foreground/20 bg-background">
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          $ render --mode=interactive --direction=vertical
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="font-mono text-xs border border-foreground/30 px-2 py-1 hover:bg-foreground hover:text-background transition-colors"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="font-mono text-xs text-muted-foreground px-2 min-w-[4rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="font-mono text-xs border border-foreground/30 px-2 py-1 hover:bg-foreground hover:text-background transition-colors"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={resetView}
            className="font-mono text-xs border border-foreground/30 px-2 py-1 ml-2 hover:bg-foreground hover:text-background transition-colors"
          >
            reset
          </button>
          <button
            onClick={toggleFullscreen}
            className="font-mono text-xs border border-foreground/30 px-2 py-1 ml-1 hover:bg-foreground hover:text-background transition-colors"
          >
            {isFullscreen ? "exit" : "fullscreen"}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="relative overflow-hidden bg-background cursor-grab active:cursor-grabbing"
        style={{ minHeight: "500px", height: isFullscreen ? "100vh" : "70vh" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid Background Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: `${40 * scale}px ${40 * scale}px`,
            backgroundPosition: `${translate.x}px ${translate.y}px`,
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
        >
          {/* SVG Edges Layer */}
          <svg
            width={svgWidth}
            height={svgHeight}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ overflow: "visible" }}
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
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  className="fill-foreground/40"
                />
              </marker>
              <marker
                id="arrowhead-highlighted"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  className="fill-foreground"
                />
              </marker>
            </defs>

            {/* Subgraph Bounding Boxes */}
            {subgraphBounds?.map((sg) => sg && (
              <g key={sg.id}>
                <rect
                  x={sg.x}
                  y={sg.y}
                  width={sg.width}
                  height={sg.height}
                  rx={4}
                  className="fill-foreground/[0.02] stroke-foreground/10"
                  strokeWidth={1}
                  strokeDasharray="6 4"
                />
                <text
                  x={sg.x + 8}
                  y={sg.y + 14}
                  className="fill-foreground/30 font-mono"
                  fontSize={11}
                  fontFamily="monospace"
                >
                  {sg.label}
                </text>
              </g>
            ))}

            {/* Edges */}
            {data.edges.map((edge, i) => {
              const fromLayout = layoutMap.get(edge.from)
              const toLayout = layoutMap.get(edge.to)
              if (!fromLayout || !toLayout) return null

              const isEdgeHighlighted =
                hoveredNode !== null &&
                (edge.from === hoveredNode || edge.to === hoveredNode)

              const path = getEdgePath(fromLayout, toLayout)

              return (
                <g key={`edge-${i}`}>
                  {/* Edge path */}
                  <path
                    d={path}
                    fill="none"
                    className={`transition-all duration-300 ${
                      isEdgeHighlighted
                        ? "stroke-foreground"
                        : hoveredNode
                          ? "stroke-foreground/10"
                          : "stroke-foreground/30"
                    }`}
                    strokeWidth={isEdgeHighlighted ? 2 : 1.5}
                    strokeDasharray={isEdgeHighlighted ? "none" : "6 4"}
                    markerEnd={isEdgeHighlighted ? "url(#arrowhead-highlighted)" : "url(#arrowhead)"}
                  >
                    {isEdgeHighlighted && (
                      <animate
                        attributeName="stroke-dashoffset"
                        from="20"
                        to="0"
                        dur="0.8s"
                        repeatCount="indefinite"
                      />
                    )}
                  </path>

                  {/* Edge label */}
                  {edge.label && (
                    <text
                      x={(fromLayout.x + NODE_WIDTH / 2 + toLayout.x + NODE_WIDTH / 2) / 2}
                      y={(fromLayout.y + NODE_HEIGHT + toLayout.y) / 2}
                      textAnchor="middle"
                      dy={-6}
                      className={`font-mono transition-all duration-300 ${
                        isEdgeHighlighted
                          ? "fill-foreground"
                          : hoveredNode
                            ? "fill-foreground/10"
                            : "fill-foreground/50"
                      }`}
                      fontSize={10}
                      fontFamily="monospace"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {/* HTML Nodes Layer */}
          {data.nodes.map(node => {
            const layout = layoutMap.get(node.id)
            if (!layout) return null

            const isHighlighted = highlightedIds.has(node.id)
            const isSelected = selectedNode === node.id
            const isDimmed = hoveredNode !== null && !isHighlighted

            return (
              <div
                key={node.id}
                className={`absolute transition-all duration-300 cursor-pointer select-none ${isDimmed ? "opacity-20" : "opacity-100"}`}
                style={{
                  left: layout.x,
                  top: layout.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedNode(selectedNode === node.id ? null : node.id)
                }}
              >
                <NodeShape type={node.type} isHighlighted={isHighlighted} isSelected={isSelected} />

                {/* Node Content */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full px-3">
                  {/* Type badge */}
                  <span className={`font-mono text-[9px] uppercase tracking-widest mb-1 transition-colors duration-300 ${
                    isHighlighted || isSelected ? "text-foreground/70" : "text-foreground/30"
                  }`}>
                    {node.type}
                  </span>

                  {/* Label */}
                  <span className={`font-mono text-xs font-bold text-center leading-tight transition-colors duration-300 ${
                    isHighlighted || isSelected ? "text-foreground" : "text-foreground/60"
                  }`}>
                    {node.label}
                  </span>

                  {/* Tech badges on hover */}
                  {node.tech && (isHighlighted || isSelected) && (
                    <div className="flex gap-1 mt-1 flex-wrap justify-center">
                      {node.tech.slice(0, 3).map(t => (
                        <span key={t} className="font-mono text-[8px] border border-foreground/30 px-1 py-0.5 text-foreground/50">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail Panel — slides up on node selection */}
      {selectedNodeData && (
        <div className="border-t border-foreground bg-background animate-in slide-in-from-bottom-4 duration-300">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground border border-foreground/30 px-2 py-0.5">
                    {selectedNodeData.type}
                  </span>
                  <h3 className="font-mono text-sm font-bold text-foreground">
                    {selectedNodeData.label}
                  </h3>
                </div>
                {selectedNodeData.description && (
                  <p className="font-mono text-xs text-muted-foreground leading-relaxed max-w-2xl">
                    {selectedNodeData.description}
                  </p>
                )}
                {selectedNodeData.tech && selectedNodeData.tech.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {selectedNodeData.tech.map(t => (
                      <span key={t} className="font-mono text-[10px] border border-foreground px-2 py-1 uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background transition-colors">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors ml-4"
              >
                [×]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-3 border-t border-foreground/10">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Legend:</span>
          {["service", "database", "external", "actor", "process", "decision"].map(type => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 border border-foreground/40 ${
                type === "actor" ? "rounded-full" :
                type === "external" ? "border-dashed" :
                type === "database" ? "rounded-b-full" :
                ""
              }`} />
              <span className="font-mono text-[10px] text-muted-foreground">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
