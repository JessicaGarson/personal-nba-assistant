// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../core/resource';
import { APIPromise } from '../core/api-promise';
import { RequestOptions } from '../internal/request-options';
import { path } from '../internal/utils/path';

export class Agent extends APIResource {
  /**
   * List Agent Templates
   *
   * @example
   * ```ts
   * const agents = await client.agent.list();
   * ```
   */
  list(
    query: AgentListParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<AgentListResponse> {
    return this._client.get('/v1/agents', { query, ...options });
  }

  /**
   * Create Agent Generation
   *
   * @example
   * ```ts
   * const response = await client.agent.generate({
   *   prompt: 'prompt',
   *   url: 'url',
   * });
   * ```
   */
  generate(body: AgentGenerateParams, options?: RequestOptions): APIPromise<AgentGenerateResponse> {
    return this._client.post('/v1/agents/generations', { body, ...options });
  }

  /**
   * Get Agent Template
   *
   * @example
   * ```ts
   * const agent = await client.agent.get('template_name');
   * ```
   */
  get(templateName: string, options?: RequestOptions): APIPromise<AgentGetResponse> {
    return this._client.get(path`/v1/agents/${templateName}`, options);
  }

  /**
   * Get Agent Generation
   *
   * @example
   * ```ts
   * const response = await client.agent.getGeneration(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  getGeneration(generationID: string, options?: RequestOptions): APIPromise<AgentGetGenerationResponse> {
    return this._client.get(path`/v1/agents/generations/${generationID}`, options);
  }

  /**
   * Publish Agent Version
   *
   * @deprecated
   */
  publish(
    agentName: string,
    body: AgentPublishParams,
    options?: RequestOptions,
  ): APIPromise<AgentPublishResponse> {
    return this._client.post(path`/v1/agents/${agentName}/publish`, { body, ...options });
  }

  /**
   * Execute WSA Realtime Endpoint
   *
   * @example
   * ```ts
   * const response = await client.agent.run({
   *   agent: 'agent',
   *   params: { foo: 'bar' },
   * });
   * ```
   */
  run(body: AgentRunParams, options?: RequestOptions): APIPromise<AgentRunResponse> {
    return this._client.post('/v1/agents/run', { body, ...options });
  }

  /**
   * Execute WSA Async Endpoint
   *
   * @example
   * ```ts
   * const response = await client.agent.runAsync({
   *   agent: 'agent',
   *   params: { foo: 'bar' },
   * });
   * ```
   */
  runAsync(body: AgentRunAsyncParams, options?: RequestOptions): APIPromise<AgentRunAsyncResponse> {
    return this._client.post('/v1/agents/async', { body, ...options });
  }

  /**
   * Execute WSA Batch Endpoint
   *
   * @example
   * ```ts
   * const response = await client.agent.runBatch({
   *   inputs: [{}],
   *   shared_inputs: { agent: 'agent' },
   * });
   * ```
   */
  runBatch(body: AgentRunBatchParams, options?: RequestOptions): APIPromise<AgentRunBatchResponse> {
    return this._client.post('/v1/agents/batch', { body, ...options });
  }
}

export type AgentListResponse = Array<AgentListResponse.AgentListResponseItem>;

export namespace AgentListResponse {
  export interface AgentListResponseItem {
    display_name: string;

    is_public: boolean;

    name: string;

    description?: string | null;

    domain?: string | null;

    entity_type?: string | null;

    managed_by?: string | null;

    vertical?: string | null;
  }
}

export interface AgentGenerateResponse {
  id: string;

  status: string;

  agent_name?: string | null;

  completed_at?: string | null;

  created_at?: string | null;

  error?: string | null;

  generated_version?: AgentGenerateResponse.GeneratedVersion | null;

  generated_version_id?: string | null;

  source_version_id?: string | null;

  started_at?: string | null;

  summary?: string | null;
}

export namespace AgentGenerateResponse {
  export interface GeneratedVersion {
    id: string;

    agent_name: string;

    created_at: string;

    input_schema: unknown;

    metadata: GeneratedVersion.Metadata;

    output_schema: unknown;

    steps: Array<unknown>;

    version_number: number;

    output_sample_data?: unknown;
  }

  export namespace GeneratedVersion {
    export interface Metadata {
      data_source?: string | null;

      description?: string | null;

      display_name?: string | null;

      domain?: string | null;

      entity_type?: string | null;

      tags?: Array<string>;

      vertical?: string | null;
    }
  }
}

export interface AgentGetResponse {
  display_name: string;

  is_public: boolean;

  name: string;

  description?: string | null;

  domain?: string | null;

  entity_type?: string | null;

  feature_flags?: AgentGetResponse.FeatureFlags;

