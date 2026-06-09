import { NextResponse } from "next/server";
import { getPublicAppBaseUrl } from "@/lib/app-url";
import { findListingBySlug } from "@/lib/listing-records";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const listing = await findListingBySlug(params.slug).catch(() => null);
  const photoUrl = listing?.photos[0]?.url;

  if (!photoUrl) {
    return NextResponse.redirect(`${getPublicAppBaseUrl(request)}/achei-x-logo.png`, 302);
  }

  const upstream = await fetch(photoUrl, {
    headers: { accept: "image/avif,image/webp,image/jpeg,image/png,image/*,*/*" },
    cache: "force-cache"
  }).catch(() => null);

  if (!upstream?.ok || !upstream.body) {
    return NextResponse.redirect(`${getPublicAppBaseUrl(request)}/achei-x-logo.png`, 302);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") || "image/jpeg",
      "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800"
    }
  });
}
