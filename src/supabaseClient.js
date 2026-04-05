import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://mublrarqyqigdgytamyn.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11YmxyYXJxeXFpZ2RneXRhbXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODI5MDYsImV4cCI6MjA5MDk1ODkwNn0.4yvxIQuBRZ52FI44zCw9bsFggbGsdUtF1n5Y4KDqjns' // La tua chiave anonima lunga
)