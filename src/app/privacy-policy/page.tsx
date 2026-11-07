import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Brief",
  description: "How Brief handles personal information, Google Calendar access, and connected services.",
};

const sections = [
  {
    title: "About Brief",
    text: "Brief is a private personal dashboard operated by Vihaan Shetty. It brings together daily briefings, calendar events, tasks, and reading suggestions for personal use. This policy applies to information processed by the dashboard; connected services have their own privacy policies.",
  },
  {
    title: "Information we access and use",
    text: "When you connect Google Calendar, Brief requests read-only calendar access to retrieve events from configured calendars and show your schedule. Event information can include titles, start and end times, calendar names, and event links. Brief does not create, change, or delete Google Calendar events. Calendar API responses are used to render your schedule and are not saved as calendar records in the dashboard database.",
  },
  {
    title: "Other connected information",
    text: "If you connect TickTick, Brief reads projects and tasks to show your task list. It creates or completes tasks only when you use those controls. Authorized personal automations can send the dashboard daily news, email attention summaries, promotions, and reading suggestions. These summaries may contain sender names, subjects, deadlines, links, and other personal details included by the automation. Brief stores these briefings and your read, dismissed, or handled selections.",
  },
  {
    title: "Credentials and cookies",
    text: "Brief stores OAuth access tokens and, when provided, refresh tokens in its server-side database so connected services can stay available without repeated sign-in. Tokens are used to access the services you authorize. A necessary session cookie keeps you signed in to the dashboard for up to 30 days. The dashboard does not include advertising or analytics tracking scripts.",
  },
  {
    title: "Sharing and external services",
    text: "Brief does not sell personal information or use Google Calendar data for advertising or training general-purpose AI models. Hosting and database providers process information as needed to operate the dashboard. Connected providers receive requests needed to perform the features you use. External links open services governed by their own policies. AI app buttons send the selected news story’s headline, source link, summary, and relevance text in a prefilled prompt to the app you choose; they do not include your calendar, tasks, or email summaries. App icons are loaded through Google’s favicon service, which receives the network information normally sent with a browser request.",
  },
  {
    title: "Retention and security",
    text: "The dashboard is configured to run a daily cleanup of briefings and item selections outside its approximately 30-day history window; weekend records may be retained slightly longer to cover the full weekend. OAuth credentials remain stored until removed by the operator, even if access is revoked at the provider. Hosting logs and backups may follow separate provider retention schedules. Dashboard access requires authentication, and integration credentials stay on the server. Operational errors may be recorded in server logs to diagnose problems.",
  },
  {
    title: "Your choices and deletion",
    text: "You can stop Google Calendar access at any time through your Google Account’s third-party connections settings. You can also revoke TickTick access through that provider’s account settings. Revoking access stops future authorized API access but does not automatically delete stored credentials or existing briefing summaries. To request removal of stored credentials, briefings, or other dashboard information, contact the operator. Deletion from the dashboard does not delete the original data in Google Calendar, TickTick, or other source services.",
  },
  {
    title: "Contact and changes",
    text: "For privacy questions or deletion requests, contact Vihaan Shetty directly through the communication channel used to arrange access to this private dashboard. Updates to this policy will be published on this page with a revised date.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 md:px-10 md:py-16">
      <Link href="/" className="text-sm font-semibold text-dim underline-offset-4 hover:text-fg hover:underline">Brief</Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight md:text-4xl">Privacy policy</h1>
      <p className="mt-3 text-sm text-dim">Last updated November 3, 2026</p>
      <div className="mt-8 space-y-7">
        {sections.map(({ title, text }) => (
          <section key={title}>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-[15px] leading-7 text-fg-2">{text}</p>
          </section>
        ))}
      </div>
      <p className="mt-8 border-t border-line pt-6 text-sm text-dim">
        Manage Google access in your{" "}
        <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer" className="text-fg-2 underline underline-offset-4">Google Account connections</a>.
      </p>
    </main>
  );
}
