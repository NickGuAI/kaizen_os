/**
 * Send email via AWS SES v2 SendEmail API with Signature V4 signing.
 */

interface SendEmailResult {
  success: boolean
  error?: string
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<SendEmailResult> {
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
  if (!accessKeyId || !secretAccessKey) {
    return { success: false, error: 'Missing AWS credentials (AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY)' }
  }
  const region = Deno.env.get('AWS_REGION') || 'us-east-1'
  const fromEmail = Deno.env.get('FROM_EMAIL')
  if (!fromEmail) {
    return { success: false, error: 'Missing FROM_EMAIL env var — SES requires a verified sender' }
  }

  const host = `email.${region}.amazonaws.com`
  const url = `https://${host}/v2/email/outbound-emails`
  const body = JSON.stringify({
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Html: { Data: html, Charset: 'UTF-8' } },
      },
    },
    Destination: { ToAddresses: [to] },
    FromEmailAddress: fromEmail,
  })

  const now = new Date()
  // Date.toISOString() always returns exactly 3 fractional-second digits
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const dateStamp = amzDate.slice(0, 8)

  const encoder = new TextEncoder()

  async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key instanceof ArrayBuffer ? new Uint8Array(key) : key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(msg))
  }

  async function sha256(data: string): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data))
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  const payloadHash = await sha256(body)
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-date'
  const canonicalRequest = `POST\n/v2/email/outbound-emails\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`

  // Derive signing key
  const kDate = await hmac(encoder.encode(`AWS4${secretAccessKey}`), dateStamp)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, 'ses')
  const kSigning = await hmac(kService, 'aws4_request')

  const signatureBuffer = await hmac(kSigning, stringToSign)
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Amz-Date': amzDate,
        Authorization: authorization,
      },
      body,
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `SES ${response.status}: ${text}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}
