import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  ReactFlowProvider
} from '@xyflow/react';
import type { Node as FlowNode, Connection, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NodePalette } from '../components/SceneEditor/NodePalette';
import { PropertiesPanel } from '../components/SceneEditor/PropertiesPanel';
import { SceneNode } from '../components/SceneEditor/SceneNode';
import styles from './SceneEditor.module.css';

const nodeTypes = {
  sceneNode: SceneNode,
};

const initialNodes: FlowNode[] = [
  {
    id: '1',
    type: 'sceneNode',
    position: { x: 100, y: 200 },
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

const initialEdges: Edge[] = [];

export function SceneEditor() {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [sceneInfo, setSceneInfo] = useState({
    name: 'Opening Sequence',
    room: 'Return of the Pharaohs',
    triggerMode: 'Manual Start',
  });

  const onNodesChange = useCallback((changes: any) => {
    setNodes((nds) => {
      // Apply changes manually for more control
      const updatedNodes = [...nds];
      changes.forEach((change: any) => {
        if (change.type === 'position') {
          const node = updatedNodes.find((n) => n.id === change.id);
          if (node && change.position) {
            node.position = change.position;
          }
        } else if (change.type === 'remove') {
          const index = updatedNodes.findIndex((n) => n.id === change.id);
          if (index !== -1) {
            updatedNodes.splice(index, 1);
          }
        }
      });
      return updatedNodes;
    });
  }, []);

  const onEdgesChange = useCallback((changes: any) => {
    setEdges((eds) => {
      const updatedEdges = [...eds];
      changes.forEach((change: any) => {
        if (change.type === 'remove') {
          const index = updatedEdges.findIndex((e) => e.id === change.id);
          if (index !== -1) {
            updatedEdges.splice(index, 1);
          }
        }
      });
      return updatedEdges;
    });
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge = {
        ...connection,
        id: `e${connection.source}-${connection.target}`,
        type: 'default',
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

  const updateNodeConfig = useCallback((nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, config: { ...node.data.config, ...config } },
          };
        }
        return node;
      })
    );
  }, []);

  const handleSave = () => {
    console.log('Saving scene:', {
      info: sceneInfo,
      nodes,
      edges,
    });
    // TODO: API call to save scene
  };

  return (
    <div className={styles.container}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <h1 className={styles.title}>Scene Editor</h1>
          <span className={styles.subtitle}>{sceneInfo.room} • {sceneInfo.name}</span>
        </div>
        <div className={styles.topActions}>
          <button className={styles.btnSecondary}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Preview
          </button>
          <button className={styles.btnPrimary} onClick={handleSave}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save Scene
          </button>
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Left Sidebar - Node Palette */}
        <NodePalette onAddNode={addNodeFromPalette} />

        {/* Canvas Area */}
        <div className={styles.canvasContainer}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              className={styles.reactFlow}
            >
              <Background color="#52525b" gap={24} />
              <Controls className={styles.controls} />
              <MiniMap className={styles.minimap} nodeColor="#6366f1" maskColor="rgba(0, 0, 0, 0.6)" />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {/* Right Panel - Properties */}
        <PropertiesPanel
          selectedNode={selectedNode}
          sceneInfo={sceneInfo}
          onSceneInfoChange={setSceneInfo}
          onNodeConfigChange={updateNodeConfig}
        />
      </div>
    </div>
  );
}
