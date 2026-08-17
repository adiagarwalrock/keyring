'use client'

import Image, { type StaticImageData } from 'next/image'
import { ChevronDown, ChevronUp, Download, Eye, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import AnthropicLogo from '@lobehub/icons-static-svg/icons/anthropic.svg'
import BasetenLogo from '@lobehub/icons-static-svg/icons/baseten.svg'
import CerebrasLogo from '@lobehub/icons-static-svg/icons/cerebras-color.svg'
import CohereLogo from '@lobehub/icons-static-svg/icons/cohere-color.svg'
import DeepInfraLogo from '@lobehub/icons-static-svg/icons/deepinfra-color.svg'
import FireworksLogo from '@lobehub/icons-static-svg/icons/fireworks-color.svg'
import GeminiLogo from '@lobehub/icons-static-svg/icons/gemini-color.svg'
import GroqLogo from '@lobehub/icons-static-svg/icons/groq.svg'
import HuggingFaceLogo from '@lobehub/icons-static-svg/icons/huggingface-color.svg'
import HyperbolicLogo from '@lobehub/icons-static-svg/icons/hyperbolic-color.svg'
import MistralLogo from '@lobehub/icons-static-svg/icons/mistral-color.svg'
import NebiusLogo from '@lobehub/icons-static-svg/icons/nebius.svg'
import NvidiaLogo from '@lobehub/icons-static-svg/icons/nvidia-color.svg'
import NovitaLogo from '@lobehub/icons-static-svg/icons/novita-color.svg'
import OpenAILogo from '@lobehub/icons-static-svg/icons/openai.svg'
import OpenRouterLogo from '@lobehub/icons-static-svg/icons/openrouter-color.svg'
import ReplicateLogo from '@lobehub/icons-static-svg/icons/replicate.svg'
import SambaNovaLogo from '@lobehub/icons-static-svg/icons/sambanova-color.svg'
import TogetherLogo from '@lobehub/icons-static-svg/icons/together-color.svg'
import XAILogo from '@lobehub/icons-static-svg/icons/xai.svg'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
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

const ONBOARDING_STORAGE_KEY = 'key-ring.onboarding-seen'

const providerLogos: Record<ProviderId, StaticImageData> = {
  openai: OpenAILogo,
  anthropic: AnthropicLogo,
  gemini: GeminiLogo,
  groq: GroqLogo,
  together: TogetherLogo,
  openrouter: OpenRouterLogo,
  cohere: CohereLogo,
  xai: XAILogo,
  mistral: MistralLogo,
  cerebras: CerebrasLogo,
  fireworks: FireworksLogo,
  deepinfra: DeepInfraLogo,
  replicate: ReplicateLogo,
  baseten: BasetenLogo,
  sambanova: SambaNovaLogo,
  nebius: NebiusLogo,
  novita: NovitaLogo,
  hyperbolic: HyperbolicLogo,
  huggingface: HuggingFaceLogo,
  nvidia: NvidiaLogo,
}

const monochromeProviders = new Set<ProviderId>(['openai', 'anthropic', 'groq', 'xai', 'replicate', 'baseten', 'nebius'])

function ProviderIcon({ provider }: { provider: ProviderId }) {
  return <span aria-hidden="true" className="provider-icon"><Image alt="" className={monochromeProviders.has(provider) ? 'provider-logo-mono' : undefined} height={20} src={providerLogos[provider]} width={20} /></span>
}

export default function Home() {
  const [key, setKey] = useState('')
  const [selected, setSelected] = useState<ProviderId[]>([])
  const [consentVisible, setConsentVisible] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [results, setResults] = useState<InspectionResult[]>([])
  const [dark, setDark] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(true)
  const [wipeConfirmationOpen, setWipeConfirmationOpen] = useState(false)
  const abortController = useRef<AbortController | null>(null)

  const candidates = useMemo(() => likelyProviders(key), [key])
  const activeProviders = selected.length
    ? PROVIDERS.filter((provider) => selected.includes(provider.id))
    : candidates
  const providerHint = selected.length
    ? `${selected.length} direct provider${selected.length === 1 ? '' : 's'} selected.`
    : candidates.length === 0
      ? 'Paste a key to see likely providers.'
      : candidates.length === 1
        ? `Likely match: ${candidates[0].name}.`
        : `${candidates.length} likely provider matches.`
  const confirmedResults = results.filter((result) => result.status === 'confirmed')
  const failedResults = results.filter((result) => result.status !== 'confirmed')
  const privilegedWarning = key.startsWith('sk-admin-')
  const possibleManagementWarning = key.startsWith('sk-or-v1-')

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true') setOnboardingOpen(false)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

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
    setResults([])
    setConsentVisible(false)
    setInspecting(false)
  }

  function dismissOnboarding() {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    setOnboardingOpen(false)
  }

  function wipeApplicationData() {
    clearInspection()
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    window.sessionStorage.removeItem(ONBOARDING_STORAGE_KEY)
    window.location.reload()
  }

  async function inspect() {
    if (!key.trim() || activeProviders.length === 0) return
    const controller = new AbortController()
    abortController.current = controller
    setInspecting(true)
    setResults([])
    setConsentVisible(false)
    const nextResults = await Promise.all(activeProviders.map((provider) => inspectProvider(provider, key.trim(), controller.signal)))
    if (!controller.signal.aborted) setResults(nextResults)
    if (abortController.current === controller) abortController.current = null
    setInspecting(false)
  }

  return (
    <main className="shell">
      <Dialog open={onboardingOpen} onOpenChange={(open) => open ? setOnboardingOpen(true) : dismissOnboarding()}>
        <DialogContent className="onboarding-dialog" aria-describedby="onboarding-description">
          <DialogHeader>
            <p className="eyebrow">WELCOME TO KEY RING</p>
            <DialogTitle>Inspect a key without handing it to us.</DialogTitle>
            <DialogDescription id="onboarding-description">A short tour of the browser-only workflow.</DialogDescription>
          </DialogHeader>
          <div className="tour-cards">
            <Card><CardContent><ShieldCheck aria-hidden="true" /><h3>Choose destinations</h3><p>Select likely providers or choose the providers you want to check.</p></CardContent></Card>
            <Card><CardContent><SlidersHorizontal aria-hidden="true" /><h3>Approve the request</h3><p>Review the exact number of read-only requests before anything is sent.</p></CardContent></Card>
            <Card><CardContent><Eye aria-hidden="true" /><h3>Read the result</h3><p>Confirmed providers come first; detailed responses stay folded and redacted.</p></CardContent></Card>
          </div>
          <DialogFooter><Button onClick={dismissOnboarding} type="button">Start inspecting</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={wipeConfirmationOpen} onOpenChange={setWipeConfirmationOpen}>
        <DialogContent className="wipe-dialog" aria-describedby="wipe-description">
          <DialogHeader>
            <DialogTitle>Wipe Key Ring data?</DialogTitle>
            <DialogDescription id="wipe-description">This clears the current key, inspection results, and onboarding setting from this browser, then reloads the page.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="wipe-dialog-actions"><Button onClick={() => setWipeConfirmationOpen(false)} type="button" variant="outline">Cancel</Button><Button className="wipe-confirm-button" onClick={wipeApplicationData} type="button">Wipe and reload</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <header className="topbar">
        <div className="brand"><span aria-hidden="true">◌</span> Key Ring</div>
        <Button className="theme-button" variant="outline" size="sm" onClick={() => setDark((value) => !value)} type="button" aria-label="Toggle color theme">
          {dark ? 'Light view' : 'Dark view'}
        </Button>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <h1 id="page-title">Know where a key belongs.<br /><em>Keep it yours.</em></h1>
        <p className="lede">Key Ring sends your key directly from this browser to the providers you approve. Your key is never saved, proxied, or logged by this app.</p>
      </section>

      <section className="inspector" aria-label="API key inspector">
        <FieldGroup className="inspection-fields" aria-label="Inspection fields">
          <Field className="provider-field">
            <Label>Provider</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="provider-trigger" variant="outline" type="button"><SlidersHorizontal size={16} /> {selected.length ? `${selected.length} selected` : 'Likely providers'}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Select providers</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PROVIDERS.map((provider) => <DropdownMenuCheckboxItem checked={selected.includes(provider.id)} key={provider.id} onCheckedChange={() => toggleProvider(provider.id)} onSelect={(event) => event.preventDefault()}><ProviderIcon provider={provider.id} /><span>{provider.name}</span></DropdownMenuCheckboxItem>)}
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={selected.length === PROVIDERS.length} onCheckedChange={(checked) => setSelected(checked ? PROVIDERS.map((provider) => provider.id) : [])} onSelect={(event) => event.preventDefault()}>All direct providers</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="input-help">{providerHint}</p>
          </Field>

          <Field className="key-field">
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
        </FieldGroup>

        {key && (
          <div className="warning-stack" aria-live="polite">
            {privilegedWarning && <p className="warning"><strong>Organization key detected.</strong> It follows the same selected, read-only provider inspection flow as every other key.</p>}
            {possibleManagementWarning && <p className="warning"><strong>OpenRouter key detected.</strong> Management-key format cannot be reliably distinguished here; inventory endpoints are never called.</p>}
          </div>
        )}

        {!consentVisible ? (
          <Button className="inspect-button" onClick={() => setConsentVisible(true)} type="button" disabled={!key.trim()}>
            Review {activeProviders.length} destination{activeProviders.length === 1 ? '' : 's'}
          </Button>
        ) : (
          <div className="consent" role="region" aria-label="Network request confirmation">
            <p>By continuing, this browser will send the key to the selected provider domains using one read-only verification request each. Privileged organization credentials may also make their provider&apos;s approved read-only organization request. Provider logs and policies apply after that point.</p>
            <div className="consent-actions">
              <Button className="secondary-button" variant="outline" onClick={() => setConsentVisible(false)} type="button">Back</Button>
              <Button className="inspect-button" onClick={inspect} type="button">I understand, inspect key</Button>
            </div>
          </div>
        )}
      </section>

      {inspecting && <p className="progress" aria-live="polite">Sending read-only verification requests directly from your browser…</p>}
      {results.length > 0 && (
        <section className="results" aria-labelledby="results-title">
          <div className="results-title"><p className="eyebrow">INSPECTION RESULT</p><h2 id="results-title">Confirmed providers</h2></div>
          {confirmedResults.length ? confirmedResults.map((result) => <ResultCard key={result.provider} result={result} />) : <p className="no-confirmed">No provider was confirmed by this inspection.</p>}
          {failedResults.length > 0 && <FailedResults results={failedResults} />}
        </section>
      )}

      <section className="data-controls" aria-labelledby="data-controls-title">
        <div><h2 id="data-controls-title">Browser data</h2><p>Clear the key, inspection results, and Key Ring&apos;s onboarding setting from this browser.</p></div>
        <Button className="wipe-button" variant="outline" onClick={() => setWipeConfirmationOpen(true)} type="button"><Trash2 size={16} /> Wipe app data</Button>
      </section>
      <footer>Direct browser requests only · No key storage</footer>
    </main>
  )
}

