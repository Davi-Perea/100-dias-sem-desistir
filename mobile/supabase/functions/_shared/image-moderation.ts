/**
 * Filtro automático de IMAGEM da Comunidade (F5, feedback do fundador de
 * 2026-09-22), SEM nada de Deno: testado no Jest.
 *
 * Adaptador de provedor escolhido por SEGREDO da Edge Function:
 *   MODERATION_PROVIDER        'aws-rekognition' (o único implementado)
 *   AWS_ACCESS_KEY_ID          chave de um usuário IAM só com rekognition:DetectModerationLabels
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_SESSION_TOKEN          opcional (credencial temporária)
 *   MODERATION_AWS_REGION      padrão 'sa-east-1' (São Paulo)
 *   MODERATION_MIN_CONFIDENCE  padrão 50 (1–99): rótulo com confiança a partir disso = suspeita
 * Sem provedor configurado (ou com configuração incompleta), imageModeratorFromEnv
 * devolve null e a foto fica para a aprovação humana: o PADRÃO SEGURO.
 *
 * Regra do veredito (conservadora): QUALQUER rótulo de moderação acima da
 * confiança mínima = 'suspeita' (vai para uma pessoa). Só a foto sem rótulo
 * nenhum sai 'limpa'. Erro do provedor = a foto não é liberada.
 *
 * NÃO CONFIRMADO (2026-09-22, sem acesso à AWS nesta máquina): que o Amazon
 * Rekognition atende em sa-east-1. Conferir na lista de serviços por região da
 * AWS ANTES de configurar. Se não atender, a região é trocável por segredo, mas
 * mandar a foto para fora do Brasil é transferência internacional (LGPD art. 33)
 * e precisa ir para o Product Brain / jurídico antes (ver "pedidos").
 * O Rekognition não reconhece criança exposta nem rosto de terceiro sem
 * autorização: a denúncia urgente continua sendo a proteção para isso.
 */

export type PhotoVerdict = 'limpa' | 'suspeita';

export type ModerationResult = { verdict: PhotoVerdict; labels: string[] };

export type ImageModerator = {
  /** Vai para community_post_photos.auto_provider ('^[a-z0-9-]{1,40}$'). */
  name: string;
  check(bytes: Uint8Array): Promise<ModerationResult>;
};

/** HMAC-SHA256 e SHA-256 (crypto.subtle no Deno; node:crypto nos testes). */
export type CryptoDeps = {
  sha256(data: Uint8Array): Promise<Uint8Array>;
  hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array>;
};

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type ModeratorDeps = {
  fetch: FetchLike;
  crypto: CryptoDeps;
  now(): Date;
  /** Tempo máximo por foto. Padrão 8 s. */
  timeoutMs?: number;
};

const encoder = new TextEncoder();

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return out;
}

/** '2026-09-22T12:34:56.789Z' → '20260922T123456Z'. */
export function amzDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export type AwsCredentials = { accessKeyId: string; secretAccessKey: string; sessionToken?: string | null };

export type AwsRequest = {
  method: string;
  host: string;
  path: string;
  region: string;
  service: string;
  /** Cabeçalhos a assinar, além de host e x-amz-date (nomes em minúsculas). */
  headers: Record<string, string>;
  body: string;
};

/**
 * AWS Signature Version 4 (docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-create-signed-request.html).
 * Devolve os cabeçalhos para o fetch (sem 'host', que o fetch põe sozinho a
 * partir da URL; o valor assinado é o mesmo). Sem query string (não usamos).
 */
