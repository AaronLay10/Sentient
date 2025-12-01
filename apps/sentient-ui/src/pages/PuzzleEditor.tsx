import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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
import { api, type Room, type Device, type Puzzle } from '../lib/api';
import styles from './PuzzleEditor.module.css';

const nodeTypes = {
  puzzleNode: PuzzleNode,
};

const initialNodes: FlowNode[] = [];
const initialEdges: Array<{ id: string; type: 'default'; animated: boolean; style: { stroke: string; strokeWidth: number }; source: string; target: string; sourceHandle: string | null; targetHandle: string | null }> = [];

function PuzzleEditorInner() {
  const queryClient = useQueryClient();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [searchParams] = useSearchParams();

  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<Array<{ id: string; type: 'default'; animated: boolean; style: { stroke: string; strokeWidth: number }; source: string; target: string; sourceHandle: string | null; targetHandle: string | null }>>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const selectedClientId = 'cmif0rz0400001352aazr47j8'; // Default to Paragon
  const [puzzleInfo, setPuzzleInfo] = useState({
    name: 'New Puzzle',
    description: '',
    timeout_seconds: undefined as number | undefined,
    hint_text: '',
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch rooms
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: api.getRooms,
  });

  // Fetch devices
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: api.getDevices,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Fetch puzzles for selected room
  const { data: puzzles = [] } = useQuery<Puzzle[]>({
    queryKey: ['puzzles', selectedClientId, selectedRoomId],
    queryFn: () => api.getPuzzles(selectedClientId, selectedRoomId),
    enabled: !!selectedClientId && !!selectedRoomId,
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

  // Set first room as default or from URL params
  useEffect(() => {
    const roomIdFromUrl = searchParams.get('roomId');
    const puzzleIdFromUrl = searchParams.get('puzzleId');

    if (roomIdFromUrl) {
      setSelectedRoomId(roomIdFromUrl);
    } else if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }

    // If puzzleId is in URL, load it once puzzles are available
    if (puzzleIdFromUrl && puzzles.length > 0) {
      const puzzle = puzzles.find(p => p.id === puzzleIdFromUrl);
      if (puzzle) {
        loadPuzzle(puzzle);
      }
    }
  }, [rooms, selectedRoomId, searchParams, puzzles, loadPuzzle]);

  // Load first puzzle automatically when puzzles are loaded
  useEffect(() => {
    if (puzzles.length > 0 && !selectedPuzzleId && !searchParams.get('puzzleId')) {
      loadPuzzle(puzzles[0]);
    }
  }, [puzzles, selectedPuzzleId, loadPuzzle, searchParams]);

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
      const puzzleData = {
        name: puzzleInfo.name,
        description: puzzleInfo.description,
        timeout_seconds: puzzleInfo.timeout_seconds,
        hint_text: puzzleInfo.hint_text,
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

      if (selectedPuzzleId) {
        return api.updatePuzzle(selectedClientId, selectedRoomId, selectedPuzzleId, puzzleData);
      } else {
        return api.createPuzzle(selectedClientId, selectedRoomId, puzzleData);
      }
    },
    onSuccess: (savedPuzzle) => {
      queryClient.invalidateQueries({ queryKey: ['puzzles', selectedClientId, selectedRoomId] });
      setSelectedPuzzleId(savedPuzzle.id);
      setLastSaved(new Date());
    },
    onError: (error) => {
      console.error('Failed to save puzzle:', error);
      alert('Failed to save puzzle. Please try again.');
    },
  });

  // Auto-save on nodes/edges change (debounced)
  useEffect(() => {
    if (!autoSaveEnabled || !selectedRoomId || !selectedPuzzleId) return;

    const debounceTimer = setTimeout(() => {
      console.log('Auto-saving puzzle...');
      saveMutation.mutate();
    }, 3000);

    return () => clearTimeout(debounceTimer);
  }, [nodes, edges, puzzleInfo, autoSaveEnabled, selectedRoomId, selectedPuzzleId]);

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

  // Enhance nodes with devices and callbacks
  const enhancedNodes = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      devices,
      onConfigChange: updateNodeConfig,
    }
  }));

  const handleSave = () => {
    if (!selectedRoomId) {
      alert('Please select a room first');
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
            <select
              className={styles.roomSelect}
              value={selectedRoomId}
              onChange={(e) => {
                setSelectedRoomId(e.target.value);
                setSelectedPuzzleId(null);
                handleNewPuzzle();
              }}
            >
              <option value="">Select Room...</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            {puzzles.length > 0 && (
              <select
                className={styles.puzzleSelect}
                value={selectedPuzzleId || ''}
                onChange={(e) => {
                  const puzzleId = e.target.value;
                  if (puzzleId) {
                    const puzzle = puzzles.find(p => p.id === puzzleId);
                    if (puzzle) loadPuzzle(puzzle);
                  } else {
                    handleNewPuzzle();
                  }
                }}
              >
                <option value="">New Puzzle...</option>
                {puzzles.map((puzzle) => (
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
          rooms={rooms}
          selectedRoomId={selectedRoomId}
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
