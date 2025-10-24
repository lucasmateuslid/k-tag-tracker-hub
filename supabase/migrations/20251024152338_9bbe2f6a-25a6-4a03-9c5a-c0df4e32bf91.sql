-- Tabela de Tags K-Tag
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  accessory_id TEXT NOT NULL UNIQUE,
  hashed_adv_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de histórico de posições
CREATE TABLE public.location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  confidence INTEGER,
  status_code INTEGER,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - permitir acesso público para esta demo
-- Em produção, você deve adicionar autenticação e vincular a user_id
CREATE POLICY "Permitir leitura pública de tags" 
  ON public.tags FOR SELECT 
  USING (true);

CREATE POLICY "Permitir inserção pública de tags" 
  ON public.tags FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de tags" 
  ON public.tags FOR UPDATE 
  USING (true);

CREATE POLICY "Permitir exclusão pública de tags" 
  ON public.tags FOR DELETE 
  USING (true);

CREATE POLICY "Permitir leitura pública de histórico" 
  ON public.location_history FOR SELECT 
  USING (true);

CREATE POLICY "Permitir inserção pública de histórico" 
  ON public.location_history FOR INSERT 
  WITH CHECK (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_tags_accessory_id ON public.tags(accessory_id);
CREATE INDEX idx_location_history_tag_id ON public.location_history(tag_id);
CREATE INDEX idx_location_history_timestamp ON public.location_history(timestamp DESC);

-- Habilitar realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.tags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_history;