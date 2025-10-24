import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tagId } = await req.json();
    
    console.log('Query K-Tag API for tag:', tagId);

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Buscar informações da tag
    const { data: tag, error: tagError } = await supabaseClient
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .single();

    if (tagError || !tag) {
      console.error('Tag not found:', tagError);
      return new Response(
        JSON.stringify({ error: 'Tag não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tag found:', tag.name);

    // Chamar API K-Tag
    const ktagApiUrl = 'http://47.113.127.14:6176';
    const authHeader = 'Basic ' + btoa('TagLocation:a9B3xQ7z');

    const payload = {
      accessoryId: tag.accessory_id,
      hashed_keys: [tag.hashed_adv_key],
      priv_keys: [tag.private_key]
    };

    console.log('Calling K-Tag API with payload:', { accessoryId: tag.accessory_id });

    const ktagResponse = await fetch(ktagApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!ktagResponse.ok) {
      console.error('K-Tag API error:', ktagResponse.status, await ktagResponse.text());
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar API K-Tag' }),
        { status: ktagResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ktagData = await ktagResponse.json();
    console.log('K-Tag API response:', ktagData);

    // Interpretar resposta da API K-Tag
    // A resposta geralmente contém: latitude, longitude, confidence, timestamp
    const location = {
      latitude: ktagData.latitude || ktagData.lat || null,
      longitude: ktagData.longitude || ktagData.lng || ktagData.lon || null,
      confidence: ktagData.confidence || null,
      status_code: ktagData.status || ktagData.statusCode || null,
      timestamp: ktagData.timestamp || new Date().toISOString(),
    };

    console.log('Parsed location:', location);

    // Salvar no histórico se temos lat/lon
    if (location.latitude && location.longitude) {
      const { error: historyError } = await supabaseClient
        .from('location_history')
        .insert({
          tag_id: tagId,
          latitude: location.latitude,
          longitude: location.longitude,
          confidence: location.confidence,
          status_code: location.status_code,
          timestamp: location.timestamp,
        });

      if (historyError) {
        console.error('Error saving to history:', historyError);
      } else {
        console.log('Location saved to history');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        location,
        rawResponse: ktagData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in query-ktag function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
