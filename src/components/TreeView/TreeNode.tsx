import { useState, useRef, useEffect } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { NoteTreeNode } from "../../types";
import { useNoteStore } from "../../stores/noteStore";
import styles from "./TreeView.module.css";

interface TreeNodeProps {
  node: NoteTreeNode;
  level: number;
  isLast?: boolean;
}

// Drop zone for inserting between nodes
function DropZone({ id, level }: { id: string; level: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.dropZone} ${isOver ? styles.dropZoneActive : ""}`}
      style={{ paddingLeft: `${level * 16 + 8}px` }}
    >
      <div className={styles.dropZoneLine} />
    </div>
  );
}

export function TreeNode({ node, level, isLast = false }: TreeNodeProps) {
  const {
    selectedNoteId,
    expandedIds,
    selectNote,
    createNote,
    updateNote,
    deleteNote,
    toggleExpanded,
  } = useNoteStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const isSelected = selectedNoteId === node.id;
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;

  // Draggable setup
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: node.id,
  });

  // Droppable for becoming a child
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `child-${node.id}`,
  });

  // Combine refs
  const setRefs = (element: HTMLDivElement | null) => {
    setDragRef(element);
    setDropRef(element);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    selectNote(node.id);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditTitle(node.title);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleExpanded(node.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleCreateChild = async () => {
    closeContextMenu();
    await createNote(node.id);
  };

  const handleCreateSibling = async () => {
    closeContextMenu();
    await createNote(node.parent_id);
  };

  const handleDelete = async () => {
    closeContextMenu();
    if (confirm(`"${node.title}" を削除しますか？子ノートも全て削除されます。`)) {
      await deleteNote(node.id);
    }
  };

  const handleRename = () => {
    closeContextMenu();
    setIsEditing(true);
    setEditTitle(node.title);
  };

  const handleTitleSubmit = async () => {
    setIsEditing(false);
    if (editTitle.trim() && editTitle !== node.title) {
      await updateNote(node.id, { title: editTitle.trim() });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSubmit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditTitle(node.title);
    }
  };

  return (
    <div className={styles.nodeContainer}>
      {/* Drop zone before this node (for inserting as sibling) */}
      <DropZone id={`before-${node.id}`} level={level} />

      <div
        ref={setRefs}
        className={`${styles.node} ${isSelected ? styles.selected : ""} ${isDragging ? styles.dragging : ""} ${isOver ? styles.dropTarget : ""}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        {...attributes}
        {...listeners}
      >
        <span
          className={`${styles.toggle} ${hasChildren ? styles.hasChildren : ""}`}
          onClick={handleToggle}
        >
          {hasChildren ? (isExpanded ? "▼" : "▶") : ""}
        </span>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className={styles.titleInput}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleTitleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={styles.title}>{node.title}</span>
        )}
      </div>

      {isExpanded &&
        hasChildren &&
        node.children.map((child, index) => (
          <TreeNode
            key={child.id}
            node={child}
            level={level + 1}
            isLast={index === node.children.length - 1}
          />
        ))}

      {/* Drop zone after the last node in a group */}
      {isLast && (
        <DropZone id={`after-${node.id}`} level={level} />
      )}

      {contextMenu && (
        <>
          <div className={styles.overlay} onClick={closeContextMenu} />
          <div
            className={styles.contextMenu}
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button onClick={handleCreateChild}>子ノートを作成</button>
            <button onClick={handleCreateSibling}>同階層にノートを作成</button>
            <button onClick={handleRename}>名前を変更</button>
            <hr />
            <button onClick={handleDelete} className={styles.danger}>
              削除
            </button>
          </div>
        </>
      )}
    </div>
  );
}
