import Database from "@tauri-apps/plugin-sql";
import type { Note, Attachment, NoteTreeNode } from "../types";

let db: Database | null = null;
let initialized = false;

async function initializeDatabase(database: Database): Promise<void> {
  if (initialized) return;

  try {
    // Create notes table
    console.log("Creating notes table...");
    await database.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER,
        title TEXT NOT NULL DEFAULT 'New Note',
        content TEXT DEFAULT '',
        position INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES notes(id) ON DELETE CASCADE
      )
    `);

    // Create attachments table
    console.log("Creating attachments table...");
    await database.execute(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    console.log("Creating indexes...");
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_notes_parent_id ON notes(parent_id)`);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_attachments_note_id ON attachments(note_id)`);

    initialized = true;
    console.log("All tables and indexes created successfully");
  } catch (error) {
    console.error("Failed to create tables:", error);
    throw error;
  }
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    try {
      console.log("Connecting to database...");
      db = await Database.load("sqlite:mynote.db");
      console.log("Database connected, initializing tables...");
      await initializeDatabase(db);
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }
  return db;
}

// Note CRUD operations
export async function getAllNotes(): Promise<Note[]> {
  const database = await getDatabase();
  return await database.select<Note[]>(
    "SELECT * FROM notes ORDER BY parent_id, position"
  );
}

export async function getNoteById(id: number): Promise<Note | null> {
  const database = await getDatabase();
  const notes = await database.select<Note[]>(
    "SELECT * FROM notes WHERE id = ?",
    [id]
  );
  return notes[0] || null;
}

export async function createNote(
  parentId: number | null,
  title: string = "New Note"
): Promise<number> {
  const database = await getDatabase();

  // Get max position for siblings
  const maxPosResult = await database.select<[{ max_pos: number | null }]>(
    "SELECT MAX(position) as max_pos FROM notes WHERE parent_id IS ?",
    [parentId]
  );
  const position = (maxPosResult[0]?.max_pos ?? -1) + 1;

  const result = await database.execute(
    "INSERT INTO notes (parent_id, title, position) VALUES (?, ?, ?)",
    [parentId, title, position]
  );

  return result.lastInsertId as number;
}

export async function updateNote(
  id: number,
  updates: Partial<Pick<Note, "title" | "content" | "parent_id" | "position">>
): Promise<void> {
  const database = await getDatabase();

  const setClauses: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.title !== undefined) {
    setClauses.push("title = ?");
    values.push(updates.title);
  }
  if (updates.content !== undefined) {
    setClauses.push("content = ?");
    values.push(updates.content);
  }
  if (updates.parent_id !== undefined) {
    setClauses.push("parent_id = ?");
    values.push(updates.parent_id);
  }
  if (updates.position !== undefined) {
    setClauses.push("position = ?");
    values.push(updates.position);
  }

  setClauses.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await database.execute(
    `UPDATE notes SET ${setClauses.join(", ")} WHERE id = ?`,
    values
  );
}

export async function deleteNote(id: number): Promise<void> {
  const database = await getDatabase();
  await database.execute("DELETE FROM notes WHERE id = ?", [id]);
}

export async function moveNote(
  id: number,
  newParentId: number | null,
  newPosition: number
): Promise<void> {
  const database = await getDatabase();

  // Update positions of siblings in the new parent
  await database.execute(
    "UPDATE notes SET position = position + 1 WHERE parent_id IS ? AND position >= ?",
    [newParentId, newPosition]
  );

  // Move the note
  await database.execute(
    "UPDATE notes SET parent_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [newParentId, newPosition, id]
  );
}

// Build tree structure from flat notes
export function buildNoteTree(notes: Note[]): NoteTreeNode[] {
  const noteMap = new Map<number, NoteTreeNode>();
  const roots: NoteTreeNode[] = [];

  // Create nodes
  for (const note of notes) {
    noteMap.set(note.id, { ...note, children: [], isExpanded: true });
  }

  // Build tree
  for (const note of notes) {
    const node = noteMap.get(note.id)!;
    if (note.parent_id === null) {
      roots.push(node);
    } else {
      const parent = noteMap.get(note.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  // Sort children by position
  const sortChildren = (nodes: NoteTreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position);
    for (const node of nodes) {
      sortChildren(node.children);
    }
  };
  sortChildren(roots);

  return roots;
}

// Search notes
export async function searchNotes(query: string): Promise<Note[]> {
  const database = await getDatabase();
  const searchTerm = `%${query}%`;
  return await database.select<Note[]>(
    "SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC",
    [searchTerm, searchTerm]
  );
}

// Attachment operations
export async function getAttachmentsByNoteId(
  noteId: number
): Promise<Attachment[]> {
  const database = await getDatabase();
  return await database.select<Attachment[]>(
    "SELECT * FROM attachments WHERE note_id = ?",
    [noteId]
  );
}

export async function createAttachment(
  noteId: number,
  filename: string,
  filePath: string,
  mimeType: string | null,
  fileSize: number | null
): Promise<number> {
  const database = await getDatabase();
  const result = await database.execute(
    "INSERT INTO attachments (note_id, filename, file_path, mime_type, file_size) VALUES (?, ?, ?, ?, ?)",
    [noteId, filename, filePath, mimeType, fileSize]
  );
  return result.lastInsertId as number;
}

export async function deleteAttachment(id: number): Promise<void> {
  const database = await getDatabase();
  await database.execute("DELETE FROM attachments WHERE id = ?", [id]);
}
