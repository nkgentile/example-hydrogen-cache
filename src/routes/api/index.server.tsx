import { HydrogenRequest, CacheLong, CacheShort, generateCacheControlHeader } from "@shopify/hydrogen";
import groq from "groq";

import { cachedQueryFnBuilder } from "../../utils";
import { sanityClient } from "../../../sanityClient";

// GROQ query to send to Sanity API
const QUERY = groq`null`

// Wrap asynchronous call to provide caching options
const fetchNull = cachedQueryFnBuilder<null>(
  [QUERY],
  // Third-party API call, passing request signal to handle cancellation
  (request) => sanityClient.fetch(QUERY, undefined, { signal: request.signal }),
  // Provide a caching strategy, defaults to `CacheLong`
  { cache: CacheLong() })

export async function api(request: HydrogenRequest) {
  if (request.method !== 'GET') {
    return new Response('405', { headers: { Allow: 'GET' } });
  }

  // Will handle caching, just needs the request as input
  const result = await fetchNull(request)

  return Response.json(result, {
    headers: {
      // Send response back to client with caching strategy
      "Cache-Control": generateCacheControlHeader(CacheShort())
    }
  })
}
