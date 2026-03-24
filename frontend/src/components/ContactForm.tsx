import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { getPhase1Text } from '@/i18n/phase1-extra';

const API_URL =
    import.meta.env.PUBLIC_API_URL ||
    (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');
const TURNSTILE_SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '';

type ContactReason = 'general' | 'technical' | 'privacy' | 'billing' | 'partnership';

declare global {
    interface Window {
        turnstile?: {
            render: (
                element: HTMLElement,
                options: {
                    sitekey: string;
                    callback?: (token: string) => void;
                    'expired-callback'?: () => void;
                    'error-callback'?: () => void;
                }
            ) => string;
            remove?: (widgetId: string) => void;
            reset?: (widgetId: string) => void;
        };
    }
}

interface ContactFormProps {
    lang: string;
}

export default function ContactForm({ lang }: ContactFormProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState<ContactReason>('general');
    const [message, setMessage] = useState('');
    const [honeypot, setHoneypot] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formStartedAtMs] = useState(() => Date.now());

    const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
    const turnstileWidgetIdRef = useRef<string | null>(null);

    const locale = useMemo(() => lang || 'en', [lang]);
    const tx = (key: Parameters<typeof getPhase1Text>[1]) => getPhase1Text(locale, key);
    const minMessageLength = 20;

    useEffect(() => {
        if (!TURNSTILE_SITE_KEY || typeof window === 'undefined') return;

        const renderWidget = () => {
            if (!window.turnstile || !turnstileContainerRef.current || turnstileWidgetIdRef.current) return;
            turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
                sitekey: TURNSTILE_SITE_KEY,
                callback: (token: string) => setTurnstileToken(token),
                'expired-callback': () => setTurnstileToken(''),
                'error-callback': () => setTurnstileToken(''),
            });
        };

        const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]');
        if (existing) {
            renderWidget();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.turnstileScript = 'true';
        script.onload = () => renderWidget();
        document.head.appendChild(script);

        return () => {
            if (window.turnstile && turnstileWidgetIdRef.current && window.turnstile.remove) {
                window.turnstile.remove(turnstileWidgetIdRef.current);
                turnstileWidgetIdRef.current = null;
            }
        };
    }, []);

    const validate = (): string | null => {
        const cleanName = name.trim();
        const cleanEmail = email.trim();
        const cleanMessage = message.trim();
        if (cleanName.length < 2 || cleanName.length > 120) return 'Please enter a valid name (2-120 characters).';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return 'Please enter a valid email address.';
        if (cleanMessage.length < minMessageLength || cleanMessage.length > 5000) {
            return `Message must be ${minMessageLength}-5000 characters.`;
        }
        if (TURNSTILE_SITE_KEY && !turnstileToken) return 'Please complete the anti-spam verification.';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    reason,
                    message: message.trim(),
                    honeypot,
                    turnstileToken,
                    submittedAtMs: formStartedAtMs,
                    locale,
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const detail = typeof data?.detail === 'string' ? data.detail : 'Unable to submit your message.';
                throw new Error(detail);
            }

            setSuccess(tx('contact.success'));
            setName('');
            setEmail('');
            setReason('general');
            setMessage('');
            setHoneypot('');
            setTurnstileToken('');
            if (window.turnstile && turnstileWidgetIdRef.current && window.turnstile.reset) {
                window.turnstile.reset(turnstileWidgetIdRef.current);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to submit your message.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="mt-8 border-slate-200 dark:border-slate-800">
            <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="contact-name" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {tx('contact.name')}
                            </label>
                            <Input
                                id="contact-name"
                                name="name"
                                autoComplete="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                maxLength={120}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="contact-email" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {tx('contact.email')}
                            </label>
                            <Input
                                id="contact-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                maxLength={190}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="contact-reason" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {tx('contact.reason')}
                        </label>
                        <select
                            id="contact-reason"
                            name="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value as ContactReason)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="general">{tx('contact.reason.general')}</option>
                            <option value="technical">{tx('contact.reason.technical')}</option>
                            <option value="privacy">{tx('contact.reason.privacy')}</option>
                            <option value="billing">{tx('contact.reason.billing')}</option>
                            <option value="partnership">{tx('contact.reason.partnership')}</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="contact-message" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {tx('contact.message')}
                        </label>
                        <textarea
                            id="contact-message"
                            name="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            minLength={minMessageLength}
                            maxLength={5000}
                            rows={7}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder={tx('contact.placeholder')}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">{message.trim().length}/5000</p>
                    </div>

                    {/* Honeypot: hidden from real users but catches basic bots */}
                    <div className="hidden" aria-hidden="true">
                        <label htmlFor="contact-company">Company</label>
                        <input
                            id="contact-company"
                            name="company"
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            value={honeypot}
                            onChange={(e) => setHoneypot(e.target.value)}
                        />
                    </div>

                    {TURNSTILE_SITE_KEY && (
                        <div className="pt-1">
                            <div ref={turnstileContainerRef} />
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{success}</span>
                        </div>
                    )}

                    <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto">
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {tx('contact.sending')}
                            </>
                        ) : (
                            tx('contact.send')
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
