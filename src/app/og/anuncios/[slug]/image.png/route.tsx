import { ImageResponse } from "next/og";
import { formatCurrencyBRL } from "@/lib/formatters";
import { findListingBySlug } from "@/lib/listing-records";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const listing = await findListingBySlug(params.slug).catch(() => null);
  const title = listing?.title ?? "Achei X Classificados";
  const price = listing ? formatCurrencyBRL(listing.priceCents) : "Anuncios modernos";
  const location = listing ? `${listing.city}, ${listing.state}` : "Veiculos e Imoveis";
  const photoUrl = listing?.photos[0]?.url;

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "1200px",
          height: "630px",
          overflow: "hidden",
          background: "#080808",
          color: "white",
          fontFamily: "Arial, sans-serif"
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "1200px",
              height: "630px",
              objectFit: "cover"
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, rgba(0,0,0,0.88), rgba(0,0,0,0.42) 48%, rgba(0,0,0,0.08))"
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 58,
            top: 48,
            display: "flex",
            alignItems: "center",
            gap: 16
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 92,
              height: 92,
              borderRadius: 24,
              background: "#FFD600",
              color: "#050505",
              fontSize: 54,
              fontWeight: 900
            }}
          >
            X
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1 }}>Achei X</div>
            <div style={{ marginTop: 6, fontSize: 24, color: "#22C55E", fontWeight: 800 }}>Classificados</div>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 58,
            bottom: 56,
            display: "flex",
            flexDirection: "column",
            maxWidth: 760
          }}
        >
          <div style={{ color: "#FFD600", fontSize: 48, fontWeight: 900 }}>{price}</div>
          <div style={{ marginTop: 14, fontSize: 68, lineHeight: 1.04, fontWeight: 900 }}>{compactText(title, 58)}</div>
          <div style={{ marginTop: 18, fontSize: 30, color: "rgba(255,255,255,0.86)", fontWeight: 700 }}>{location}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=86400"
      }
    }
  );
}

function compactText(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
}
