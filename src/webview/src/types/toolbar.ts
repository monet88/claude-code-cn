// Todo Project Interface
export interface Todo {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm: string  // Required field, because it is provided in actual use
}

// File Edit Information Interface
export interface FileEdit {
  name: string
  additions?: number
  deletions?: number
}