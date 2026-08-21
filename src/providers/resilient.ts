import type { GuardCompletionParams, GuardProvider } from '../core/types.js'

export interface ResilienceOptions {
  retries?: number
  delayMs?: number
  timeoutMs?: number
  onRetry?: (attempt: number, error: unknown) => void
}

/** Wrap any GuardProvider with transport retries and a per-call timeout. */
export class ResilientProvider implements GuardProvider {
  name: string

  constructor(
    private readonly inner: GuardProvider,
    private readonly options: ResilienceOptions = {},
  ) {
    this.name = `resilient(${inner.name})`
  }

  async complete(params: GuardCompletionParams): Promise<string> {
    const retries = this.options.retries ?? 2
    const delayMs = this.options.delayMs ?? 200

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (params.signal?.aborted) throw abortError()
      try {
        return await this.callOnce(params)
      } catch (error) {
        if (isAbortError(error) || attempt === retries) throw error
        this.options.onRetry?.(attempt + 1, error)
        await sleep(delayMs * 2 ** attempt)
      }
    }

    throw new Error('Unreachable provider retry state')
  }

  private async callOnce(params: GuardCompletionParams): Promise<string> {
    const timeoutMs = this.options.timeoutMs
    if (!timeoutMs) return this.inner.complete(params)

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(`Provider timeout after ${timeoutMs}ms`)
        controller.abort(error)
        reject(error)
      }, timeoutMs)
    })

    const abortPromise = new Promise<never>((_, reject) => {
      const onOuterAbort = () => {
        const reason = params.signal?.reason
        controller.abort(reason)
        reject(reason instanceof Error ? reason : abortError())
      }
      params.signal?.addEventListener('abort', onOuterAbort, { once: true })
    })

    try {
      return await Promise.race([
        this.inner.complete({ ...params, signal: controller.signal }),
        timeoutPromise,
        abortPromise,
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
}

export function withResilience(provider: GuardProvider, options: ResilienceOptions = {}): GuardProvider {
  return new ResilientProvider(provider, options)
}

function abortError(): Error {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.message === 'Aborted')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
