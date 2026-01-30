import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useNoteStore } from "../../stores/noteStore";
import { TreeNode } from "./TreeNode";
import type { NoteTreeNode } from "../../types";
import styles from "./TreeView.module.css";

export function TreeView() {
  const { noteTree, isLoading, loadNotes, createNote, moveNote } = useNoteStore();
  const [activeNode, setActiveNode] = useState<NoteTreeNode | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleCreateRoot = async () => {
    await createNote(null);
  };

  const findNodeById = (nodes: NoteTreeNode[], id: number): NoteTreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
    return null;
  };

  const findNodePosition = (nodes: NoteTreeNode[], id: number): { parent: NoteTreeNode | null; index: number } | null => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        return { parent: null, index: i };
      }
      const result = findNodePositionInChildren(nodes[i], id);
      if (result) return result;
    }
    return null;
  };

  const findNodePositionInChildren = (parent: NoteTreeNode, id: number): { parent: NoteTreeNode; index: number } | null => {
    for (let i = 0; i < parent.children.length; i++) {
      if (parent.children[i].id === id) {
        return { parent, index: i };
      }
      const result = findNodePositionInChildren(parent.children[i], id);
      if (result) return result;
    }
    return null;
  };

  const isDescendant = (parentId: number, childId: number): boolean => {
    const node = findNodeById(noteTree, parentId);
    if (!node) return false;
    for (const child of node.children) {
      if (child.id === childId) return true;
      if (isDescendant(child.id, childId)) return true;
    }
    return false;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const node = findNodeById(noteTree, active.id as number);
    setActiveNode(node);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNode(null);

    if (!over) return;

    const draggedId = active.id as number;
    const overId = over.id as string;

    // Parse the drop target
    if (typeof overId === "string") {
      if (overId.startsWith("before-")) {
        // Insert before a node
        const targetId = parseInt(overId.replace("before-", ""), 10);
        if (draggedId === targetId) return;

        const targetNode = findNodeById(noteTree, targetId);
        if (!targetNode) return;

        // Check circular reference
        if (isDescendant(draggedId, targetId)) return;

        // Get target's position
        const position = findNodePosition(noteTree, targetId);
        if (position) {
          const newParentId = position.parent?.id ?? null;
          await moveNote(draggedId, newParentId, position.index);
        }
      } else if (overId.startsWith("after-")) {
        // Insert after a node
        const targetId = parseInt(overId.replace("after-", ""), 10);
        if (draggedId === targetId) return;

        const targetNode = findNodeById(noteTree, targetId);
        if (!targetNode) return;

        // Check circular reference
        if (isDescendant(draggedId, targetId)) return;

        // Get target's position and insert after
        const position = findNodePosition(noteTree, targetId);
        if (position) {
          const newParentId = position.parent?.id ?? null;
          await moveNote(draggedId, newParentId, position.index + 1);
        }
      } else if (overId.startsWith("child-")) {
        // Insert as child of a node
        const targetId = parseInt(overId.replace("child-", ""), 10);
        if (draggedId === targetId) return;

        // Check circular reference
        if (isDescendant(draggedId, targetId)) return;

        const targetNode = findNodeById(noteTree, targetId);
        if (targetNode) {
          await moveNote(draggedId, targetId, targetNode.children.length);
        }
      }
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.treeView}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>ノート</span>
          <button
            className={styles.addButton}
            onClick={handleCreateRoot}
            title="新規ノート作成"
          >
            +
          </button>
        </div>

        <div className={styles.treeContent}>
          {noteTree.length === 0 ? (
            <div className={styles.empty}>
              <p>ノートがありません</p>
              <button onClick={handleCreateRoot}>最初のノートを作成</button>
            </div>
          ) : (
            noteTree.map((node, index) => (
              <TreeNode
                key={node.id}
                node={node}
                level={0}
                isLast={index === noteTree.length - 1}
              />
            ))
          )}
        </div>
      </div>

      <DragOverlay>
        {activeNode ? (
          <div className={styles.dragOverlay}>
            <span className={styles.title}>{activeNode.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
