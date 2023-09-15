import { HydrogenRequest, CacheLong, CacheShort, generateCacheControlHeader } from "@shopify/hydrogen";
import groq from "groq";

import { cachedQueryFnBuilder } from "../../utils";
import { sanityClient } from "../../../sanityClient";

const QUERY = groq`null`

const fetchNull = cachedQueryFnBuilder<null>(
  [QUERY],
  (request) => sanityClient.fetch(QUERY, undefined, { signal: request.signal }),
  { cache: CacheLong() })

export async function api(request: HydrogenRequest) {
  if (request.method !== 'GET') {
    return new Response('405', { headers: { Allow: 'GET' } });
  }

  const result = await fetchNull(request)

  return Response.json(result, {
    headers: {
      "Cache-Control": generateCacheControlHeader(CacheShort())
    }
  })
}