  input_properties?: Array<AgentGetResponse.InputProperty> | null;

  managed_by?: string | null;

  output_schema?: unknown | null;

  vertical?: string | null;
}

export namespace AgentGetResponse {
  export interface FeatureFlags {
    is_localization_supported?: boolean;

    is_pagination_supported?: boolean;
  }

  export interface InputProperty {
    default?: string | boolean | number | null;

    description?: string | null;

    examples?: Array<unknown> | null;

    is_localization_param?: boolean;

    is_pagination_param?: boolean;

    name?: string;

    required?: boolean;

    rules?: Array<string> | null;

    type?: string;
  }
}

export interface AgentGetGenerationResponse {
  id: string;

  status: string;

  agent_name?: string | null;

  completed_at?: string | null;

  created_at?: string | null;

  error?: string | null;

  generated_version?: AgentGetGenerationResponse.GeneratedVersion | null;

  generated_version_id?: string | null;

  source_version_id?: string | null;

  started_at?: string | null;

  summary?: string | null;
}

export namespace AgentGetGenerationResponse {
  export interface GeneratedVersion {
    id: string;

    agent_name: string;

    created_at: string;

    input_schema: unknown;

    metadata: GeneratedVersion.Metadata;

    output_schema: unknown;

    steps: Array<unknown>;

    version_number: number;

    output_sample_data?: unknown;
  }

  export namespace GeneratedVersion {
    export interface Metadata {
      data_source?: string | null;

      description?: string | null;

      display_name?: string | null;

      domain?: string | null;

      entity_type?: string | null;

      tags?: Array<string>;

      vertical?: string | null;
    }
  }
}

export interface AgentPublishResponse {
  agent_name: string;

  published_version_id: string;
}

export interface AgentRunResponse {
  data: AgentRunResponse.Data;

  metadata: AgentRunResponse.Metadata;

  /**
   * The status of the task.
   */
  status: 'success' | 'skipped' | 'fatal' | 'error' | 'postponed' | 'ignored' | 'rejected' | 'blocked';

  /**
   * Unique identifier for the task.
   */
  task_id: string;

  /**
   * The final URL.
   */
  url: string;

  debug?: AgentRunResponse.Debug;

  /**
   * Pagination information if applicable.
   */
  pagination?: AgentRunResponse.NextPageParams | Array<AgentRunResponse.UnionMember1>;

  /**
   * The HTTP status code of the task.
   */
  status_code?: number;

  /**
   * List of warnings generated during the task.
   */
  warnings?: Array<string>;
}

export namespace AgentRunResponse {
  export interface Data {
    /**
     * Browser actions execution results. Present only when browser_actions were
     * specified in the request.
     */
    browser_actions?: Data.BrowserActions;

    /**
     * The cookies collected from browser actions during the task.
     */
    cookies?: Array<unknown>;

    /**
     * The evaluation results from browser actions during the task.
     */
    eval?: Array<unknown>;

    /**
     * The http requests from browser actions made during the task.
     */
    fetch?: Array<unknown>;

    /**
     * The headers received during the task.
     */
    headers?: { [key: string]: string };

    /**
     * The HTML content of the page.
     */
    html?: string;

    /**
     * List of all unique URLs found on the page.
     */
    links?: Array<string>;

    /**
     * The Markdown version of the HTML content.
     */
    markdown?: string;

    /**
     * The network capture data collected during the task.
     */
    network_capture?: Array<Data.NetworkCapture>;

    /**
     * Individual HTML content of each pagination page, before merging.
     */
    pages_html?: Array<string>;

    /**
     * The parsing results extracted from the HTML & network content.
     */
    parsing?: Data.ParsingSuccessResult | Data.ParsingErrorResult | { [key: string]: unknown };

    /**
     * The list of redirects that occurred during the task.
     */
    redirects?: Array<Data.Redirect>;

    /**
     * Screenshots taken during the task, from browser actions, or the screenshot
     * format.
     */
    screenshots?: Array<unknown>;
  }

  export namespace Data {
    /**
     * Browser actions execution results. Present only when browser_actions were
     * specified in the request.
     */
    export interface BrowserActions {
      results: Array<BrowserActions.Result>;

      success: boolean;

      total_duration: number;
    }

    export namespace BrowserActions {
      export interface Result {
        duration: number;

        name:
          | 'goto'
          | 'wait'
          | 'wait_for_element'
          | 'wait_for_navigation'
          | 'click'
          | 'fill'
          | 'press'
          | 'scroll'
          | 'auto_scroll'
          | 'screenshot'
          | 'get_cookies'
          | 'eval'
          | 'fetch';

