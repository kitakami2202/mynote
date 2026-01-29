import { TreeView } from "../TreeView";
import { Editor } from "../Editor";
import { SearchPanel } from "../SearchPanel";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <TreeView />
      </aside>
      <main className={styles.main}>
        <Editor />
      </main>
      <SearchPanel />
    </div>
  );
}
