import { useEffect } from "react";
import { useNoteStore } from "../../stores/noteStore";
import { TreeNode } from "./TreeNode";
import styles from "./TreeView.module.css";

export function TreeView() {
  const { noteTree, isLoading, loadNotes, createNote } = useNoteStore();

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleCreateRoot = async () => {
    await createNote(null);
  };

  if (isLoading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
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
          noteTree.map((node) => (
            <TreeNode key={node.id} node={node} level={0} />
          ))
        )}
      </div>
    </div>
  );
}
