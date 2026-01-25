-- Portfolio database schema
-- Tables for messages, project settings, and admin user

-- Messages table for contact form submissions
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project settings table for controlling GitHub project visibility
CREATE TABLE IF NOT EXISTS project_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_repo_name TEXT NOT NULL UNIQUE,
  is_visible BOOLEAN DEFAULT TRUE,
  custom_description TEXT,
  custom_image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert messages (for contact form)
CREATE POLICY "Anyone can insert messages" ON messages
  FOR INSERT WITH CHECK (true);

-- Only authenticated users can view messages
CREATE POLICY "Authenticated users can view messages" ON messages
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only authenticated users can update messages
CREATE POLICY "Authenticated users can update messages" ON messages
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Only authenticated users can delete messages
CREATE POLICY "Authenticated users can delete messages" ON messages
  FOR DELETE USING (auth.role() = 'authenticated');

-- Enable RLS on project_settings table
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read visible project settings (for public portfolio)
CREATE POLICY "Anyone can view project settings" ON project_settings
  FOR SELECT USING (true);

-- Only authenticated users can insert project settings
CREATE POLICY "Authenticated users can insert project settings" ON project_settings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update project settings
CREATE POLICY "Authenticated users can update project settings" ON project_settings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Only authenticated users can delete project settings
CREATE POLICY "Authenticated users can delete project settings" ON project_settings
  FOR DELETE USING (auth.role() = 'authenticated');