function FailedResults({ results }: { results: InspectionResult[] }) {
  return <Collapsible className="failed-results"><CollapsibleTrigger><span>Other checks</span><span className="failed-count">{results.length} not confirmed</span><ChevronDown className="closed-icon" size={16} /><ChevronUp className="open-icon" size={16} /></CollapsibleTrigger><CollapsibleContent>{results.map((result) => <ResultCard key={result.provider} result={result} />)}</CollapsibleContent></Collapsible>
}

function ResultCard({ result }: { result: InspectionResult }) {
  const hasMetadata = Object.keys(result.metadata).length > 0
  const hasRateLimits = Object.keys(result.rateLimits).length > 0
  return (
    <article className={`result-card ${result.status}`}>
      <div className="result-header"><div className="result-provider"><ProviderIcon provider={result.provider} /><h3>{result.providerName}</h3></div><span>{statusLabel[result.status]}</span></div>
      <p>{result.evidence}</p>
      {result.models.length > 0 && <p className="models"><strong>{result.models.length} models sampled:</strong> {result.models.slice(0, 8).join(', ')}{result.models.length > 8 ? '…' : ''}</p>}
      {hasMetadata && <Details title="Available key metadata" data={result.metadata} />}
      {hasRateLimits && <Details title="Rate limit headers" data={result.rateLimits} />}
      {result.organization !== undefined && <OrganizationDetails organization={result.organization} />}
      <ResponseDetails provider={result.provider} response={result.response} />
      <a href={result.docsUrl} target="_blank" rel="noreferrer">Open provider API docs <span aria-hidden="true">↗</span></a>
    </article>
  )
}

