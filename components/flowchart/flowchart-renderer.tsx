"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  User,
  Server,
  Database,
  Cpu,
  Globe,
  GitFork,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Move,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  ChevronDown,
  Lock,
  Unlock,
  SlidersHorizontal
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FlowchartNode {
  id: string
  label: string
  type: "actor" | "service" | "database" | "external" | "process" | "decision"
  description?: string
  tech?: string[]
  row?: number
  col?: number
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

// ─── Geometry Constants ──────────────────────────────────────────────────────

const NODE_WIDTH = 250
const NODE_HEIGHT = 80
const ROW_GAP = 160 // Ample space for multi-lane orthogonal lines & non-overlapping labels
const COL_GAP = 100
const CANVAS_PADDING = 80

// ─── Layout & Collision Engine ───────────────────────────────────────────────

interface PositionedNode extends FlowchartNode {
  x: number
  y: number
  row: number
  col: number
}

interface RoutedEdge {
  from: string
  to: string
  label?: string
  lines: string[]
  labelWidth: number
  labelHeight: number
  path: string
  labelPos: { x: number; y: number }
  isBackward: boolean
}

interface BoundingBox {
  x: number // center x
  y: number // center y
  width: number
  height: number
}

function checkCollision(b1: BoundingBox, b2: BoundingBox, padX = 14, padY = 10): boolean {
  return (
    Math.abs(b1.x - b2.x) < (b1.width + b2.width) / 2 + padX &&
    Math.abs(b1.y - b2.y) < (b1.height + b2.height) / 2 + padY
  )
}

/**
 * Splits long descriptive labels (especially with parentheses) into compact 2-line badges.
 * This cuts label width in half (e.g. from 260px down to ~130px), eliminating horizontal collisions.
 */
function formatLabel(label?: string): { lines: string[]; width: number; height: number } {
  if (!label) return { lines: [], width: 0, height: 0 }

  const trimmed = label.trim()

  // Case 1: Parentheses present e.g. "Extract & Split (1000 chars / 200 overlap)"
  const parenMatch = trimmed.match(/^(.*?)\s*(\([^(]+\))\s*$/)
  if (parenMatch && parenMatch[1].length > 0) {
    const l1 = parenMatch[1].trim()
    const l2 = parenMatch[2].trim()
    const maxLen = Math.max(l1.length, l2.length)
    return {
      lines: [l1, l2],
      width: Math.min(230, Math.max(80, Math.round(maxLen * 6.5) + 20)),
      height: 32
    }
  }

  // Case 2: Long label without parens (> 24 chars) - split at dash, slash, or middle space
  if (trimmed.length > 24) {
    let splitIdx = trimmed.indexOf(" - ")
    let separatorLen = 3
    if (splitIdx < 0) {
      splitIdx = trimmed.indexOf(" / ")
      separatorLen = 3
    }
    if (splitIdx < 0) {
      splitIdx = trimmed.lastIndexOf(" ", Math.ceil(trimmed.length / 2))
      separatorLen = 1
    }

    if (splitIdx > 6 && splitIdx < trimmed.length - 6) {
      const l1 = trimmed.slice(0, splitIdx).trim()
      const l2 = trimmed.slice(splitIdx + separatorLen).trim()
      const maxLen = Math.max(l1.length, l2.length)
      return {
        lines: [l1, l2],
        width: Math.min(230, Math.max(80, Math.round(maxLen * 6.5) + 20)),
        height: 32
      }
    }
  }

  // Case 3: Compact single-line label
  return {
    lines: [trimmed],
    width: Math.min(250, Math.max(64, Math.round(trimmed.length * 6.8) + 18)),
    height: 20
  }
}

/**
 * Intelligent tiered layer assignment that handles cycles, feedback loops,
 * and anti-collision orthogonal edge label placement.
 */
function computeLayout(nodes: FlowchartNode[], edges: FlowchartEdge[]): {
  nodeMap: Map<string, PositionedNode>
  routedEdges: RoutedEdge[]
  canvasWidth: number
  canvasHeight: number
} {
  const nodeMap = new Map<string, PositionedNode>()
  if (nodes.length === 0) {
    return { nodeMap, routedEdges: [], canvasWidth: 800, canvasHeight: 600 }
  }

  // 1. Build adjacency list
  const adj = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  const nodeIds = new Set(nodes.map(n => n.id))

  nodes.forEach(n => {
    adj.set(n.id, [])
    inDegree.set(n.id, 0)
  })

  // Filter valid edges
  const validEdges = edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to))

  validEdges.forEach(e => {
    adj.get(e.from)!.push(e.to)
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1)
  })

  // 2. Cycle-aware DFS to identify back-edges and compute longest forward paths
  const visited = new Set<string>()
  const activePath = new Set<string>()
  const backwardEdges = new Set<string>() // "from->to"

  function detectBackEdges(u: string) {
    visited.add(u)
    activePath.add(u)

    const neighbors = adj.get(u) || []
    for (const v of neighbors) {
      if (activePath.has(v)) {
        // Back edge found (cycle / feedback loop)
        backwardEdges.add(`${u}->${v}`)
      } else if (!visited.has(v)) {
        detectBackEdges(v)
      }
    }

    activePath.delete(u)
  }

  // Find root candidates (0 in-degree or actor nodes first)
  const roots: string[] = []
  nodes.forEach(n => {
    if ((inDegree.get(n.id) || 0) === 0 || n.type === "actor") {
      roots.push(n.id)
    }
  })
  if (roots.length === 0) roots.push(nodes[0].id)

  roots.forEach(r => {
    if (!visited.has(r)) detectBackEdges(r)
  })
  // Any unvisited nodes
  nodes.forEach(n => {
    if (!visited.has(n.id)) detectBackEdges(n.id)
  })

  // 3. Compute row levels using only FORWARD edges
  const rankMap = new Map<string, number>()

  // Check if nodes have manual row/col
  const hasManualPositions = nodes.some(n => typeof n.row === "number")

  if (hasManualPositions) {
    nodes.forEach(n => {
      rankMap.set(n.id, typeof n.row === "number" ? n.row : 0)
    })
  } else {
    // Forward-only adjacency
    const forwardAdj = new Map<string, string[]>()
    const forwardInDegree = new Map<string, number>()
    nodes.forEach(n => {
      forwardAdj.set(n.id, [])
      forwardInDegree.set(n.id, 0)
    })

    validEdges.forEach(e => {
      if (!backwardEdges.has(`${e.from}->${e.to}`)) {
        forwardAdj.get(e.from)!.push(e.to)
        forwardInDegree.set(e.to, (forwardInDegree.get(e.to) || 0) + 1)
      }
    })

    // BFS longest path rank assignment
    const queue: { id: string; rank: number }[] = []
    nodes.forEach(n => {
      if ((forwardInDegree.get(n.id) || 0) === 0) {
        queue.push({ id: n.id, rank: 0 })
        rankMap.set(n.id, 0)
      }
    })

    if (queue.length === 0) {
      queue.push({ id: nodes[0].id, rank: 0 })
      rankMap.set(nodes[0].id, 0)
    }

    while (queue.length > 0) {
      const { id, rank } = queue.shift()!
      const currentRank = rankMap.get(id) || 0
      const nextNodes = forwardAdj.get(id) || []

      for (const nextId of nextNodes) {
        const nextRank = currentRank + 1
        const existingRank = rankMap.get(nextId)
        if (existingRank === undefined || nextRank > existingRank) {
          rankMap.set(nextId, nextRank)
          queue.push({ id: nextId, rank: nextRank })
        }
      }
    }

    // Default any missed nodes
    nodes.forEach(n => {
      if (!rankMap.has(n.id)) {
        rankMap.set(n.id, 0)
      }
    })
  }

  // 4. Group nodes into rows
  const rowGroups = new Map<number, FlowchartNode[]>()
  nodes.forEach(node => {
    const row = rankMap.get(node.id) || 0
    const list = rowGroups.get(row) || []
    list.push(node)
    rowGroups.set(row, list)
  })

  // Sort rows in ascending order
  const sortedRowKeys = Array.from(rowGroups.keys()).sort((a, b) => a - b)

  // 5. Position nodes per row
  let maxRowWidth = 0

  sortedRowKeys.forEach(rowKey => {
    const rowNodes = rowGroups.get(rowKey)!
    // If manual cols exist, sort by col; otherwise preserve declaration order
    rowNodes.sort((a, b) => (a.col ?? 0) - (b.col ?? 0))
    const rowWidth = rowNodes.length * NODE_WIDTH + (rowNodes.length - 1) * COL_GAP
    if (rowWidth > maxRowWidth) maxRowWidth = rowWidth
  })

  sortedRowKeys.forEach((rowKey, rowIndex) => {
    const rowNodes = rowGroups.get(rowKey)!
    const rowWidth = rowNodes.length * NODE_WIDTH + (rowNodes.length - 1) * COL_GAP
    const startX = CANVAS_PADDING + (maxRowWidth - rowWidth) / 2
    const y = CANVAS_PADDING + rowIndex * (NODE_HEIGHT + ROW_GAP)

    rowNodes.forEach((node, colIndex) => {
      const x = startX + colIndex * (NODE_WIDTH + COL_GAP)
      nodeMap.set(node.id, {
        ...node,
        x,
        y,
        row: rowIndex,
        col: colIndex
      })
    })
  })

  const canvasWidth = maxRowWidth + CANVAS_PADDING * 2 + 120
  const canvasHeight = sortedRowKeys.length * (NODE_HEIGHT + ROW_GAP) + CANVAS_PADDING * 2

  // 6. Compute Orthogonal Edge Routing with Anti-Collision Label Placement
  const routedEdges: RoutedEdge[] = []
  const edgeCountBetween = new Map<string, number>()

  // Keep track of placed bounding boxes to actively prevent overlaps
  const nodeBoxes: BoundingBox[] = Array.from(nodeMap.values()).map(n => ({
    x: n.x + NODE_WIDTH / 2,
    y: n.y + NODE_HEIGHT / 2,
    width: NODE_WIDTH,
    height: NODE_HEIGHT
  }))
  const placedLabelBoxes: BoundingBox[] = []

  validEdges.forEach((e) => {
    const fromNode = nodeMap.get(e.from)
    const toNode = nodeMap.get(e.to)
    if (!fromNode || !toNode) return

    const key = `${e.from}->${e.to}`
    const count = edgeCountBetween.get(key) || 0
    edgeCountBetween.set(key, count + 1)
    const offset = count * 14

    const isBackward = fromNode.row > toNode.row || backwardEdges.has(`${e.from}->${e.to}`)

    let path = ""
    const { lines, width: labelWidth, height: labelHeight } = formatLabel(e.label)
    const candidates: { x: number; y: number }[] = []

    if (isBackward) {
      // ── Backward / Feedback loop: Route around the perimeter ──
      const gutterX = CANVAS_PADDING + maxRowWidth + 40 + offset
      const startX = fromNode.x + NODE_WIDTH
      const startY = fromNode.y + NODE_HEIGHT / 2
      const endX = toNode.x + NODE_WIDTH
      const endY = toNode.y + NODE_HEIGHT / 2

      path = `M ${startX} ${startY} L ${gutterX} ${startY} L ${gutterX} ${endY} L ${endX} ${endY}`

      const labelCenterX = gutterX + labelWidth / 2 + 12
      candidates.push(
        { x: labelCenterX, y: (startY + endY) / 2 },
        { x: labelCenterX, y: (startY + endY) / 2 - 32 },
        { x: labelCenterX, y: (startY + endY) / 2 + 32 },
        { x: labelCenterX, y: startY },
        { x: labelCenterX, y: endY }
      )
    } else if (fromNode.row === toNode.row) {
      // ── Same row: Horizontal direct route ──
      const isLeftToRight = fromNode.x < toNode.x
      const startX = isLeftToRight ? fromNode.x + NODE_WIDTH : fromNode.x
      const startY = fromNode.y + NODE_HEIGHT / 2
      const endX = isLeftToRight ? toNode.x : toNode.x + NODE_WIDTH
      const endY = toNode.y + NODE_HEIGHT / 2
      path = `M ${startX} ${startY} L ${endX} ${endY}`

      const midX = (startX + endX) / 2
      candidates.push(
        { x: midX, y: startY - 18 },
        { x: midX, y: startY + 18 },
        { x: midX, y: startY - 36 },
        { x: midX, y: startY + 36 }
      )
    } else {
      // ── Forward vertical tiered route (Clean 90° Orthogonal Step) ──
      const startX = fromNode.x + NODE_WIDTH / 2 + offset
      const startY = fromNode.y + NODE_HEIGHT
      const endX = toNode.x + NODE_WIDTH / 2 + offset
      const endY = toNode.y
      const midY = (startY + endY) / 2
      const midX = (startX + endX) / 2

      if (Math.abs(startX - endX) < 4) {
        path = `M ${startX} ${startY} L ${endX} ${endY}`
      } else {
        path = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`
      }

      // Generate staggered candidates along the horizontal step and vertical segments
      candidates.push(
        // Primary candidate: along horizontal step
        { x: midX, y: midY },
        // Staggered vertical lanes (prevents horizontal collision between multiple edges)
        { x: midX, y: midY - 26 },
        { x: midX, y: midY + 26 },
        // Staggered along horizontal line towards source or target
        { x: startX * 0.7 + endX * 0.3, y: midY },
        { x: startX * 0.3 + endX * 0.7, y: midY },
        { x: startX * 0.7 + endX * 0.3, y: midY - 26 },
        { x: startX * 0.3 + endX * 0.7, y: midY + 26 },
        // Upper vertical segment lane (near source bottom)
        { x: startX, y: startY + 34 },
        // Lower vertical segment lane (near target top)
        { x: endX, y: endY - 34 },
        // Extreme vertical offsets for dense multi-edge graphs
        { x: midX, y: midY - 48 },
        { x: midX, y: midY + 48 }
      )
    }

    // ── Collision Avoidance Selection ──
    let bestPos = candidates[0] || { x: 0, y: 0 }

    if (lines.length > 0) {
      let minScore = Infinity

      for (const cand of candidates) {
        const testBox: BoundingBox = {
          x: cand.x,
          y: cand.y,
          width: labelWidth,
          height: labelHeight
        }

        let score = 0

        // Strict avoidance of node cards
        for (const nb of nodeBoxes) {
          if (checkCollision(testBox, nb, 10, 10)) {
            score += 100
          }
        }

        // Avoidance of previously placed labels
        for (const pb of placedLabelBoxes) {
          if (checkCollision(testBox, pb, 16, 12)) {
            score += 10
          }
        }

        if (score === 0) {
          bestPos = cand
          break
        }

        if (score < minScore) {
          minScore = score
          bestPos = cand
        }
      }

      placedLabelBoxes.push({
        x: bestPos.x,
        y: bestPos.y,
        width: labelWidth,
        height: labelHeight
      })
    }

    routedEdges.push({
      from: e.from,
      to: e.to,
      label: e.label,
      lines,
      labelWidth,
      labelHeight,
      path,
      labelPos: bestPos,
      isBackward
    })
  })

  return { nodeMap, routedEdges, canvasWidth, canvasHeight }
}

// ─── Node Component (Standard Rectangular Structure) ──────────────────────────

function NodeIcon({ type }: { type: FlowchartNode["type"] }) {
  switch (type) {
    case "actor":
      return <User className="h-3.5 w-3.5 text-foreground/80" />
    case "service":
      return <Server className="h-3.5 w-3.5 text-foreground/80" />
    case "database":
      return <Database className="h-3.5 w-3.5 text-foreground/80" />
    case "process":
      return <Cpu className="h-3.5 w-3.5 text-foreground/80" />
    case "external":
      return <Globe className="h-3.5 w-3.5 text-foreground/80" />
    case "decision":
      return <GitFork className="h-3.5 w-3.5 text-foreground/80" />
    default:
      return <Server className="h-3.5 w-3.5 text-foreground/80" />
  }
}

function StandardNodeCard({
  node,
  isHighlighted,
  isSelected,
  isDimmed,
  onMouseEnter,
  onMouseLeave,
  onClick
}: {
  node: PositionedNode
  isHighlighted: boolean
  isSelected: boolean
  isDimmed: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: (e: React.MouseEvent) => void
}) {
  const isExternal = node.type === "external"
  const isDatabase = node.type === "database"

  return (
    <div
      className={`absolute transition-all duration-200 select-none cursor-pointer group ${
        isDimmed ? "opacity-25" : "opacity-100"
      }`}
      style={{
        left: node.x,
        top: node.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* Rectangular Card Container */}
      <div
        className={`w-full h-full bg-background border flex flex-col justify-between transition-all duration-200 ${
          isExternal ? "border-dashed" : "border-solid"
        } ${
          isSelected
            ? "border-foreground bg-foreground/5 shadow-[0_0_24px_rgba(255,255,255,0.15)] ring-1 ring-foreground"
            : isHighlighted
              ? "border-foreground shadow-[0_0_16px_rgba(255,255,255,0.08)]"
              : "border-foreground/40 hover:border-foreground hover:bg-muted/20"
        } ${isDatabase ? "border-l-4 border-l-foreground" : ""}`}
      >
        {/* Card Header: Type Badge + Icon */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/40">
          <div className="flex items-center gap-1.5">
            <NodeIcon type={node.type} />
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
              {node.type}
            </span>
          </div>
          <span className="font-mono text-[8px] text-muted-foreground/60">
            R{node.row + 1}
          </span>
        </div>

        {/* Card Body: Label + Tech / Summary */}
        <div className="px-3 py-2 flex flex-col justify-center flex-1 min-w-0">
          <span
            className={`font-mono text-xs font-bold leading-tight truncate transition-colors ${
              isSelected || isHighlighted ? "text-foreground" : "text-foreground/90"
            }`}
            title={node.label}
          >
            {node.label}
          </span>
          {node.tech && node.tech.length > 0 && (
            <span className="font-mono text-[9px] text-muted-foreground truncate mt-0.5">
              {node.tech.slice(0, 2).join(" · ")}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Flowchart Renderer ──────────────────────────────────────────────────

export function FlowchartRenderer({ data }: { data: FlowchartData }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  // Layout calculations
  const { nodeMap, routedEdges, canvasWidth, canvasHeight } = useMemo(() => {
    return computeLayout(data.nodes, data.edges)
  }, [data.nodes, data.edges])

  // Center diagram in viewport helper
  const centerDiagram = useCallback((targetScale?: number) => {
    const viewport = viewportRef.current
    if (!viewport) return

    const vw = viewport.clientWidth || 900
    const vh = viewport.clientHeight || 560

    // Compute fit scale if targetScale is not provided
    const fitScale = targetScale ?? Math.min(1, Math.max(0.65, (vw - 80) / canvasWidth))
    const cx = Math.round((vw - canvasWidth * fitScale) / 2)
    const cy = Math.max(30, Math.round((vh - canvasHeight * fitScale) / 2))

    setScale(fitScale)
    setTranslate({ x: cx, y: cy })
  }, [canvasWidth, canvasHeight])

  // Center on initial mount and whenever data / canvasWidth changes
  useEffect(() => {
    centerDiagram()
  }, [centerDiagram])

  // Connected node IDs for high-contrast highlighting
  const getConnectedNodeIds = useCallback(
    (nodeId: string): Set<string> => {
      const set = new Set<string>()
      set.add(nodeId)
      data.edges.forEach(e => {
        if (e.from === nodeId) set.add(e.to)
        if (e.to === nodeId) set.add(e.from)
      })
      return set
    },
    [data.edges]
  )

  const highlightedIds = hoveredNodeId ? getConnectedNodeIds(hoveredNodeId) : new Set<string>()

  // Zoom anchored to a specific point (e.g. viewport center or mouse cursor)
  // This mathematically prevents the diagram from drifting leftwards on zoom in/out!
  const zoomAroundPoint = useCallback((newScale: number, anchorX: number, anchorY: number) => {
    if (isLocked) return

    setScale(oldScale => {
      const clampedScale = Math.max(0.35, Math.min(2.2, newScale))
      setTranslate(oldTranslate => {
        // Find point in diagram coordinates under anchor:
        const diagramX = (anchorX - oldTranslate.x) / oldScale
        const diagramY = (anchorY - oldTranslate.y) / oldScale

        return {
          x: Math.round(anchorX - diagramX * clampedScale),
          y: Math.round(anchorY - diagramY * clampedScale)
        }
      })
      return clampedScale
    })
  }, [isLocked])

  // Zoom controls (locked when isLocked is true; anchored to viewport center)
  const zoomIn = () => {
    if (isLocked) return
    const vw = viewportRef.current?.clientWidth || 900
    const vh = viewportRef.current?.clientHeight || 560
    zoomAroundPoint(scale + 0.15, vw / 2, vh / 2)
  }

  const zoomOut = () => {
    if (isLocked) return
    const vw = viewportRef.current?.clientWidth || 900
    const vh = viewportRef.current?.clientHeight || 560
    zoomAroundPoint(scale - 0.15, vw / 2, vh / 2)
  }

  const resetView = () => {
    if (isLocked) return
    centerDiagram()
  }

  // Directional slide / pan function (used by UI buttons, sliders, and arrow keys)
  const slideDiagram = useCallback((dx: number, dy: number) => {
    if (isLocked) return
    setTranslate(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }))
  }, [isLocked])

  // Keyboard navigation: Left, Right, Up, Down arrow keys to slide diagram window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return

      // Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return
      }

      const STEP = e.shiftKey ? 140 : 70
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        slideDiagram(STEP, 0)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        slideDiagram(-STEP, 0)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        slideDiagram(0, STEP)
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        slideDiagram(0, -STEP)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isLocked, slideDiagram])

  // Pan controls (locked when isLocked is true)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return
    if (e.button === 0) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isLocked || !isPanning) return
    setTranslate({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    })
  }

  const handleMouseUp = () => setIsPanning(false)

  // Wheel zoom anchored to current mouse pointer position
  const handleWheel = useCallback((e: WheelEvent) => {
    if (isLocked) return
    e.preventDefault()

    const viewport = viewportRef.current
    if (!viewport) return

    const rect = viewport.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const delta = e.deltaY > 0 ? -0.06 : 0.06

    zoomAroundPoint(scale + delta, mouseX, mouseY)
  }, [isLocked, scale, zoomAroundPoint])

  useEffect(() => {
    const vp = viewportRef.current
    if (vp) {
      vp.addEventListener("wheel", handleWheel, { passive: false })
      return () => vp.removeEventListener("wheel", handleWheel)
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

  const selectedNode = selectedNodeId ? data.nodes.find(n => n.id === selectedNodeId) : null

  return (
    <div className="relative w-full bg-background select-none" ref={containerRef}>
      {/* ── Toolbar Chrome ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-foreground/20 bg-background/95">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span>architecture.flow</span>
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/60 hidden sm:inline">
            [{data.nodes.length} nodes · {data.edges.length} connections]
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Lock In / Zoom Lock Button */}
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`font-mono text-xs border px-2.5 py-1 mr-1 transition-colors flex items-center gap-1.5 cursor-pointer ${
              isLocked
                ? "bg-foreground text-background border-foreground font-bold shadow-sm"
                : "border-foreground/30 text-muted-foreground hover:bg-foreground hover:text-background"
            }`}
            title={isLocked ? "Controls are locked. Click to unlock zoom & pan" : "Lock zoom and pan"}
          >
            {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            <span>{isLocked ? "locked" : "lock"}</span>
          </button>

          <button
            onClick={zoomOut}
            disabled={isLocked}
            className={`font-mono text-xs border border-foreground/30 px-2 py-1 transition-colors ${
              isLocked
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-foreground hover:text-background cursor-pointer"
            }`}
            title={isLocked ? "Zoom is locked" : "Zoom out"}
          >
            <ZoomOut className="h-3 w-3" />
          </button>

          {/* Zoom Slider */}
          <input
            type="range"
            min={35}
            max={220}
            value={Math.round(scale * 100)}
            onChange={(e) => {
              const newScale = parseInt(e.target.value) / 100
              const vw = viewportRef.current?.clientWidth || 900
              const vh = viewportRef.current?.clientHeight || 560
              zoomAroundPoint(newScale, vw / 2, vh / 2)
            }}
            disabled={isLocked}
            className={`w-14 sm:w-20 h-1 accent-foreground transition-opacity ${
              isLocked ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
            }`}
            title="Zoom slider"
          />

          <span className="font-mono text-xs text-muted-foreground px-1.5 min-w-[3.2rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={isLocked}
            className={`font-mono text-xs border border-foreground/30 px-2 py-1 transition-colors ${
              isLocked
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-foreground hover:text-background cursor-pointer"
            }`}
            title={isLocked ? "Zoom is locked" : "Zoom in"}
          >
            <ZoomIn className="h-3 w-3" />
          </button>
          <button
            onClick={resetView}
            disabled={isLocked}
            className={`font-mono text-xs border border-foreground/30 px-2.5 py-1 ml-1 transition-colors flex items-center gap-1 ${
              isLocked
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-foreground hover:text-background cursor-pointer"
            }`}
            title={isLocked ? "Position is locked" : "Reset position"}
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">reset</span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="font-mono text-xs border border-foreground/30 px-2.5 py-1 ml-1 hover:bg-foreground hover:text-background transition-colors flex items-center gap-1 cursor-pointer"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            <span className="hidden sm:inline">{isFullscreen ? "exit" : "fullscreen"}</span>
          </button>
        </div>
      </div>

      {/* ── Canvas Viewport ── */}
      <div
        ref={viewportRef}
        tabIndex={0}
        className={`relative overflow-hidden bg-background focus:outline-none ${
          isLocked ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        }`}
        style={{ minHeight: "520px", height: isFullscreen ? "100vh" : "72vh" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Subtle Architectural Dot Grid */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: `${32 * scale}px ${32 * scale}px`,
            backgroundPosition: `${translate.x}px ${translate.y}px`
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "0 0"
          }}
        >
          {/* ── SVG Layer: Orthogonal Connectors & Labels ── */}
          <svg
            width={canvasWidth}
            height={canvasHeight}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ overflow: "visible" }}
          >
            <defs>
              <marker
                id="orthogonal-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M 0 1 L 6 4 L 0 7 Z" className="fill-foreground/40" />
              </marker>
              <marker
                id="orthogonal-arrow-active"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M 0 1 L 6 4 L 0 7 Z" className="fill-foreground" />
              </marker>
            </defs>

            {/* Subgraph Groupings */}
            {data.subgraphs?.map(sg => {
              const sgNodes = sg.nodeIds.map(id => nodeMap.get(id)).filter(Boolean) as PositionedNode[]
              if (sgNodes.length === 0) return null

              const minX = Math.min(...sgNodes.map(n => n.x)) - 16
              const minY = Math.min(...sgNodes.map(n => n.y)) - 28
              const maxX = Math.max(...sgNodes.map(n => n.x + NODE_WIDTH)) + 16
              const maxY = Math.max(...sgNodes.map(n => n.y + NODE_HEIGHT)) + 16

              return (
                <g key={sg.id}>
                  <rect
                    x={minX}
                    y={minY}
                    width={maxX - minX}
                    height={maxY - minY}
                    className="fill-foreground/[0.02] stroke-foreground/15"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    rx={2}
                  />
                  <text
                    x={minX + 8}
                    y={minY + 14}
                    className="fill-foreground/40 font-mono"
                    fontSize={10}
                    fontFamily="monospace"
                  >
                    // {sg.label}
                  </text>
                </g>
              )
            })}

            {/* 1. Render all orthogonal edge paths first */}
            {routedEdges.map((edge, i) => {
              const isEdgeHighlighted =
                hoveredNodeId !== null &&
                (edge.from === hoveredNodeId || edge.to === hoveredNodeId)

              const isEdgeDimmed = hoveredNodeId !== null && !isEdgeHighlighted

              return (
                <g key={`edge-path-${i}`} className="transition-opacity duration-200">
                  {/* Orthogonal connector line */}
                  <path
                    d={edge.path}
                    fill="none"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className={`transition-all duration-200 ${
                      isEdgeHighlighted
                        ? "stroke-foreground"
                        : isEdgeDimmed
                          ? "stroke-foreground/10"
                          : "stroke-foreground/35"
                    }`}
                    strokeWidth={isEdgeHighlighted ? 2 : 1.25}
                    strokeDasharray={edge.isBackward ? "4 4" : "none"}
                    markerEnd={isEdgeHighlighted ? "url(#orthogonal-arrow-active)" : "url(#orthogonal-arrow)"}
                  />

                  {/* Flow animation on highlighted edge */}
                  {isEdgeHighlighted && (
                    <path
                      d={edge.path}
                      fill="none"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      className="stroke-foreground"
                      strokeWidth={2}
                      strokeDasharray="6 6"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="24"
                        to="0"
                        dur="0.6s"
                        repeatCount="indefinite"
                      />
                    </path>
                  )}
                </g>
              )
            })}

            {/* 2. Render all non-hovered edge label pills (anti-collision placed) */}
            {routedEdges.map((edge, i) => {
              if (edge.lines.length === 0) return null
              const isEdgeHighlighted =
                hoveredNodeId !== null &&
                (edge.from === hoveredNodeId || edge.to === hoveredNodeId)
              if (isEdgeHighlighted) return null // Rendered on top in step 3

              const isEdgeDimmed = hoveredNodeId !== null && !isEdgeHighlighted

              return (
                <g
                  key={`edge-label-${i}`}
                  transform={`translate(${edge.labelPos.x}, ${edge.labelPos.y})`}
                  className="cursor-pointer pointer-events-auto transition-opacity duration-200"
                  onMouseEnter={() => setHoveredNodeId(edge.from)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  <rect
                    x={-edge.labelWidth / 2}
                    y={-edge.labelHeight / 2}
                    width={edge.labelWidth}
                    height={edge.labelHeight}
                    rx={4}
                    className={`transition-all duration-200 ${
                      isEdgeDimmed
                        ? "fill-background stroke-border/20 opacity-30"
                        : "fill-background stroke-border/70 shadow-sm"
                    }`}
                    strokeWidth={1}
                  />

                  {edge.lines.length === 1 ? (
                    <text
                      x={0}
                      y={3.5}
                      textAnchor="middle"
                      className={`font-mono text-[9px] font-medium select-none transition-colors ${
                        isEdgeDimmed ? "fill-muted-foreground/30" : "fill-foreground/80"
                      }`}
                      fontFamily="monospace"
                    >
                      {edge.lines[0]}
                    </text>
                  ) : (
                    <>
                      <text
                        x={0}
                        y={-3}
                        textAnchor="middle"
                        className={`font-mono text-[9px] font-semibold select-none transition-colors ${
                          isEdgeDimmed ? "fill-muted-foreground/30" : "fill-foreground/90"
                        }`}
                        fontFamily="monospace"
                      >
                        {edge.lines[0]}
                      </text>
                      <text
                        x={0}
                        y={9}
                        textAnchor="middle"
                        className={`font-mono text-[8px] select-none transition-colors ${
                          isEdgeDimmed ? "fill-muted-foreground/20" : "fill-muted-foreground"
                        }`}
                        fontFamily="monospace"
                      >
                        {edge.lines[1]}
                      </text>
                    </>
                  )}
                </g>
              )
            })}

            {/* 3. Render highlighted edge's label pill on top of everything */}
            {routedEdges.map((edge, i) => {
              if (edge.lines.length === 0) return null
              const isEdgeHighlighted =
                hoveredNodeId !== null &&
                (edge.from === hoveredNodeId || edge.to === hoveredNodeId)
              if (!isEdgeHighlighted) return null

              return (
                <g
                  key={`edge-label-active-${i}`}
                  transform={`translate(${edge.labelPos.x}, ${edge.labelPos.y})`}
                  className="cursor-pointer pointer-events-auto"
                >
                  <rect
                    x={-edge.labelWidth / 2}
                    y={-edge.labelHeight / 2}
                    width={edge.labelWidth}
                    height={edge.labelHeight}
                    rx={4}
                    className="fill-foreground stroke-foreground shadow-md"
                    strokeWidth={1.5}
                  />

                  {edge.lines.length === 1 ? (
                    <text
                      x={0}
                      y={3.5}
                      textAnchor="middle"
                      className="font-mono text-[9px] font-bold select-none fill-background"
                      fontFamily="monospace"
                    >
                      {edge.lines[0]}
                    </text>
                  ) : (
                    <>
                      <text
                        x={0}
                        y={-3}
                        textAnchor="middle"
                        className="font-mono text-[9px] font-bold select-none fill-background"
                        fontFamily="monospace"
                      >
                        {edge.lines[0]}
                      </text>
                      <text
                        x={0}
                        y={9}
                        textAnchor="middle"
                        className="font-mono text-[8px] select-none fill-background/90"
                        fontFamily="monospace"
                      >
                        {edge.lines[1]}
                      </text>
                    </>
                  )}
                </g>
              )
            })}
          </svg>

          {/* ── HTML Layer: Standard Rectangular Node Cards ── */}
          {Array.from(nodeMap.values()).map(node => {
            const isHighlighted = highlightedIds.has(node.id)
            const isSelected = selectedNodeId === node.id
            const isDimmed = hoveredNodeId !== null && !isHighlighted

            return (
              <StandardNodeCard
                key={node.id}
                node={node}
                isHighlighted={isHighlighted}
                isSelected={isSelected}
                isDimmed={isDimmed}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={e => {
                  e.stopPropagation()
                  setSelectedNodeId(selectedNodeId === node.id ? null : node.id)
                }}
              />
            )
          })}
        </div>

        {/* ── Directional Slider & Arrow Pad Controls ── */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col items-center bg-background/90 backdrop-blur-sm border border-foreground/30 p-2 shadow-lg select-none">
          <div className="flex items-center justify-between w-full mb-1">
            <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Move className="h-2.5 w-2.5" /> Navigate
            </span>
          </div>

          {/* Up Arrow */}
          <button
            onClick={() => slideDiagram(0, 70)}
            disabled={isLocked}
            className={`p-1.5 border border-foreground/30 transition-colors ${
              isLocked
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-foreground hover:text-background cursor-pointer active:scale-95"
            }`}
            title="Slide Up (or press ↑ on keyboard)"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>

          {/* Left, Center, Right Arrows */}
          <div className="flex items-center gap-1 my-1">
            <button
              onClick={() => slideDiagram(70, 0)}
              disabled={isLocked}
              className={`p-1.5 border border-foreground/30 transition-colors ${
                isLocked
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-foreground hover:text-background cursor-pointer active:scale-95"
              }`}
              title="Slide Left (or press ← on keyboard)"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={resetView}
              disabled={isLocked}
              className={`w-7 h-7 text-[10px] font-mono border border-foreground/30 transition-colors flex items-center justify-center ${
                isLocked
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-foreground hover:text-background cursor-pointer active:scale-95"
              }`}
              title="Center Diagram"
            >
              •
            </button>
            <button
              onClick={() => slideDiagram(-70, 0)}
              disabled={isLocked}
              className={`p-1.5 border border-foreground/30 transition-colors ${
                isLocked
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-foreground hover:text-background cursor-pointer active:scale-95"
              }`}
              title="Slide Right (or press → on keyboard)"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Down Arrow */}
          <button
            onClick={() => slideDiagram(0, -70)}
            disabled={isLocked}
            className={`p-1.5 border border-foreground/30 transition-colors ${
              isLocked
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-foreground hover:text-background cursor-pointer active:scale-95"
            }`}
            title="Slide Down (or press ↓ on keyboard)"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>

          <span className="font-mono text-[7px] text-muted-foreground/60 mt-1">
            ↑ ↓ ← →
          </span>
        </div>

        {/* ── Dual Window Sliders (Horizontal & Vertical) ── */}
        <div className="absolute bottom-4 left-4 z-20 hidden sm:flex flex-col gap-1.5 bg-background/90 backdrop-blur-sm border border-foreground/30 px-3 py-2 shadow-lg select-none font-mono">
          <div className="flex items-center justify-between gap-3 text-muted-foreground pb-1 border-b border-foreground/15">
            <span className="flex items-center gap-1 uppercase tracking-wider text-[8px] font-semibold text-foreground">
              <SlidersHorizontal className="h-2.5 w-2.5" /> Window Sliders
            </span>
            <span className="text-[7.5px] text-muted-foreground/70">
              Keys: ↑ ↓ ← →
            </span>
          </div>

          {/* Horizontal X Slider (Left / Right) */}
          <div className="flex items-center gap-1.5 text-[9px]">
            <span className="w-2.5 text-muted-foreground font-semibold">X</span>
            <button
              onClick={() => slideDiagram(70, 0)}
              disabled={isLocked}
              className={`p-1 border border-foreground/30 transition-colors ${
                isLocked
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-foreground hover:text-background cursor-pointer active:scale-95"
              }`}
              title="Slide Window Left (or press ← key)"
            >
              <ArrowLeft className="h-2.5 w-2.5" />
            </button>
            <input
              type="range"
              step={25}
              min={-Math.max(1200, Math.round(canvasWidth))}
              max={Math.max(1200, Math.round(canvasWidth))}
              value={translate.x}
              onChange={(e) => {
                if (isLocked) return
                setTranslate(prev => ({ ...prev, x: parseInt(e.target.value) }))
              }}
              disabled={isLocked}
              className={`w-28 sm:w-36 h-1 accent-foreground ${
                isLocked ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
              title="Horizontal Window Slider (control with ← / → arrows)"
            />
            <button
              onClick={() => slideDiagram(-70, 0)}
              disabled={isLocked}
              className={`p-1 border border-foreground/30 transition-colors ${
                isLocked
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-foreground hover:text-background cursor-pointer active:scale-95"
              }`}
              title="Slide Window Right (or press → key)"
            >
              <ArrowRight className="h-2.5 w-2.5" />
            </button>
          </div>

          {/* Vertical Y Slider (Up / Down) */}
          <div className="flex items-center gap-1.5 text-[9px]">
            <span className="w-2.5 text-muted-foreground font-semibold">Y</span>
            <button
              onClick={() => slideDiagram(0, 70)}
              disabled={isLocked}
              className={`p-1 border border-foreground/30 transition-colors ${
                isLocked
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-foreground hover:text-background cursor-pointer active:scale-95"
              }`}
              title="Slide Window Up (or press ↑ key)"
            >
              <ArrowUp className="h-2.5 w-2.5" />
            </button>
            <input
              type="range"
              step={25}
              min={-Math.max(1200, Math.round(canvasHeight))}
              max={Math.max(1200, Math.round(canvasHeight))}
              value={translate.y}
              onChange={(e) => {
                if (isLocked) return
                setTranslate(prev => ({ ...prev, y: parseInt(e.target.value) }))
              }}
              disabled={isLocked}
              className={`w-28 sm:w-36 h-1 accent-foreground ${
                isLocked ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
              }`}
              title="Vertical Window Slider (control with ↑ / ↓ arrows)"
            />
            <button
              onClick={() => slideDiagram(0, -70)}
              disabled={isLocked}
              className={`p-1 border border-foreground/30 transition-colors ${
                isLocked
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-foreground hover:text-background cursor-pointer active:scale-95"
              }`}
              title="Slide Window Down (or press ↓ key)"
            >
              <ArrowDown className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Slide-up Node Details Drawer ── */}
      {selectedNode && (
        <div className="border-t border-foreground bg-background animate-in slide-in-from-bottom-2 duration-200">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground border border-foreground/30 px-2 py-0.5 flex items-center gap-1.5">
                    <NodeIcon type={selectedNode.type} />
                    {selectedNode.type}
                  </span>
                  <h3 className="font-mono text-sm font-bold text-foreground">
                    {selectedNode.label}
                  </h3>
                </div>

                {selectedNode.description && (
                  <p className="font-mono text-xs text-muted-foreground leading-relaxed max-w-2xl">
                    {selectedNode.description}
                  </p>
                )}

                {selectedNode.tech && selectedNode.tech.length > 0 && (
                  <div className="flex gap-2 flex-wrap pt-1">
                    {selectedNode.tech.map(t => (
                      <span
                        key={t}
                        className="font-mono text-[10px] border border-foreground px-2 py-0.5 uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background transition-colors"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedNodeId(null)}
                className="font-mono text-xs text-muted-foreground hover:text-foreground border border-border px-2 py-1 transition-colors"
              >
                [close ✕]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Architectural Legend ── */}
      <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20">
        <div className="flex flex-wrap gap-4 items-center justify-between text-[10px] font-mono text-muted-foreground">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="uppercase tracking-wider font-semibold text-foreground/70">
              Components:
            </span>
            {(
              [
                { type: "actor", label: "Actor / Client" },
                { type: "service", label: "Service / API" },
                { type: "database", label: "Database / Store" },
                { type: "process", label: "Pipeline / Worker" },
                { type: "external", label: "External Service" },
                { type: "decision", label: "Gateway / Decision" }
              ] as const
            ).map(item => (
              <div key={item.type} className="flex items-center gap-1.5">
                <NodeIcon type={item.type} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <span className="hidden md:inline text-muted-foreground/60">
            Solid line = forward call · Dashed line = return / feedback
          </span>
        </div>
      </div>
    </div>
  )
}
