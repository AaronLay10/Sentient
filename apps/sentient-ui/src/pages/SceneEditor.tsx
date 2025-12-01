import { useState, useCallback, useEffect, useRef } from 'react';
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
import { api, type Room, type Device, type Scene, type Puzzle } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
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
  const { screenToFlowPosition, fitView } = useReactFlow();
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled] = useState(true); // Auto-save enabled by default
  const [runningNodeId, setRunningNodeId] = useState<string | null>(null);
  const [acknowledgedNodes, setAcknowledgedNodes] = useState<Set<string>>(new Set());
  
  // Map to store pending acknowledgement promises - event-driven, no polling!
  const acknowledgementResolvers = useRef<Map<string, (value: boolean) => void>>(new Map());

  // WebSocket connection for real-time acknowledgements
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';
  const { events } = useWebSocket({
    url: WS_URL,
    roomId: selectedRoomId || undefined,
  });

  // Fetch rooms
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: api.getRooms,
  });

  // Fetch devices - always fetch fresh state from database (never cache)
  const { data: devices = [], refetch: refetchDevices } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: api.getDevices,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Listen for device state changes - proactive WebSocket event handling (no polling!)
  useEffect(() => {
    try {
      if (!events || events.length === 0) return;

      const latestEvent = events[0];
      
      // Check if this is a device state change event
      if (latestEvent?.type === 'device_state_changed') {
        const deviceId = latestEvent.device_id;
        const isAcknowledgement = latestEvent.metadata?.is_acknowledgement === true;
        
        if (!deviceId) return;
        
        // Find node with matching deviceId - only process if device is in this scene
        const matchingNode = nodes.find(n => 
          n.data.nodeType === 'device' && 
          (n.data.config as any)?.deviceId === deviceId
        );
        
        // Ignore events for devices not in this scene
        if (!matchingNode) return;
        
        // Refetch devices to get fresh state from database
        refetchDevices();
        
        // Update acknowledged nodes set for visual feedback
        setAcknowledgedNodes(prev => new Set(prev).add(matchingNode.id));
        
        // If this is an acknowledgement event, resolve any pending promise immediately
        if (isAcknowledgement) {
          const resolver = acknowledgementResolvers.current.get(matchingNode.id);
          if (resolver) {
            console.log(`✅ Acknowledgement received for node: ${matchingNode.id} (device: ${deviceId})`);
            resolver(true);
            acknowledgementResolvers.current.delete(matchingNode.id);
          }
        }
        
        // Clear visual acknowledgement indicator after 2 seconds
        setTimeout(() => {
          setAcknowledgedNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(matchingNode.id);
            return newSet;
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Error processing WebSocket event:', error);
    }
  }, [events, nodes, refetchDevices]);
  
  // Cleanup pending acknowledgement resolvers on unmount
  useEffect(() => {
    return () => {
      acknowledgementResolvers.current.clear();
    };
  }, []);

  // Fetch scenes for selected room
  const { data: scenes = [] } = useQuery<Scene[]>({
    queryKey: ['scenes', selectedClientId, selectedRoomId],
    queryFn: () => api.getScenes(selectedClientId, selectedRoomId),
    enabled: !!selectedClientId && !!selectedRoomId,
  });

  // Fetch puzzles for selected room
  const { data: puzzles = [] } = useQuery<Puzzle[]>({
    queryKey: ['puzzles', selectedClientId, selectedRoomId],
    queryFn: () => api.getPuzzles(selectedClientId, selectedRoomId),
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

  // Fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [nodes.length, fitView]);

  // Warn user before closing/navigating during scene execution
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const activeExecution = sessionStorage.getItem('sentient_scene_execution_state');
      if (activeExecution) {
        e.preventDefault();
        e.returnValue = 'Scene execution in progress. Are you sure you want to leave?';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
      setLastSaved(new Date());
    },
    onError: (error) => {
      console.error('Failed to save scene:', error);
      alert('Failed to save scene. Please try again.');
    },
  });

  // Auto-save on nodes/edges change (debounced)
  useEffect(() => {
    if (!autoSaveEnabled || !selectedRoomId || !selectedSceneId) return;
    
    const debounceTimer = setTimeout(() => {
      console.log('Auto-saving scene...');
      saveMutation.mutate();
    }, 3000); // Save 3 seconds after last change

    return () => clearTimeout(debounceTimer);
  }, [nodes, edges, sceneInfo, autoSaveEnabled, selectedRoomId, selectedSceneId]);

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

  // Enhance nodes with devices and callbacks
  const enhancedNodes = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      devices,
      puzzles: puzzles.map(p => ({ id: p.id, name: p.name, description: p.description })),
      roomId: selectedRoomId,
      onConfigChange: updateNodeConfig,
      onDataChange: updateNodeData,
      isRunning: node.id === runningNodeId,
      isAcknowledged: acknowledgedNodes.has(node.id),
    }
  }));

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
          <button className={styles.btnSecondary} onClick={handleNewScene}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Scene
          </button>
          {selectedSceneId && (
            <button 
              className={styles.btnSecondary}
              onClick={async () => {
                if (!selectedSceneId) return;
                
                // Check for concurrent execution
                const activeExecution = sessionStorage.getItem('sentient_scene_execution_state');
                if (activeExecution) {
                  if (!confirm('Scene execution in progress. Cancel it to start a new execution?')) {
                    return;
                  }
                  sessionStorage.removeItem('sentient_scene_execution_state');
                }
                
                try {
                  // Find scene start node
                  const startNode = nodes.find(n => n.data.subtype === 'scene-start');
                  if (!startNode) {
                    alert('Scene must have a "Scene Start" node');
                    return;
                  }
                  
                  // Build execution order by traversing graph
                  const executionOrder: FlowNode[] = [];
                  const visited = new Set<string>();
                  
                  const traverse = (nodeId: string) => {
                    if (visited.has(nodeId)) return;
                    visited.add(nodeId);
                    const node = nodes.find(n => n.id === nodeId);
                    if (node) executionOrder.push(node);
                    const outgoingEdges = edges.filter(e => e.source === nodeId);
                    outgoingEdges.forEach(edge => traverse(edge.target));
                  };
                  
                  traverse(startNode.id);
                  
                  console.log('🎬 Starting scene execution:', {
                    scene: sceneInfo.name,
                    nodeCount: executionOrder.length,
                    startedAt: new Date().toISOString()
                  });
                  
                  // Save execution state
                  const executionState = {
                    sceneId: selectedSceneId,
                    sceneName: sceneInfo.name,
                    startedAt: new Date().toISOString(),
                    completedNodes: [] as string[],
                    currentNodeId: '',
                    totalNodes: executionOrder.length
                  };
                  sessionStorage.setItem('sentient_scene_execution_state', JSON.stringify(executionState));
                  
                  // Execute nodes sequentially
                  for (let i = 0; i < executionOrder.length; i++) {
                    const node = executionOrder[i];
                    executionState.currentNodeId = node.id;
                    sessionStorage.setItem('sentient_scene_execution_state', JSON.stringify(executionState));
                    
                    console.log(`📍 Executing node ${i + 1}/${executionOrder.length}:`, {
                      id: node.id,
                      type: node.data.nodeType,
                      subtype: node.data.subtype
                    });
                    
                    setRunningNodeId(node.id);
                    
                    // Execute based on node type
                    const nodeConfig = node.data.config as any;
                    if (node.data.nodeType === 'device' && nodeConfig?.deviceId && nodeConfig?.action) {
                      // Device command - wait for acknowledgement via WebSocket event (no polling!)
                      const commandSentAt = Date.now();
                      
                      try {
                        // Set up promise that will be resolved by WebSocket event handler
                        const ackPromise = new Promise<boolean>((resolve) => {
                          acknowledgementResolvers.current.set(node.id, resolve);
                          
                          // 5-second timeout
                          setTimeout(() => {
                            if (acknowledgementResolvers.current.has(node.id)) {
                              acknowledgementResolvers.current.delete(node.id);
                              resolve(false);
                            }
                          }, 5000);
                        });
                        
                        // Send command
                        await api.sendDeviceCommand(
                          nodeConfig.deviceId,
                          nodeConfig.action,
                          nodeConfig.payload || {}
                        );
                        
                        console.log('✅ Device command sent, waiting for acknowledgement...');
                        
                        // Wait for WebSocket event to resolve promise (proactive, not reactive!)
                        const ackReceived = await ackPromise;
                        
                        if (!ackReceived) {
                          const device = devices.find(d => d.id === nodeConfig?.deviceId);
                          throw new Error(`Command timeout: No acknowledgement received from controller within 5 seconds\n\nDevice: ${device?.friendly_name || nodeConfig?.deviceId}\nAction: ${nodeConfig?.action}`);
                        }
                        
                        const latencyMs = Date.now() - commandSentAt;
                        console.log(`⚡ Acknowledgement received (${latencyMs}ms latency)`);
                        
                      } catch (error: any) {
                        setRunningNodeId(null);
                        const errorDetails = {
                          nodeId: node.id,
                          nodeName: node.data.label,
                          deviceId: nodeConfig?.deviceId,
                          action: nodeConfig?.action,
                          error: error.message
                        };
                        console.error('❌ Execution failed:', errorDetails);
                        
                        // Show error modal with resume/cancel options
                        const resume = confirm(`Scene execution failed!\n\n${error.message}\n\nClick OK to resume from "${node.data.label}"\nClick Cancel to stop execution`);
                        
                        if (resume) {
                          i--; // Retry current node
                          continue;
                        } else {
                          sessionStorage.removeItem('sentient_scene_execution_state');
                          return;
                        }
                      }
                      
                    } else if (node.data.nodeType === 'trigger' && node.data.subtype === 'timer') {
                      // Timer node - explicit delay
                      const duration = (node.data.config as any)?.duration || 1000;
                      console.log(`⏱️  Timer: waiting ${duration}ms...`);
                      await new Promise(resolve => setTimeout(resolve, duration));
                      
                    } else if (node.data.nodeType === 'media' && node.data.subtype === 'video') {
                      // Video playback node - send command to video device
                      const nodeConfig = node.data.config as any;
                      
                      if (!nodeConfig?.deviceId || !nodeConfig?.action) {
                        throw new Error('Video device and action must be configured');
                      }
                      
                      const device = devices.find(d => d.id === nodeConfig.deviceId);
                      const action = device?.actions?.find(a => a.action_id === nodeConfig.action);
                      
                      console.log(`🎬 Video command: ${device?.friendly_name} - ${action?.friendly_name || nodeConfig.action}`);
                      
                      // Set up acknowledgement promise
                      const commandSentAt = Date.now();
                      const ackPromise = new Promise<boolean>((resolve) => {
                        acknowledgementResolvers.current.set(node.id, resolve);
                        
                        // 5-second timeout
                        setTimeout(() => {
                          if (acknowledgementResolvers.current.has(node.id)) {
                            acknowledgementResolvers.current.delete(node.id);
                            resolve(false);
                          }
                        }, 5000);
                      });
                      
                      // Send command to video device
                      await api.sendDeviceCommand(
                        nodeConfig.deviceId,
                        nodeConfig.action,
                        nodeConfig.payload || {}
                      );
                      
                      console.log('✅ Video command sent, waiting for acknowledgement...');
                      
                      // Wait for acknowledgement
                      const ackReceived = await ackPromise;
                      
                      if (!ackReceived) {
                        throw new Error(`Command timeout: No acknowledgement received from ${device?.friendly_name} within 5 seconds`);
                      }
                      
                      const latencyMs = Date.now() - commandSentAt;
                      console.log(`⚡ Video command acknowledged (${latencyMs}ms latency)`);
                      
                    } else {
                      // Other node types - immediate execution
                      console.log('⏭️  Non-device node, proceeding immediately');
                    }
                    
                    // Mark node as completed
                    executionState.completedNodes.push(node.id);
                    sessionStorage.setItem('sentient_scene_execution_state', JSON.stringify(executionState));
                    setRunningNodeId(null);
                  }
                  
                  console.log('🎉 Scene execution completed successfully!');
                  sessionStorage.removeItem('sentient_scene_execution_state');
                  
                } catch (error) {
                  console.error('❌ Scene execution error:', error);
                  setRunningNodeId(null);
                  sessionStorage.removeItem('sentient_scene_execution_state');
                }
              }}
              style={{ 
                background: 'rgba(34, 197, 94, 0.1)',
                borderColor: 'rgba(34, 197, 94, 0.3)',
                color: '#22c55e'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run Scene
            </button>
          )}
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
        <PropertiesPanel
          selectedNode={selectedNode}
          sceneInfo={sceneInfo}
          onSceneInfoChange={setSceneInfo}
          onNodeConfigChange={updateNodeConfig}
          onNodeDataChange={updateNodeData}
          devices={devices}
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          nodes={nodes}
          edges={edges}
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
