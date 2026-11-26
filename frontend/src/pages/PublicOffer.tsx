import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import OfferDocument from "../components/OfferDocument";
import { useSeoOverride } from "../components/SeoManager";
import type { OfferDraft } from "../lib/offers";
import { supabase } from "../lib/supabase";

type PublishedOffer = Pick<OfferDraft, "title" | "client_name" | "language" | "summary" | "sections">;

export default function PublicOffer() {
  const { offerSlug } = useParams();
  const query = useQuery({
    queryKey: ["public-offer", offerSlug],
    queryFn: async () => {
      if (!supabase) throw new Error("Offer service is unavailable.");
      const { data, error } = await supabase.rpc("awexen_get_published_offer", { p_slug: offerSlug })
        .maybeSingle<PublishedOffer>();
      if (error) throw error;
      return data;
    },
    retry: false,
    gcTime: 0,
  });
  useSeoOverride(query.data ? `${query.data.title} | AWEXEN` : undefined);

  if (query.isPending) return <p className="p-8 text-center" role="status">Loading offer…</p>;
  if (query.isError) return (
    <div className="p-8 text-center">
      <p role="alert">Unable to load this offer.</p>
      <button type="button" className="mt-3 underline" onClick={() => void query.refetch()}>Try again</button>
    </div>
  );
  if (!query.data) return (
    <div className="p-8 text-center">
      <h1 className="text-xl font-semibold">Offer unavailable</h1>
      <Link className="mt-3 inline-block underline" to="/">Back to AWEXEN</Link>
    </div>
  );
  return <OfferDocument offer={query.data} printable />;
}
