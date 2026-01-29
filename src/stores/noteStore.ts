import { create } from "zustand";
import type { Note, NoteTreeNode } from "../types";
import * as db from "../services/database";

interface NoteState {
  notes: Note[];
  noteTree: NoteTreeNode[];
  selectedNoteId: number | null;
  selectedNote: Note | null;
  expandedIds: Set<number>;
  isLoading: boolean;
  searchQuery: string;
  searchResults: Note[];

  // Actions
  loadNotes: () => Promise<void>;
  selectNote: (id: number | null) => Promise<void>;
  createNote: (parentId: number | null) => Promise<number>;
  updateNote: (
    id: number,
    updates: Partial<Pick<Note, "title" | "content">>
  ) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;
  moveNote: (
    id: number,
    newParentId: number | null,
    newPosition: number
  ) => Promise<void>;
  toggleExpanded: (id: number) => void;
  setSearchQuery: (query: string) => void;
  performSearch: () => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  noteTree: [],
  selectedNoteId: null,
  selectedNote: null,
  expandedIds: new Set(),
  isLoading: false,
  searchQuery: "",
  searchResults: [],

  loadNotes: async () => {
    set({ isLoading: true });
    try {
      const notes = await db.getAllNotes();
      const noteTree = db.buildNoteTree(notes);
      set({ notes, noteTree, isLoading: false });
    } catch (error) {
      console.error("Failed to load notes:", error);
      set({ isLoading: false });
    }
  },

  selectNote: async (id: number | null) => {
    if (id === null) {
      set({ selectedNoteId: null, selectedNote: null });
      return;
    }
    const note = await db.getNoteById(id);
    set({ selectedNoteId: id, selectedNote: note });
  },

  createNote: async (parentId: number | null) => {
    const newId = await db.createNote(parentId);
    await get().loadNotes();

    // Expand parent if creating a child
    if (parentId !== null) {
      const expandedIds = new Set(get().expandedIds);
      expandedIds.add(parentId);
      set({ expandedIds });
    }

    // Select the new note
    await get().selectNote(newId);
    return newId;
  },

  updateNote: async (
    id: number,
    updates: Partial<Pick<Note, "title" | "content">>
  ) => {
    await db.updateNote(id, updates);
    await get().loadNotes();

    // Update selected note if it's the one being edited
    if (get().selectedNoteId === id) {
      const note = await db.getNoteById(id);
      set({ selectedNote: note });
    }
  },

  deleteNote: async (id: number) => {
    await db.deleteNote(id);
    await get().loadNotes();

    // Clear selection if deleted note was selected
    if (get().selectedNoteId === id) {
      set({ selectedNoteId: null, selectedNote: null });
    }
  },

  moveNote: async (
    id: number,
    newParentId: number | null,
    newPosition: number
  ) => {
    await db.moveNote(id, newParentId, newPosition);
    await get().loadNotes();
  },

  toggleExpanded: (id: number) => {
    const expandedIds = new Set(get().expandedIds);
    if (expandedIds.has(id)) {
      expandedIds.delete(id);
    } else {
      expandedIds.add(id);
    }
    set({ expandedIds });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    if (query.trim() === "") {
      set({ searchResults: [] });
    }
  },

  performSearch: async () => {
    const query = get().searchQuery.trim();
    if (query === "") {
      set({ searchResults: [] });
      return;
    }
    const results = await db.searchNotes(query);
    set({ searchResults: results });
  },
}));
