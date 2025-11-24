import { useMemo } from 'react';
import { useTopologyStore } from '../../hooks/useTopologyStore';
import type { TopologyNode, TopologyEdge } from '../../lib/topology/types';
import './TopologyGraph.css';

interface LayeredNode extends TopologyNode {
  x: number;
  y: number;
  layer: number;
}

export function TopologyGraph() {
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const selectedNode = useTopologyStore((s) => s.selectedNode);
  const setSelectedNode = useTopologyStore((s) => s.setSelectedNode);
  const setHoveredNode = useTopologyStore((s) => s.setHoveredNode);

  // Calculate layered layout
  const layeredNodes = useMemo((): LayeredNode[] => {
    const canvasWidth = 1200;
    const canvasHeight = 800;
    const layerSpacing = canvasWidth / 6; // 6 layers
    const baseX = 100; // Start X position

    // Define layers (left to right):
    // 0: Infrastructure (Postgres, Redis, MQTT Broker)
    // 1: Core Services (API, Orchestrator, MQTT Gateway, Realtime Gateway)
    // 2: Rooms
    // 3: Controllers
    // 4: Devices

    const layerGroups: Record<number, TopologyNode[]> = {
      0: nodes.filter((n) => n.type === 'infra'),
      1: nodes.filter((n) => n.type === 'service'),
      2: nodes.filter((n) => n.type === 'room'),
      3: nodes.filter((n) => n.type === 'controller'),
      4: nodes.filter((n) => n.type === 'device'),
    };

    const positioned: LayeredNode[] = [];

    Object.keys(layerGroups).forEach((layerKey) => {
      const layer = parseInt(layerKey);
      const layerNodes = layerGroups[layer];
      const layerX = baseX + layer * layerSpacing;

      const nodeCount = layerNodes.length;
      const verticalSpacing = canvasHeight / (nodeCount + 1);

      layerNodes.forEach((node, index) => {
        const y = verticalSpacing * (index + 1);

        positioned.push({
          ...node,
          x: layerX,
          y,
          layer,
        });
      });
    });

    return positioned;
  }, [nodes]);

  const handleNodeClick = (node: LayeredNode) => {
    setSelectedNode(node.id);
  };

  const handleNodeMouseEnter = (node: LayeredNode) => {
    setHoveredNode(node.id);
  };

  const handleNodeMouseLeave = () => {
    setHoveredNode(null);
  };

  // Helper to get node position by ID
  const getNodePosition = (nodeId: string): { x: number; y: number } | null => {
    const node = layeredNodes.find((n) => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : null;
  };

  // Check if edge is active (recent event)
  const isEdgeActive = (edge: TopologyEdge): boolean => {
    if (!edge.lastEventAt) return false;
    const now = Date.now();
    const eventTime = new Date(edge.lastEventAt).getTime();
    return now - eventTime < 5000; // Active for 5 seconds
  };

  // Get node color by status
  const getNodeColor = (node: LayeredNode): string => {
    switch (node.status) {
      case 'online':
        return '#00ff00';
      case 'offline':
        return '#ff4444';
      case 'degraded':
        return '#ffa500';
      default:
        return '#888';
    }
  };

  return (
    <div className="topology-graph">
      <svg width="100%" height="100%" viewBox="0 0 1200 800">
        <defs>
          {/* Gradient for active edges */}
          <linearGradient id="activeEdgeGradient">
            <stop offset="0%" stopColor="rgba(0, 255, 255, 0.8)" />
            <stop offset="100%" stopColor="rgba(0, 255, 255, 0.2)" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Render edges */}
        <g className="edges-layer">
          {edges.map((edge) => {
            const source = getNodePosition(edge.sourceId);
            const target = getNodePosition(edge.targetId);

            if (!source || !target) return null;

            const active = isEdgeActive(edge);

            return (
              <g key={edge.id}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={active ? 'url(#activeEdgeGradient)' : 'rgba(0, 255, 255, 0.2)'}
                  strokeWidth={active ? 2 : 1}
                  className={active ? 'edge active' : 'edge'}
                />
                {edge.label && (
                  <text
                    x={(source.x + target.x) / 2}
                    y={(source.y + target.y) / 2 - 5}
                    fill="rgba(0, 255, 255, 0.6)"
                    fontSize="10"
                    textAnchor="middle"
                    className="edge-label"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Render nodes */}
        <g className="nodes-layer">
          {layeredNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const color = getNodeColor(node);

            return (
              <g
                key={node.id}
                className={`node ${isSelected ? 'selected' : ''}`}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => handleNodeMouseEnter(node)}
                onMouseLeave={handleNodeMouseLeave}
                style={{ cursor: 'pointer' }}
              >
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected ? 18 : 15}
                  fill={color}
                  fillOpacity={0.3}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                  filter={isSelected ? 'url(#glow)' : undefined}
                  className="node-circle"
                />

                {/* Node label */}
                <text
                  x={node.x}
                  y={node.y + 28}
                  fill="var(--color-cyan)"
                  fontSize="11"
                  textAnchor="middle"
                  className="node-label"
                >
                  {node.label}
                </text>

                {/* Node type badge */}
                <text
                  x={node.x}
                  y={node.y + 40}
                  fill="rgba(0, 255, 255, 0.5)"
                  fontSize="8"
                  textAnchor="middle"
                  className="node-type"
                >
                  {node.type}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