        status: 'no-run' | 'in-progress' | 'done' | 'error' | 'skipped';

        error?: string;

        result?: unknown;
      }
    }

    export interface NetworkCapture {
      filter: NetworkCapture.Filter;

      results: Array<NetworkCapture.Result>;

      errorMessage?: string;
    }

    export namespace NetworkCapture {
      export interface Filter {
        validation: boolean;

        wait_for_requests_count: number;

        method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';

        /**
         * Resource type for network capture filtering
         */
        resource_type?:
          | 'document'
          | 'stylesheet'
          | 'image'
          | 'media'
          | 'font'
          | 'script'
          | 'texttrack'
          | 'xhr'
          | 'fetch'
          | 'prefetch'
          | 'eventsource'
          | 'websocket'
          | 'manifest'
          | 'signedexchange'
          | 'ping'
          | 'cspviolationreport'
          | 'preflight'
          | 'other'
          | 'fedcm'
          | Array<
              | 'document'
              | 'stylesheet'
              | 'image'
              | 'media'
              | 'font'
              | 'script'
              | 'texttrack'
              | 'xhr'
              | 'fetch'
              | 'prefetch'
              | 'eventsource'
              | 'websocket'
              | 'manifest'
              | 'signedexchange'
              | 'ping'
              | 'cspviolationreport'
              | 'preflight'
              | 'other'
              | 'fedcm'
            >;

        status_code?: number | Array<number>;

        url?: Filter.URL;

        wait_for_requests_count_timeout?: number;
      }

      export namespace Filter {
        export interface URL {
          type: 'exact' | 'contains';

          value: string;
        }
      }

      export interface Result {
        request: Result.Request;

        response: Result.Response;
      }

      export namespace Result {
        export interface Request {
          headers: { [key: string]: string };

          method: string;

          /**
           * Resource type for network capture filtering
           */
          resource_type:
            | 'document'
            | 'stylesheet'
            | 'image'
            | 'media'
            | 'font'
            | 'script'
            | 'texttrack'
            | 'xhr'
            | 'fetch'
            | 'prefetch'
            | 'eventsource'
            | 'websocket'
            | 'manifest'
            | 'signedexchange'
            | 'ping'
            | 'cspviolationreport'
            | 'preflight'
            | 'other'
            | 'fedcm';

          url: string;

          body?: string;
        }

        export interface Response {
          body: string;

          headers: { [key: string]: string };

          serialization: 'none' | 'base64';

          status: number;

          status_text: string;
        }
      }
    }

    export interface ParsingSuccessResult {
      entities: { [key: string]: unknown };

      status: 'success';
    }

    export interface ParsingErrorResult {
      error: string;

      status: 'error';
    }

    export interface Redirect {
      status_code: number;

      url: string;
    }
  }

  export interface Metadata {
    /**
     * The name of the agent used for the query.
     */
    agent?: string;

    /**
     * The driver used for the task.
     */
    driver?: string;

    /**
     * The localization identifier for the query.
     */
    localization_id?: string;

    /**
     * The duration in milliseconds of the query processing.
     */
    query_duration?: number;

    /**
     * The time when the query was received.
     */
    query_time?: string;

    /**
     * Additional response parameters.
     */
    response_parameters?: unknown;

    /**
     * A tag associated with the query.
     */
    tag?: string;
  }

  export interface Debug {
    /**
     * Performance metrics collected during the task.
     */
    performance_metrics?: { [key: string]: number };

    /**
     * Total bytes used by the proxy during the task.
     */
    proxy_total_bytes_usage?: number;

    /**
     * The transformed output after applying any transformations.
     */
    transformed_output?: unknown;

    /**
     * The userbrowser instance using during the task.
     */
    userbrowser?: unknown;
  }

  export interface NextPageParams {
    next_page_params: { [key: string]: unknown };
  }

  export interface UnionMember1 {
    next_page_params: { [key: string]: unknown };
  }
}

export interface AgentRunAsyncResponse {
  status: 'success';

  task: { [key: string]: unknown };
}

/**
 * Response when a batch of extract tasks is created successfully.
 */
export interface AgentRunBatchResponse {
  /**
   * Unique identifier for the batch.
   */
  batch_id: string;

  /**
   * Number of tasks in the batch.
   */
  batch_size: number;

  /**
   * List of created tasks.
   */
  tasks: Array<AgentRunBatchResponse.Task>;
}

export namespace AgentRunBatchResponse {
  export interface Task {
    /**
     * Unique task identifier.
     */
    id: string;

    _query: unknown;

    /**
     * Timestamp when the task was created.
     */
    created_at: string;

    /**
     * Original input data for the task.
     */
    input: unknown;

