import type { Editor } from "@tiptap/react";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import styles from "./Editor.module.css";

interface ToolbarProps {
  editor: Editor | null;
}

export function Toolbar({ editor }: ToolbarProps) {
  if (!editor) {
    return null;
  }

  const handleImageInsert = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "gif", "webp"],
          },
        ],
      });

      if (selected) {
        const filePath = typeof selected === "string" ? selected : selected;
        const fileData = await readFile(filePath);
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(fileData))
        );
        const extension = filePath.split(".").pop()?.toLowerCase() || "png";
        const mimeType =
          extension === "jpg" || extension === "jpeg"
            ? "image/jpeg"
            : `image/${extension}`;
        const dataUrl = `data:${mimeType};base64,${base64}`;

        editor.chain().focus().setImage({ src: dataUrl }).run();
      }
    } catch (error) {
      console.error("Failed to insert image:", error);
    }
  };

  return (
    <div className={styles.toolbar}>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive("bold") ? styles.active : ""}
        title="太字 (Ctrl+B)"
      >
        <strong>B</strong>
      </button>

      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive("italic") ? styles.active : ""}
        title="斜体 (Ctrl+I)"
      >
        <em>I</em>
      </button>

      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive("underline") ? styles.active : ""}
        title="下線 (Ctrl+U)"
      >
        <u>U</u>
      </button>

      <span className={styles.separator} />

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive("heading", { level: 1 }) ? styles.active : ""}
        title="見出し1"
      >
        H1
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive("heading", { level: 2 }) ? styles.active : ""}
        title="見出し2"
      >
        H2
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive("heading", { level: 3 }) ? styles.active : ""}
        title="見出し3"
      >
        H3
      </button>

      <span className={styles.separator} />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive("bulletList") ? styles.active : ""}
        title="箇条書き"
      >
        •
      </button>

      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive("orderedList") ? styles.active : ""}
        title="番号付きリスト"
      >
        1.
      </button>

      <span className={styles.separator} />

      <button onClick={handleImageInsert} title="画像を挿入">
        🖼
      </button>
    </div>
  );
}
