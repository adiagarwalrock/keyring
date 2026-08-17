'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Field, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import {
  CONFIGURATION_REQUIRED_PROVIDERS,
  inspectProvider,
  likelyProviders,
  PROVIDERS,
  type InspectionResult,
  type ProviderId,
} from '@/lib/providers'

const statusLabel = {
  confirmed: 'Confirmed',
  'valid-but-insufficient-permission': 'Permission blocked',
  'invalid-or-revoked': 'Rejected',
  'rate-limited': 'Rate limited',
  'cors-or-network-blocked': 'Browser blocked',
  inconclusive: 'Inconclusive',
} as const

export default function Home() {
  const [key, setKey] = useState('')
  const [selected, setSelected] = useState<ProviderId[]>([])
  const [scope, setScope] = useState<'standard' | 'organization'>('standard')
  const [consentVisible, setConsentVisible] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [results, setResults] = useState<InspectionResult[]>([])
  const [dark, setDark] = useState(false)
  const abortController = useRef<AbortController | null>(null)

  const candidates = useMemo(() => likelyProviders(key), [key])
  const selectableProviders = scope === 'organization' ? PROVIDERS.filter((provider) => provider.organization) : PROVIDERS
  const activeProviders = selected.length
    ? selectableProviders.filter((provider) => selected.includes(provider.id))
    : candidates.filter((provider) => selectableProviders.includes(provider))
  const privilegedWarning = key.startsWith('sk-admin-')
  const possibleManagementWarning = key.startsWith('sk-or-v1-')

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  function toggleProvider(providerId: ProviderId) {
    setSelected((current) => current.includes(providerId)
      ? current.filter((id) => id !== providerId)
      : [...current, providerId])
  }

  function clearInspection() {
    abortController.current?.abort()
    abortController.current = null
    setKey('')
    setSelected([])
    setScope('standard')
    setResults([])
    setConsentVisible(false)
    setInspecting(false)
  }

  async function inspect() {
    if (!key.trim() || activeProviders.length === 0) return
    const controller = new AbortController()
    abortController.current = controller
    setInspecting(true)
    setResults([])
    setConsentVisible(false)
    const nextResults = await Promise.all(activeProviders.map((provider) => inspectProvider(provider, key.trim(), controller.signal, fetch, scope)))
    if (!controller.signal.aborted) setResults(nextResults)
    if (abortController.current === controller) abortController.current = null
    setInspecting(false)
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span aria-hidden="true">◌</span> Key Ring</div>
        <Button className="theme-button" variant="outline" size="sm" onClick={() => setDark((value) => !value)} type="button" aria-label="Toggle color theme">
          {dark ? 'Light view' : 'Dark view'}
        </Button>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">BROWSER-ONLY INSPECTION</p>
        <h1 id="page-title">Know where a key belongs.<br /><em>Keep it yours.</em></h1>
        <p className="lede">Key Ring sends your key directly from this browser to the providers you approve. Nothing is saved, proxied, or logged by this app.</p>
      </section>

      <section className="inspector" aria-label="API key inspector">
        <FieldGroup aria-label="Inspection fields">
          <Field>
            <Label htmlFor="api-key">API key</Label>
            <div className="key-row">
          <Input
            id="api-key"
            value={key}
            onChange={(event) => { setKey(event.target.value); setResults([]); setConsentVisible(false) }}
            type="password"
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Paste a key to inspect"
            aria-describedby="key-help"
          />
          <Button className="clear-button" variant="outline" size="sm" onClick={clearInspection} type="button" disabled={!key && !results.length}>Clear</Button>
            </div>
            <p id="key-help" className="input-help">Held only in this tab&apos;s memory. Refreshing or clearing removes it.</p>
          </Field>

          <Field>
            <Label htmlFor="inspection-scope">API type</Label>
            <Select value={scope} onValueChange={(value: 'standard' | 'organization') => { setScope(value); setSelected([]); setResults([]); setConsentVisible(false) }}>
              <SelectTrigger id="inspection-scope"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard provider API</SelectItem>
                <SelectItem value="organization">Organization API</SelectItem>
              </SelectContent>
            </Select>
            <p className="input-help">Organization inspection uses the same direct, read-only request flow. Providers appear only when they expose an approved organization endpoint.</p>
          </Field>

        {key && (
          <div className="warning-stack" aria-live="polite">
            {privilegedWarning && <p className="warning"><strong>Organization key detected.</strong> Choose “Organization API” to inspect its approved read-only organization endpoint.</p>}
            {possibleManagementWarning && <p className="warning"><strong>OpenRouter key detected.</strong> Management-key format cannot be reliably distinguished here; inventory endpoints are never called.</p>}
          </div>
        )}

          <Field className="provider-field">
        <div className="provider-heading">
          <div>
            <p className="eyebrow">PROBE DESTINATIONS</p>
            <h2>Choose providers, or use likely matches</h2>
          </div>
          <Button className="select-all" variant="outline" size="sm" onClick={() => setSelected(selectableProviders.map((provider) => provider.id))} type="button">Try all direct providers</Button>
        </div>
        <div className="provider-grid">
          {selectableProviders.map((provider) => {
            const isLikely = candidates.some((candidate) => candidate.id === provider.id)
            const isSelected = selected.includes(provider.id)
            return (
              <Label className={`provider ${isSelected ? 'selected' : ''}`} key={provider.id}>
                <Checkbox checked={isSelected} onCheckedChange={() => toggleProvider(provider.id)} aria-label={`Select ${provider.name}`} />
                <span className="provider-name">{provider.name}</span>
                {isLikely && <span className="hint">likely prefix</span>}
                <code>{new URL(provider.endpoint).host}</code>
              </Label>
            )
          })}
        </div>

        {!consentVisible ? (
          <Button className="inspect-button" onClick={() => setConsentVisible(true)} type="button" disabled={!key.trim()}>
            Review {activeProviders.length} destination{activeProviders.length === 1 ? '' : 's'}
          </Button>
        ) : (
          <div className="consent" role="region" aria-label="Network request confirmation">
            <p>By continuing, this browser will send the key to the selected provider domains using one read-only verification request each. Provider logs and policies apply after that point.</p>
            <div className="consent-actions">
              <Button className="secondary-button" variant="outline" onClick={() => setConsentVisible(false)} type="button">Back</Button>
              <Button className="inspect-button" onClick={inspect} type="button">I understand, inspect key</Button>
            </div>
          </div>
        )}
          </Field>
        </FieldGroup>
      </section>

      <section className="configuration-required" aria-labelledby="configuration-required-title">
        <p className="eyebrow">ADDITIONAL PROVIDERS</p>
        <h2 id="configuration-required-title">Need more than a key</h2>
        <p>These providers are recognized, but Key Ring will not guess tenant, cloud, or regional details—or ask for extra secrets.</p>
        <div className="requirement-list">
          {CONFIGURATION_REQUIRED_PROVIDERS.map((provider) => (
            <a href={provider.docsUrl} key={provider.id} target="_blank" rel="noreferrer">
              <strong>{provider.name}</strong><span>{provider.requirement}</span><b aria-hidden="true">↗</b>
            </a>
          ))}
        </div>
      </section>

      {inspecting && <p className="progress" aria-live="polite">Sending read-only verification requests directly from your browser…</p>}
      {results.length > 0 && (
        <section className="results" aria-labelledby="results-title">
          <div className="results-title"><p className="eyebrow">INSPECTION RESULT</p><h2 id="results-title">What the providers returned safely</h2></div>
          {results.map((result) => <ResultCard key={result.provider} result={result} />)}
        </section>
      )}

      <footer>Direct browser requests only · No Vercel function · No storage · No analytics</footer>
    </main>
  )
}