    /**
     * Current state of the task.
     */
    state: 'pending' | 'success' | 'error';

    /**
     * URL for checking the task status.
     */
    status_url: string;

    /**
     * Account name that owns the task.
     */
    account_name?: string;

    api_type?: 'web' | 'serp' | 'ecommerce' | 'social' | 'media' | 'agent' | 'extract';

    /**
     * Batch ID if this task is part of a batch.
     */
    batch_id?: string;

    /**
     * URL for downloading the task results.
     */
    download_url?: string;

    /**
     * Error message if the task failed.
     */
    error?: string;

    /**
     * Classification of the error type.
     */
    error_type?: string;

    /**
     * Timestamp when the task was last modified.
     */
    modified_at?: string;

    /**
     * Storage location of the output data.
     */
    output_url?: string;

    /**
     * HTTP status code from the task execution.
     */
    status_code?: number;
  }
}

export interface AgentListParams {
  /**
   * Number of results per page
   */
  limit?: number;

  /**
   * Filter templates by attribution
   */
  managed_by?: 'nimble' | 'community' | 'self_managed' | null;

  /**
   * Pagination offset
   */
  offset?: number;

  /**
   * Filter by privacy level
   */
  privacy?: 'public' | 'private' | 'all' | null;

  /**
   * Search templates by name, domain, or vertical
   */
  search?: string | null;
}

export type AgentGenerateParams =
  | AgentGenerateParams.CreateAgentGenerationRequest
  | AgentGenerateParams.CreateAgentRefinementRequest;

export declare namespace AgentGenerateParams {
  export interface CreateAgentGenerationRequest {
    prompt: string;

    url: string;

    agent_name?: string | null;

    input_schema?: unknown;

    metadata?: CreateAgentGenerationRequest.Metadata | null;

    output_schema?: unknown;
  }

  export namespace CreateAgentGenerationRequest {
    export interface Metadata {
      description?: string | null;

      display_name?: string | null;

      tags?: Array<string>;
    }
  }

  export interface CreateAgentRefinementRequest {
    from_agent: string;

    prompt: string;
  }
}

export interface AgentPublishParams {
  version_id: string;
}

export interface AgentRunParams {
  agent: string;

  params: { [key: string]: unknown };

  /**
   * Response formats to include. All disabled by default.
   */
  formats?: Array<'html' | 'markdown' | 'screenshot' | 'headers' | 'links'>;

  localization?: boolean;
}

export interface AgentRunAsyncParams {
  agent: string;

  params: { [key: string]: unknown };

  /**
   * URL to call back when async operation completes
   */
  callback_url?: string;

  /**
   * Response formats to include. All disabled by default.
   */
  formats?: Array<'html' | 'markdown' | 'screenshot' | 'headers' | 'links'>;

  localization?: boolean;

  /**
   * Whether to compress stored data
   */
  storage_compress?: boolean;

  /**
   * Custom name for the stored object
   */
  storage_object_name?: string;

  /**
   * Type of storage to use for results
   */
  storage_type?: string;

  /**
   * URL for storage location
   */
  storage_url?: string;
}

export interface AgentRunBatchParams {
  inputs: Array<AgentRunBatchParams.Input>;

  shared_inputs: AgentRunBatchParams.SharedInputs;
}

export namespace AgentRunBatchParams {
  export interface Input {
    /**
     * Response formats to include. All disabled by default.
     */
    formats?: Array<'html' | 'markdown' | 'screenshot' | 'headers' | 'links'>;

    localization?: boolean;

    params?: { [key: string]: unknown };
  }

  export interface SharedInputs {
    agent: string;

    /**
     * Response formats to include. All disabled by default.
     */
    formats?: Array<'html' | 'markdown' | 'screenshot' | 'headers' | 'links'>;

    localization?: boolean;

    params?: { [key: string]: unknown };
  }
}

export declare namespace Agent {
  export {
    type AgentListResponse as AgentListResponse,
    type AgentGenerateResponse as AgentGenerateResponse,
    type AgentGetResponse as AgentGetResponse,
    type AgentGetGenerationResponse as AgentGetGenerationResponse,
    type AgentPublishResponse as AgentPublishResponse,
    type AgentRunResponse as AgentRunResponse,
    type AgentRunAsyncResponse as AgentRunAsyncResponse,
    type AgentRunBatchResponse as AgentRunBatchResponse,
    type AgentListParams as AgentListParams,
    type AgentGenerateParams as AgentGenerateParams,
    type AgentPublishParams as AgentPublishParams,
    type AgentRunParams as AgentRunParams,
    type AgentRunAsyncParams as AgentRunAsyncParams,
    type AgentRunBatchParams as AgentRunBatchParams,
  };
}
