import { createClient } from "@sanity/client";
import { getOxygenVariable } from "@shopify/hydrogen/utilities/storefrontApi";

export const sanityClient = createClient({
  projectId: getOxygenVariable('SANITY_PROJECT_ID'),
  dataset: getOxygenVariable('SANITY_DATASET') || 'production',
  apiVersion: getOxygenVariable('SANITY_API_VERSION') || '2023-08-01',
  token: getOxygenVariable('SANITY_API_TOKEN'),
  useCdn: true
})