function ResultCard({ result }: { result: InspectionResult }) {
  const hasMetadata = Object.keys(result.metadata).length > 0
  const hasRateLimits = Object.keys(result.rateLimits).length > 0
  return (
    <article className={`result-card ${result.status}`}>
      <div className="result-header"><h3>{result.providerName}</h3><span>{statusLabel[result.status]}</span></div>
      <p>{result.evidence}</p>
      {result.models.length > 0 && <p className="models"><strong>{result.models.length} models sampled:</strong> {result.models.slice(0, 8).join(', ')}{result.models.length > 8 ? '…' : ''}</p>}
      {hasMetadata && <Details title="Available key metadata" data={result.metadata} />}
      {hasRateLimits && <Details title="Rate limit headers" data={result.rateLimits} />}
      <ResponseDetails response={result.response} />
      <a href={result.docsUrl} target="_blank" rel="noreferrer">Open provider API docs <span aria-hidden="true">↗</span></a>
    </article>
  )
}

function Details({ title, data }: { title: string; data: Record<string, string | number | boolean> }) {
  return <Collapsible className="result-details"><CollapsibleTrigger>{title}<ChevronDown className="closed-icon" size={16} /><ChevronUp className="open-icon" size={16} /></CollapsibleTrigger><CollapsibleContent><dl>{Object.entries(data).map(([name, value]) => <div key={name}><dt>{name.replaceAll('_', ' ')}</dt><dd>{String(value)}</dd></div>)}</dl></CollapsibleContent></Collapsible>
}

function ResponseDetails({ response }: { response: unknown }) {
  const [open, setOpen] = useState(false)
  return <Collapsible className="result-details response-details" open={open} onOpenChange={setOpen}><CollapsibleTrigger>Show entire API response {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</CollapsibleTrigger><CollapsibleContent><pre>{JSON.stringify(response, null, 2)}</pre><p>Credentials and secret-shaped values are redacted before display.</p></CollapsibleContent></Collapsible>
}