export async function signAwsV4(
  request: AwsRequest,
  credentials: AwsCredentials,
  date: Date,
  crypto: CryptoDeps,
): Promise<Record<string, string>> {
  const stamp = amzDate(date);
  const day = stamp.slice(0, 8);
  const headers: Record<string, string> = { ...request.headers, host: request.host, 'x-amz-date': stamp };
  if (credentials.sessionToken) headers['x-amz-security-token'] = credentials.sessionToken;
  const names = Object.keys(headers)
    .map((name) => name.toLowerCase())
    .sort();
  const lower: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) lower[name.toLowerCase()] = value.trim().replace(/\s+/g, ' ');
  const canonicalHeaders = names.map((name) => `${name}:${lower[name]}\n`).join('');
  const signedHeaders = names.join(';');
  const payloadHash = toHex(await crypto.sha256(encoder.encode(request.body)));
  const canonicalRequest = [request.method, request.path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${day}/${request.region}/${request.service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', stamp, scope, toHex(await crypto.sha256(encoder.encode(canonicalRequest)))].join(
    '\n',
  );
  let key = await crypto.hmacSha256(encoder.encode(`AWS4${credentials.secretAccessKey}`), encoder.encode(day));
  key = await crypto.hmacSha256(key, encoder.encode(request.region));
  key = await crypto.hmacSha256(key, encoder.encode(request.service));
  key = await crypto.hmacSha256(key, encoder.encode('aws4_request'));
  const signature = toHex(await crypto.hmacSha256(key, encoder.encode(stringToSign)));

  const out: Record<string, string> = {};
  for (const name of names) if (name !== 'host') out[name] = lower[name];
  out.authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return out;
}

export type RekognitionConfig = AwsCredentials & { region: string; minConfidence: number };

type Row = Record<string, unknown>;

/** Nomes dos rótulos (e das categorias-mãe) acima da confiança mínima. */
export function labelsFromResponse(body: unknown, minConfidence: number): string[] {
  const list = (body as Row | null)?.ModerationLabels;
  if (!Array.isArray(list)) throw new Error('resposta sem ModerationLabels');
  const names = new Set<string>();
  for (const item of list) {
    const label = (item ?? {}) as Row;
    const confidence = typeof label.Confidence === 'number' ? label.Confidence : 0;
    if (confidence < minConfidence) continue;
    for (const key of ['ParentName', 'Name'] as const) {
      const value = label[key];
      if (typeof value === 'string' && value.trim()) names.add(value.trim().slice(0, 80));
    }
  }
  return [...names].sort().slice(0, 20);
}

/** Amazon Rekognition DetectModerationLabels (imagem em bytes, até 5 MB; as nossas têm até 1,5 MB). */
export function rekognitionModerator(config: RekognitionConfig, deps: ModeratorDeps): ImageModerator {
  const host = `rekognition.${config.region}.amazonaws.com`;
  return {
    name: 'aws-rekognition',
    async check(bytes: Uint8Array): Promise<ModerationResult> {
      const body = JSON.stringify({ Image: { Bytes: toBase64(bytes) }, MinConfidence: config.minConfidence });
      const headers = await signAwsV4(
        {
          method: 'POST',
          host,
          path: '/',
          region: config.region,
          service: 'rekognition',
          headers: {
            'content-type': 'application/x-amz-json-1.1',
            'x-amz-target': 'RekognitionService.DetectModerationLabels',
          },
          body,
        },
        config,
        deps.now(),
        deps.crypto,
      );
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 8000);
      try {
        const response = await deps.fetch(`https://${host}/`, { method: 'POST', headers, body, signal: controller.signal });
        if (!response.ok) throw new Error(`rekognition respondeu ${response.status}`);
        const labels = labelsFromResponse(await response.json(), config.minConfidence);
        return { verdict: labels.length > 0 ? 'suspeita' : 'limpa', labels };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

const REGION_RE = /^[a-z]{2}(-[a-z]+)+-\d$/;

/**
 * O provedor configurado nos segredos, ou null (sem filtro: aprovação humana).
 * Configuração incompleta ou estranha também dá null: nunca "libera" por engano.
 */
export function imageModeratorFromEnv(
  env: (name: string) => string | null,
  deps: ModeratorDeps,
): ImageModerator | null {
  const provider = env('MODERATION_PROVIDER');
  if (provider !== 'aws-rekognition') return null;
  const accessKeyId = env('AWS_ACCESS_KEY_ID');
  const secretAccessKey = env('AWS_SECRET_ACCESS_KEY');
  if (!accessKeyId || !secretAccessKey) return null;
  const region = env('MODERATION_AWS_REGION') ?? 'sa-east-1';
  if (!REGION_RE.test(region)) return null;
  const raw = Number(env('MODERATION_MIN_CONFIDENCE') ?? '50');
  const minConfidence = Number.isFinite(raw) ? Math.min(99, Math.max(1, raw)) : 50;
  return rekognitionModerator(
    { accessKeyId, secretAccessKey, sessionToken: env('AWS_SESSION_TOKEN'), region, minConfidence },
    deps,
  );
}
