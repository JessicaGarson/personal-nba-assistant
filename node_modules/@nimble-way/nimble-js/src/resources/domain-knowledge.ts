// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../core/resource';
import { APIPromise } from '../core/api-promise';
import { RequestOptions } from '../internal/request-options';

export class DomainKnowledge extends APIResource {
  /**
   * Resolves the suggested driver for a given URL or agent name. Exactly one of
   * `url` or `agent` must be provided.
   */
  getDriver(
    query: DomainKnowledgeGetDriverParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<DomainKnowledgeGetDriverResponse> {
    return this._client.get('/v1/domain-knowledge/driver', { query, ...options });
  }
}

export interface DomainKnowledgeGetDriverResponse {
  /**
   * List of detected antibots for the domain
   */
  antibots: Array<string>;

  /**
   * Description of the driver
   */
  description: string;

  /**
   * Resolved driver name
   */
  driver: string;

  /**
   * The input agent name (present when agent query param was used)
   */
  agent?: string;

  /**
   * Whether the page needs to be rendered to be properly resolved.
   */
  need_to_render?: boolean;

  /**
   * The input URL (present when url query param was used)
   */
  url?: string;
}

export interface DomainKnowledgeGetDriverParams {
  /**
   * Agent name to resolve driver for (e.g. nimble-ecommerce).
   */
  agent?: string;

  /**
   * Target domain to resolve driver for (e.g. amazon.com).
   */
  url?: string;
}

export declare namespace DomainKnowledge {
  export {
    type DomainKnowledgeGetDriverResponse as DomainKnowledgeGetDriverResponse,
    type DomainKnowledgeGetDriverParams as DomainKnowledgeGetDriverParams,
  };
}
