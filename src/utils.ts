import { type HydrogenRequest, type HydrogenUseQueryOptions, CacheShort } from "@shopify/hydrogen";
import { getItemFromCache, isStale, setItemInCache, deleteItemFromCache, generateSubRequestCacheControlHeader } from "@shopify/hydrogen/foundation/Cache/cache-sub-request";
import type { QueryKey } from "@shopify/hydrogen/types";
import { getLoggerWithContext } from "@shopify/hydrogen/utilities/log/log";
import { collectQueryCacheControlHeaders } from "@shopify/hydrogen/utilities/log/log-cache-header";

/**
 * Cache third-party requests
 * @see https://github.com/Shopify/hydrogen-v1/blob/main/packages/hydrogen/src/foundation/useQuery/hooks.ts#L99
 */
export function cachedQueryFnBuilder<T>(
  key: QueryKey,
  generateNewOutput: (request: HydrogenRequest) => Promise<T>,
  queryOptions?: HydrogenUseQueryOptions
) {
  const resolvedQueryOptions = {
    ...(queryOptions ?? {}),
  };

  const shouldCacheResponse = queryOptions?.shouldCacheResponse ?? (() => true);

  /**
   * Attempt to read the query from cache. If it doesn't exist or if it's stale, regenerate it.
   */
  async function useCachedQueryFn(request: HydrogenRequest) {
    const log = getLoggerWithContext(request);

    const cacheResponse = await getItemFromCache(key);

    if (cacheResponse) {
      const [output, response] = cacheResponse;

      collectQueryCacheControlHeaders(
        request,
        key,
        response.headers.get('cache-control')
      );

      /**
       * Important: Do this async
       */
      if (isStale(key, response)) {
        const lockKey = ['lock', ...(typeof key === 'string' ? [key] : key)];

        // Run revalidation asynchronously
        const revalidatingPromise = getItemFromCache(lockKey).then(
          async (lockExists) => {
            if (lockExists) return;

            await setItemInCache(
              lockKey,
              true,
              CacheShort({
                maxAge: 10,
              })
            );

            try {
              const output = await generateNewOutput(request);

              if (shouldCacheResponse(output)) {
                await setItemInCache(key, output, resolvedQueryOptions?.cache);
              }
            } catch (e: any) {
              log.error(`Error generating async response: ${e.message}`);
            } finally {
              await deleteItemFromCache(lockKey);
            }
          }
        );

        // Asynchronously wait for it in workers
        request.ctx.runtime?.waitUntil?.(revalidatingPromise);
      }

      return output;
    }

    const newOutput = await generateNewOutput(request);

    /**
     * Important: Do this async
     */
    if (shouldCacheResponse(newOutput)) {
      const setItemInCachePromise = setItemInCache(
        key,
        newOutput,
        resolvedQueryOptions?.cache
      );

      request.ctx.runtime?.waitUntil?.(setItemInCachePromise);
    }

    collectQueryCacheControlHeaders(
      request,
      key,
      generateSubRequestCacheControlHeader(resolvedQueryOptions?.cache)
    );

    return newOutput;
  }

  return useCachedQueryFn;
}