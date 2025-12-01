import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION_MS = 5 * 60 * 1000;

// Rate limiting: max calls per tag per minute
const RATE_LIMIT_DURATION_MS = 60 * 1000;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Enable verbose logging in development
const VERBOSE_LOGS = Deno.env.get('ENVIRONMENT') !== 'production';

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Validate base64 format
function isValidBase64(str: string): boolean {
  if (!str || str.trim() === '') return false;
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}

// Sleep utility for retry logic
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch with retry logic
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }
      
      // Retry on server errors (5xx)
      if (attempt < retries - 1) {
        console.log(`K-Tag API error (${response.status}), retrying... (${attempt + 1}/${retries})`);
        await sleep(RETRY_DELAY_MS * (attempt + 1)); // Exponential backoff
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt < retries - 1) {
        console.log(`K-Tag API request failed, retrying... (${attempt + 1}/${retries})`, error);
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tagId } = await req.json();
    
    // Validate UUID format
    if (!tagId || !isValidUUID(tagId)) {
      return new Response(
        JSON.stringify({ error: 'ID da tag inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Query K-Tag API for tag:', tagId);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limiting
    const rateLimitCheck = await supabaseClient
      .from('location_history')
      .select('timestamp')
      .eq('tag_id', tagId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (rateLimitCheck.data) {
      const lastRequestTime = new Date(rateLimitCheck.data.timestamp).getTime();
      const timeSinceLastRequest = Date.now() - lastRequestTime;
      
      if (timeSinceLastRequest < RATE_LIMIT_DURATION_MS) {
        const waitTime = Math.ceil((RATE_LIMIT_DURATION_MS - timeSinceLastRequest) / 1000);
        return new Response(
          JSON.stringify({ 
            error: `Aguarde ${waitTime} segundos antes de atualizar novamente`,
            retryAfter: waitTime
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check cache
    const cacheCheck = await supabaseClient
      .from('location_history')
      .select('*')
      .eq('tag_id', tagId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (cacheCheck.data) {
      const cacheTime = new Date(cacheCheck.data.timestamp).getTime();
      const cacheAge = Date.now() - cacheTime;
      
      if (cacheAge < CACHE_DURATION_MS) {
        console.log('Returning cached location (age:', Math.floor(cacheAge / 1000), 'seconds)');
        return new Response(
          JSON.stringify({ 
            success: true, 
            location: {
              latitude: cacheCheck.data.latitude,
              longitude: cacheCheck.data.longitude,
              confidence: cacheCheck.data.confidence,
              status_code: cacheCheck.data.status_code,
              timestamp: cacheCheck.data.timestamp,
            },
            cached: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch tag information
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

    // Verify tag ownership
    if (tag.user_id !== user.id) {
      console.error('Unauthorized access attempt for tag:', tagId);
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate key formats
    if (!tag.hashed_adv_key || !tag.private_key) {
      return new Response(
        JSON.stringify({ error: 'Chaves da tag inválidas ou ausentes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (VERBOSE_LOGS) {
      console.log('Tag found:', tag.name);
    }

    // Get K-Tag API credentials from environment
    const ktagApiUrl = Deno.env.get('KTAG_API_URL');
    const ktagUsername = Deno.env.get('KTAG_USERNAME');
    const ktagPassword = Deno.env.get('KTAG_PASSWORD');

    if (!ktagApiUrl || !ktagUsername || !ktagPassword) {
      console.error('K-Tag API credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Configuração da API não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ktagAuthHeader = 'Basic ' + btoa(`${ktagUsername}:${ktagPassword}`);

    const payload = {
      accessoryId: tag.accessory_id,
      hashed_keys: [tag.hashed_adv_key],
      priv_keys: [tag.private_key]
    };

    console.log('Calling K-Tag API with accessoryId:', tag.accessory_id);

    // Call K-Tag API with retry logic
    const ktagResponse = await fetchWithRetry(ktagApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': ktagAuthHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!ktagResponse.ok) {
      const errorText = await ktagResponse.text();
      console.error('K-Tag API error:', ktagResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao consultar API K-Tag',
          details: ktagResponse.status === 401 ? 'Credenciais inválidas' : 'Erro de comunicação'
        }),
        { status: ktagResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ktagData = await ktagResponse.json();
    
    if (VERBOSE_LOGS) {
      console.log('K-Tag API response received');
    }

    // Parse response
    const results = ktagData.results || [];
    
    if (!results || results.length === 0) {
      console.log('No results returned from K-Tag API');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhuma localização disponível'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get latest report
    const latestReport = results[0];
    
    const location = {
      latitude: latestReport.lat || null,
      longitude: latestReport.lon || null,
      confidence: latestReport.conf || null,
      status_code: latestReport.status || null,
      timestamp: latestReport.timestamp 
        ? new Date(latestReport.timestamp).toISOString() 
        : new Date().toISOString(),
    };

    // Save to history if we have coordinates
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
        cached: false
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
