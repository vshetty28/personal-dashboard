import {
  Card as ShadcnCard,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ShadcnCard>
      <CardHeader>
        <CardTitle className="text-xs tracking-wide text-muted-foreground uppercase">
          {title}
        </CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </ShadcnCard>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function ConnectLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="text-sm text-primary underline underline-offset-4">
      {label}
    </a>
  );
}
