import type { JSX } from 'react';
import type { Metadata } from 'next';
import { SharedLookView } from './SharedLookView';

interface SharedLookPageProps {
  params: Promise<{ token: string }>;
}

function getApiBaseUrl(): string {
  return (process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:8000').replace(/\/$/, '');
}

export async function generateMetadata({
  params,
}: SharedLookPageProps): Promise<Metadata> {
  const { token } = await params;
  const imageUrl = `${getApiBaseUrl()}/api/v1/vton/shared/${encodeURIComponent(token)}`;
  const title = 'Look compartido';
  const description =
    'Un look generado con StyleMe: combina tu armario y pruébatelo sobre tu propia foto.';

  return {
    title,
    description,
    // Los looks son personales: no deben indexarse en buscadores.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 768,
          height: 1024,
          alt: 'Look generado con StyleMe',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SharedLookPage({
  params,
}: SharedLookPageProps): Promise<JSX.Element> {
  const { token } = await params;
  return <SharedLookView token={token} />;
}
