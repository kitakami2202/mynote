import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import { useNoteStore } from "../../stores/noteStore";
import { Toolbar } from "./Toolbar";
import styles from "./Editor.module.css";

export function Editor() {
  const { selectedNote, updateNote } = useNoteStore();
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSavedContentRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: styles.proseMirror,
      },
    },
  });

  // Load content when selected note changes
  useEffect(() => {
    if (!editor) return;

    if (selectedNote) {
      const content = selectedNote.content || "";
      try {
        // Try to parse as JSON (TipTap format)
        const parsed = content ? JSON.parse(content) : { type: "doc", content: [] };
        editor.commands.setContent(parsed);
      } catch {
        // If not JSON, treat as plain text
        editor.commands.setContent(content);
      }
      lastSavedContentRef.current = content;
    } else {
      editor.commands.setContent("");
      lastSavedContentRef.current = null;
    }
  }, [selectedNote?.id, editor]);

  // Auto-save with debounce
  const saveContent = useCallback(async () => {
    if (!selectedNote || !editor) return;

    const json = editor.getJSON();
    const content = JSON.stringify(json);

    if (content !== lastSavedContentRef.current) {
      await updateNote(selectedNote.id, { content });
      lastSavedContentRef.current = content;
    }
  }, [selectedNote, editor, updateNote]);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        saveContent();
      }, 500);
    };

    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveContent();
      }
    };
  }, [editor, saveContent]);

  if (!selectedNote) {
    return (
      <div className={styles.emptyState}>
        <p>ノートを選択してください</p>
        <p className={styles.hint}>左のツリーからノートを選択するか、新しいノートを作成してください</p>
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      <div className={styles.titleBar}>
        <input
          type="text"
          className={styles.titleInput}
          value={selectedNote.title}
          onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
          placeholder="タイトル"
        />
      </div>
      <Toolbar editor={editor} />
      <div className={styles.editorContent}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