function Details({ title, data }: { title: string; data: Record<string, string | number | boolean> }) {
  return <Collapsible className="result-details"><CollapsibleTrigger>{title}<ChevronDown className="closed-icon" size={16} /><ChevronUp className="open-icon" size={16} /></CollapsibleTrigger><CollapsibleContent><dl>{Object.entries(data).map(([name, value]) => <div key={name}><dt>{name.replaceAll('_', ' ')}</dt><dd>{String(value)}</dd></div>)}</dl></CollapsibleContent></Collapsible>
}

function OrganizationDetails({ organization }: { organization: unknown }) {
  return <Collapsible className="result-details organization-details"><CollapsibleTrigger>Organization information <ChevronDown className="closed-icon" size={16} /><ChevronUp className="open-icon" size={16} /></CollapsibleTrigger><CollapsibleContent><p>Returned by the provider&apos;s approved read-only organization endpoint.</p><JsonTree value={organization} /></CollapsibleContent></Collapsible>
}

function ResponseDetails({ provider, response }: { provider: ProviderId; response: unknown }) {
  function downloadResponse() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `key-ring-${provider}-response.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <Collapsible className="result-details response-details"><CollapsibleTrigger>Show entire API response <ChevronDown className="closed-icon" size={16} /><ChevronUp className="open-icon" size={16} /></CollapsibleTrigger><CollapsibleContent><p className="json-guidance">Expand a row to inspect it. Indentation shows parent-child structure; arrays and objects stay folded until opened.</p><JsonTree value={response} /><Button className="download-response" onClick={downloadResponse} size="sm" type="button" variant="outline"><Download size={15} /> Download JSON</Button><p>Credentials and secret-shaped values are redacted before display.</p></CollapsibleContent></Collapsible>
}

function JsonTree({ value, name, depth = 0 }: { value: unknown; name?: string; depth?: number }) {
  const isContainer = value !== null && typeof value === 'object'
  if (!isContainer) return <div className="json-leaf">{name && <span className="json-key">{name}</span>}<span className="json-value">{formatJsonValue(value)}</span></div>

  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value)
  const label = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`
  return <Collapsible className="json-node" defaultOpen={depth === 0}><CollapsibleTrigger>{name && <span className="json-key">{name}</span>}<span className="json-summary">{label}</span><ChevronDown className="closed-icon" size={14} /><ChevronUp className="open-icon" size={14} /></CollapsibleTrigger><CollapsibleContent><div className="json-children">{entries.length ? entries.map(([childName, childValue]) => <JsonTree depth={depth + 1} key={childName} name={childName} value={childValue} />) : <span className="json-empty">empty</span>}</div></CollapsibleContent></Collapsible>
}

function formatJsonValue(value: unknown) {
  return typeof value === 'string' ? JSON.stringify(value) : String(value)
}
