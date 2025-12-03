import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges
} from '@xyflow/react';
import type { Node as FlowNode, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PuzzleNodePalette } from '../components/PuzzleEditor/PuzzleNodePalette';
import { PuzzlePropertiesPanel } from '../components/PuzzleEditor/PuzzlePropertiesPanel';
import { PuzzleNode } from '../components/PuzzleEditor/PuzzleNode';
import { PuzzleDetailsModal } from '../components/PuzzleEditor/PuzzleDetailsModal';
import { api, type Device, type Puzzle } from '../lib/api';
import { useRoomContext } from '../contexts/RoomContext';
import { useWebSocket } from '../hooks/useWebSocket';
import type { DomainEvent } from '../types/events';
import styles from './PuzzleEditor.module.css';

const nodeTypes = {
  puzzleNode: PuzzleNode,
};

const initialNodes: FlowNode[] = [];
const initialEdges: Array<{ id: string; type: 'default'; animated: boolean; style: { stroke: string; strokeWidth: number }; source: string; target: string; sourceHandle: string | null; targetHandle: string | null }> = [];

function PuzzleEditorInner() {
  const queryClient = useQueryClient();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { selectedClientId, selectedRoomId: contextRoomId } = useRoomContext();

  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<Array<{ id: string; type: 'default'; animated: boolean; style: { stroke: string; strokeWidth: number }; source: string; target: string; sourceHandle: string | null; targetHandle: string | null }>>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | null>(null);
  const [puzzleInfo, setPuzzleInfo] = useState({
    name: 'New Puzzle',
    description: '',
    timeout_seconds: undefined as number | undefined,
    hint_text: '',
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [deviceStates, setDeviceStates] = useState<Record<string, any>>({});

  // Use roomId from URL or context
  const activeRoomId = roomId || contextRoomId;

  // Redirect if no room selected
  useEffect(() => {
    if (!activeRoomId) {
      navigate('/monitor');
    }
  }, [activeRoomId, navigate]);

  // Fetch devices
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: api.getDevices,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // WebSocket connection for live device states
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';

  const handleWebSocketEvent = useCallback((event: DomainEvent) => {
    if (event.type === 'device_state_changed' && event.device_id) {
      const latestState = event.payload?.new_state || event.payload;
      setDeviceStates(prev => ({
        ...prev,
        [event.device_id!]: latestState,
      }));
    }
  }, []);

  useWebSocket({
    url: WS_URL,
    roomId: activeRoomId || undefined,
    onEvent: handleWebSocketEvent,
    onConnect: () => console.log('[PuzzleEditor] WebSocket connected to:', WS_URL, 'room:', activeRoomId),
    onDisconnect: () => console.log('[PuzzleEditor] WebSocket disconnected'),
  });
  // Fetch puzzles for active room
  const { data: puzzles = [] } = useQuery<Puzzle[]>({
    queryKey: ['puzzles', selectedClientId, activeRoomId],
    queryFn: () => api.getPuzzles(selectedClientId!, activeRoomId!),
    enabled: !!selectedClientId && !!activeRoomId,
  });

  // Load a specific puzzle
  const loadPuzzle = useCallback((puzzle: Puzzle) => {
    setPuzzleInfo({
      name: puzzle.name,
      description: puzzle.description || '',
      timeout_seconds: puzzle.timeout_seconds,
      hint_text: puzzle.hint_text || '',
    });
    setNodes(puzzle.graph.nodes as FlowNode[]);
    setEdges(puzzle.graph.edges as any[]);
    setSelectedPuzzleId(puzzle.id);
  }, []);

  // Load first puzzle automatically when puzzles are loaded
  useEffect(() => {
    if (puzzles.length > 0 && !selectedPuzzleId) {
      loadPuzzle(puzzles[0]);
    }
  }, [puzzles, selectedPuzzleId, loadPuzzle]);

  // Fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [nodes.length, fitView]);

  // Save puzzle mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const puzzleData: any = {
        name: puzzleInfo.name,
        description: puzzleInfo.description || '',
        hint_text: puzzleInfo.hint_text || '',
        graph: {
          nodes: nodes.map(n => ({
            id: n.id,
            type: n.type || 'puzzleNode',
            position: n.position,
            data: {
              label: n.data.label as string,
              nodeType: n.data.nodeType as string,
              subtype: n.data.subtype as string,
              icon: n.data.icon as string,
              color: n.data.color as string,
              config: n.data.config as Record<string, any> | undefined,
            },
          })),
          edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || null,
            targetHandle: e.targetHandle || null,
          })),
        },
        active: true,
      };

      // Only include timeout_seconds if it's defined
      if (puzzleInfo.timeout_seconds !== undefined && puzzleInfo.timeout_seconds !== null) {
        puzzleData.timeout_seconds = puzzleInfo.timeout_seconds;
      }

      console.log('[PuzzleEditor] Saving puzzle data:', JSON.stringify(puzzleData, null, 2));

      if (selectedPuzzleId) {
        return api.updatePuzzle(selectedClientId!, activeRoomId!, selectedPuzzleId, puzzleData);
      } else {
        return api.createPuzzle(selectedClientId!, activeRoomId!, puzzleData);
      }
    },
    onSuccess: (savedPuzzle: Puzzle) => {
      queryClient.invalidateQueries({ queryKey: ['puzzles', selectedClientId, activeRoomId] });
      setSelectedPuzzleId(savedPuzzle.id);
      setLastSaved(new Date());
      console.log('[PuzzleEditor] Puzzle saved successfully:', savedPuzzle.id);
    },
    onError: (error: any) => {
      console.error('[PuzzleEditor] Failed to save puzzle:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      alert(`Failed to save puzzle: ${errorMessage}`);
    },
  });

  // Auto-save on nodes/edges change (debounced)
  useEffect(() => {
    if (!autoSaveEnabled || !activeRoomId || !selectedPuzzleId) return;

    const debounceTimer = setTimeout(() => {
      console.log('Auto-saving puzzle...');
      saveMutation.mutate();
    }, 3000);

    return () => clearTimeout(debounceTimer);
  }, [nodes, edges, puzzleInfo, autoSaveEnabled, activeRoomId, selectedPuzzleId]);

  const onNodesChange = useCallback((changes: any) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: any) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge = {
        ...connection,
        id: `e${connection.source}-${connection.target}`,
        type: 'default' as const,
        animated: false,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    []
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: FlowNode) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNodeFromPalette = useCallback(
    (nodeType: string, subtype: string, label: string, icon: string, color: string) => {
      const newNode: FlowNode = {
        id: `${Date.now()}`,
        type: 'puzzleNode',
        position: { x: Math.random() * 400 + 250, y: Math.random() * 300 + 150 },
        draggable: true,
        data: {
          label,
          nodeType,
          subtype,
          icon,
          color,
          config: {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData('application/reactflow');

      if (!data) return;

      const nodeData = JSON.parse(data);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: FlowNode = {
        id: `${Date.now()}`,
        type: 'puzzleNode',
        position,
        draggable: true,
        data: {
          label: nodeData.label,
          nodeType: nodeData.type,
          subtype: nodeData.subtype,
          icon: nodeData.icon,
          color: nodeData.color,
          config: {},
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition]
  );

  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, config: { ...(node.data.config as Record<string, unknown> || {}), ...config } },
          };
        }
        return node;
      })
    );
  }, []);

  // Enhance nodes with devices, callbacks, and live device states
  const enhancedNodes = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      devices,
      deviceStates,
      roomId: activeRoomId,
      onConfigChange: updateNodeConfig,
    }
  }));

  const handleSave = () => {
    console.log('[PuzzleEditor] handleSave called');
    console.log('[PuzzleEditor] selectedClientId:', selectedClientId);
    console.log('[PuzzleEditor] activeRoomId:', activeRoomId);
    console.log('[PuzzleEditor] selectedPuzzleId:', selectedPuzzleId);
    
    if (!selectedClientId || !activeRoomId) {
      console.error('[PuzzleEditor] No room context!');
      alert('Please select a room first using the room selector button');
      return;
    }
    saveMutation.mutate();
  };

  const handleNewPuzzle = () => {
    setSelectedPuzzleId(null);
    setPuzzleInfo({ name: 'New Puzzle', description: '', timeout_seconds: undefined, hint_text: '' });
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  const handleDetailsUpdate = (details: { name: string; description: string; timeout_seconds?: number; hint_text: string }) => {
    setPuzzleInfo({
      ...details,
      timeout_seconds: details.timeout_seconds,
    });
    setShowDetailsModal(false);
  };

  return (
    <div className={styles.container}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <h1 className={styles.title}>Puzzle Editor</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {puzzles.length > 0 && (
              <select
                className={styles.puzzleSelect}
                value={selectedPuzzleId || ''}
                onChange={(e) => {
                  const puzzleId = e.target.value;
                  if (puzzleId) {
                    const puzzle = puzzles.find((p: Puzzle) => p.id === puzzleId);
                    if (puzzle) loadPuzzle(puzzle);
                  } else {
                    handleNewPuzzle();
                  }
                }}
              >
                <option value="">New Puzzle...</option>
                {puzzles.map((puzzle: Puzzle) => (
                  <option key={puzzle.id} value={puzzle.id}>
                    {puzzle.name}
                  </option>
                ))}
              </select>
            )}
            <span className={styles.subtitle}>{puzzleInfo.name}</span>
            {lastSaved && (
              <span style={{ fontSize: '12px', color: '#52525b' }}>
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {saveMutation.isPending && (
              <span style={{ fontSize: '12px', color: '#6366f1' }}>
                Saving...
              </span>
            )}
          </div>
        </div>
        <div className={styles.topActions}>
          <button className={styles.btnSecondary} onClick={handleNewPuzzle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Puzzle
          </button>
          <button className={styles.btnSecondary} onClick={() => setShowDetailsModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Details
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {saveMutation.isPending ? 'Saving...' : 'Save Puzzle'}
          </button>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Left Sidebar - Node Palette */}
        <PuzzleNodePalette onAddNode={addNodeFromPalette} />

        {/* Canvas Area */}
        <div className={styles.canvasContainer}>
          <ReactFlow
            nodes={enhancedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            nodesDraggable={true}
            nodesConnectable={true}
            nodesFocusable={true}
            elementsSelectable={true}
            snapToGrid={true}
            snapGrid={[24, 24]}
            nodeOrigin={[0.5, 0.5]}
            connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
            fitView
            className={styles.reactFlow}
          >
            <Background color="#52525b" gap={24} size={1} />
            <Controls className={styles.controls} />
            <MiniMap className={styles.minimap} nodeColor="#6366f1" maskColor="rgba(0, 0, 0, 0.6)" />
          </ReactFlow>
        </div>

        {/* Right Panel - Properties */}
        <PuzzlePropertiesPanel
          selectedNode={selectedNode}
          onNodeConfigChange={updateNodeConfig}
          devices={devices}
          nodes={nodes}
          edges={edges}
        />
      </div>

      {/* Edit Details Modal */}
      {showDetailsModal && (
        <PuzzleDetailsModal
          puzzleInfo={puzzleInfo}
          onClose={() => setShowDetailsModal(false)}
          onSave={handleDetailsUpdate}
        />
      )}
    </div>
  );
}

export function PuzzleEditor() {
  return (
    <ReactFlowProvider>
      <PuzzleEditorInner />
    </ReactFlowProvider>
  );
}
