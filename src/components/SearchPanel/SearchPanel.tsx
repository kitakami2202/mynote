import { useState, useEffect, useCallback } from "react";
import { useNoteStore } from "../../stores/noteStore";
import styles from "./SearchPanel.module.css";

export function SearchPanel() {
  const {
    searchQuery,
    searchResults,
    setSearchQuery,
    performSearch,
    selectNote,
  } = useNoteStore();

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(inputValue);
      if (inputValue.trim()) {
        performSearch();
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [inputValue, setSearchQuery, performSearch]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl+F to open search
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape to close
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setInputValue("");
        setSearchQuery("");
      }
    },
    [isOpen, setSearchQuery]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleResultClick = (noteId: number) => {
    selectNote(noteId);
    setIsOpen(false);
    setInputValue("");
    setSearchQuery("");
  };

  if (!isOpen) {
    return (
      <button
        className={styles.searchButton}
        onClick={() => setIsOpen(true)}
        title="検索 (Ctrl+F)"
      >
        🔍
      </button>
    );
  }

  return (
    <div className={styles.searchPanel}>
      <div className={styles.searchInputContainer}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="ノートを検索..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
        />
        <button
          className={styles.closeButton}
          onClick={() => {
            setIsOpen(false);
            setInputValue("");
            setSearchQuery("");
          }}
        >
          ✕
        </button>
      </div>

      {searchQuery && (
        <div className={styles.searchResults}>
          {searchResults.length === 0 ? (
            <div className={styles.noResults}>
              「{searchQuery}」に一致するノートが見つかりません
            </div>
          ) : (
            <>
              <div className={styles.resultCount}>
                {searchResults.length}件の結果
              </div>
              {searchResults.map((note) => (
                <div
                  key={note.id}
                  className={styles.resultItem}
                  onClick={() => handleResultClick(note.id)}
                >
                  <div className={styles.resultTitle}>{note.title}</div>
                  <div className={styles.resultDate}>
                    {new Date(note.updated_at).toLocaleDateString("ja-JP")}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
