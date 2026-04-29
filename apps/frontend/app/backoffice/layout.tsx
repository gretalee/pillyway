import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { redirect } from 'next/navigation';

export default async function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getRoles } = getKindeServerSession();
  const roles = await getRoles();

  const isOwner = roles?.some((role) => role.key === 'owner') ?? false;

  if (!isOwner) {
    redirect('/');
  }

  return <>{children}</>;
}
