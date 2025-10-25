-- Add user_id column to tags table
ALTER TABLE public.tags ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_tags_user_id ON public.tags(user_id);

-- Drop existing public RLS policies on tags
DROP POLICY IF EXISTS "Permitir leitura pública de tags" ON public.tags;
DROP POLICY IF EXISTS "Permitir inserção pública de tags" ON public.tags;
DROP POLICY IF EXISTS "Permitir atualização pública de tags" ON public.tags;
DROP POLICY IF EXISTS "Permitir exclusão pública de tags" ON public.tags;

-- Create owner-based RLS policies for tags
CREATE POLICY "Users can read own tags" ON public.tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON public.tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON public.tags
  FOR DELETE USING (auth.uid() = user_id);

-- Drop existing public RLS policies on location_history
DROP POLICY IF EXISTS "Permitir leitura pública de histórico" ON public.location_history;
DROP POLICY IF EXISTS "Permitir inserção pública de histórico" ON public.location_history;

-- Create owner-based RLS policies for location_history
CREATE POLICY "Users can read own location history" ON public.location_history
  FOR SELECT USING (
    tag_id IN (SELECT id FROM public.tags WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own location history" ON public.location_history
  FOR INSERT WITH CHECK (
    tag_id IN (SELECT id FROM public.tags WHERE user_id = auth.uid())
  );