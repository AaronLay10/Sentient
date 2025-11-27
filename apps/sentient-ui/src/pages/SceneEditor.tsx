import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { NodePalette } from '../components/SceneEditor/NodePalette';
import { PropertiesPanel } from '../components/SceneEditor/PropertiesPanel';
import { SceneNode } from '../components/SceneEditor/SceneNode';
import { api, type Room, type Device, type Scene } from '../lib/api';
import styles from './SceneEditor.module.css';

const nodeTypes = {
  sceneNode: SceneNode,
};

const initialNodes: FlowNode[] = [
  {
    id: '1',
    type: 'sceneNode',
    position: { x: 100, y: 200 },
    draggable: false,
    data: {
      label: 'Scene Start',
      nodeType: 'trigger',
      subtype: 'scene-start',
      icon: '▶',
      color: '#ff8c42',
      config: {}
    },
  },
];

const initialEdges: Array<{ id: string; type: 'default'; animated: boolean; style: { stroke: string; strokeWidth: number }; source: string; target: string; sourceHandle: string | null; targetHandle: string | null }> = [];

function SceneEditorInner() {
  const queryClient = useQueryClient();
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<Array<{ id: string; type: 'default'; animated: boolean; style: { stroke: string; strokeWidth: number }; source: string; target: string; sourceHandle: string | null; targetHandle: string | null }>>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const selectedClientId = 'cmif0rz0400001352aazr47j8'; // Default to Paragon
  const [sceneInfo, setSceneInfo] = useState({
    name: 'New Scene',
    description: '',
  });

  // Fetch rooms
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: api.getRooms,
  });

  // Fetch devices
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: api.getDevices,
  });

  // Fetch scenes for selected room
  const { data: scenes = [] } = useQuery<Scene[]>({
    queryKey: ['scenes', selectedClientId, selectedRoomId],
    queryFn: () => api.getScenes(selectedClientId, selectedRoomId),
    enabled: !!selectedClientId && !!selectedRoomId,
  });

  // Load a specific scene
  const loadScene = useCallback((scene: Scene) => {
    setSceneInfo({
      name: scene.name,
      description: scene.description || '',
    });
    setNodes(scene.graph.nodes as FlowNode[]);
    setEdges(scene.graph.edges as any[]);
    setSelectedSceneId(scene.id);
  }, []);

  // Set first room as default
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  // Load first scene automatically when scenes are loaded
  useEffect(() => {
    if (scenes.length > 0 && !selectedSceneId) {
      loadScene(scenes[0]);
    }
  }, [scenes, selectedSceneId, loadScene]);

  // Save scene mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
    const sceneData = {
      name: sceneInfo.name,
      description: sceneInfo.description,
      graph: {
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type || 'sceneNode',
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
    };      if (selectedSceneId) {
        return api.updateScene(selectedClientId, selectedRoomId, selectedSceneId, sceneData);
      } else {
        return api.createScene(selectedClientId, selectedRoomId, sceneData);
      }
    },
    onSuccess: (savedScene) => {
      queryClient.invalidateQueries({ queryKey: ['scenes', selectedClientId, selectedRoomId] });
      setSelectedSceneId(savedScene.id);
      alert('Scene saved successfully!');
    },
    onError: (error) => {
      console.error('Failed to save scene:', error);
      alert('Failed to save scene. Please try again.');
    },
  });

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
        animated: true,
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
        type: 'sceneNode',
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
        type: 'sceneNode',
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

  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...data },
          };
        }
        return node;
      })
    );
  }, []);

  const handleSave = () => {
    if (!selectedRoomId) {
      alert('Please select a room first');
      return;
    }
    saveMutation.mutate();
  };

  const handleNewScene = () => {
    setSelectedSceneId(null);
    setSceneInfo({ name: 'New Scene', description: '' });
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  return (
    <div className={styles.container}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <h1 className={styles.title}>Scene Editor</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              className={styles.roomSelect}
              value={selectedRoomId}
              onChange={(e) => {
                setSelectedRoomId(e.target.value);
                setSelectedSceneId(null);
                handleNewScene();
              }}
            >
              <option value="">Select Room...</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
            {scenes.length > 0 && (
              <select
                className={styles.sceneSelect}
                value={selectedSceneId || ''}
                onChange={(e) => {
                  const sceneId = e.target.value;
                  if (sceneId) {
                    const scene = scenes.find(s => s.id === sceneId);
                    if (scene) loadScene(scene);
                  } else {
                    handleNewScene();
                  }
                }}
              >
                <option value="">New Scene...</option>
                {scenes.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.name}
                  </option>
                ))}
              </select>
            )}
            <span className={styles.subtitle}>{sceneInfo.name}</span>
          </div>
        </div>
        <div className={styles.topActions}>
          <button className={styles.btnSecondary} onClick={handleNewScene}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Scene
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
            {saveMutation.isPending ? 'Saving...' : 'Save Scene'}
          </button>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Left Sidebar - Node Palette */}
        <NodePalette onAddNode={addNodeFromPalette} />

        {/* Canvas Area */}
        <div className={styles.canvasContainer}>
          <ReactFlow
            nodes={nodes}
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
            fitView
            className={styles.reactFlow}
          >
            <Background color="#52525b" gap={24} />
            <Controls className={styles.controls} />
            <MiniMap className={styles.minimap} nodeColor="#6366f1" maskColor="rgba(0, 0, 0, 0.6)" />
          </ReactFlow>
        </div>

        {/* Right Panel - Properties */}
        <PropertiesPanel
          selectedNode={selectedNode}
          sceneInfo={sceneInfo}
          onSceneInfoChange={setSceneInfo}
          onNodeConfigChange={updateNodeConfig}
          onNodeDataChange={updateNodeData}
          devices={devices}
          rooms={rooms}
          selectedRoomId={selectedRoomId}
        />
      </div>
    </div>
  );
}

export function SceneEditor() {
  return (
    <ReactFlowProvider>
      <SceneEditorInner />
    </ReactFlowProvider>
  );
}
