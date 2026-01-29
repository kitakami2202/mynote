export interface Note {
  id: number;
  parent_id: number | null;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  position: number;
}

export interface NoteTreeNode extends Note {
  children: NoteTreeNode[];
  isExpanded?: boolean;
}

export interface Attachment {
  id: number;
  note_id: number;
  filename: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface SearchResult {
  note: Note;
  matchedText: string;
}
