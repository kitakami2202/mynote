import { useEffect, useRef, useCallback, useState } from "react";
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
  const [lineHeight, setLineHeight] = useState(() => {
    // Load saved line height from localStorage
    const saved = localStorage.getItem("mynote-line-height");
    return saved ? parseFloat(saved) : 1.6;
  });

  const handleLineHeightChange = (value: number) => {
    setLineHeight(value);
    localStorage.setItem("mynote-line-height", value.toString());
  };

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

  // Handle Tab/Shift+Tab for indentation
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab" && editor.isFocused) {
        event.preventDefault();

        // Check if currently in a list
        const isInBulletList = editor.isActive("bulletList");
        const isInOrderedList = editor.isActive("orderedList");
        const isInList = isInBulletList || isInOrderedList;

        if (event.shiftKey) {
          // Shift+Tab: decrease indent
          if (isInList) {
            // Try to lift list item first
            const canLift = editor.can().liftListItem("listItem");
            if (canLift) {
              editor.chain().focus().liftListItem("listItem").run();
            } else {
              // If can't lift more, toggle off the list
              if (isInBulletList) {
                editor.chain().focus().toggleBulletList().run();
              } else if (isInOrderedList) {
                editor.chain().focus().toggleOrderedList().run();
              }
            }
          }
          // If not in list, Shift+Tab does nothing
        } else {
          // Tab: increase indent
          if (isInList) {
            // Try to sink list item
            const canSink = editor.can().sinkListItem("listItem");
            if (canSink) {
              editor.chain().focus().sinkListItem("listItem").run();
            }
            // If can't sink (first item in list), do nothing - this is expected behavior
          } else {
            // If not in list, create a bullet list
            editor.chain().focus().toggleBulletList().run();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

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
      <Toolbar
        editor={editor}
        lineHeight={lineHeight}
        onLineHeightChange={handleLineHeightChange}
      />
      <div className={styles.editorContent} style={{ lineHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
