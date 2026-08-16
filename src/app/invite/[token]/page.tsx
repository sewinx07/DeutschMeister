import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/server/auth-helpers';
import { acceptInvitation } from '@/lib/server/actions/orgs';

export const metadata: Metadata = {
  title: 'Join an organization',
  description: 'Accept your Lernio organization invitation.',
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const result = await acceptInvitation(token);

  if (result.ok) {
    redirect('/account');
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation unavailable</CardTitle>
          <CardDescription>We could not accept this invitation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{result.error.message}</p>
          <Button asChild className="w-full">
            <Link href="/account">Go to account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
